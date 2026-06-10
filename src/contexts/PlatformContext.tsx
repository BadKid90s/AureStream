// Platform context — manages selected platform, auth state, and subscription sync.
// Supports OAuth device flow (user enters code in browser) and authorization code flow.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type {
  DeviceAuthorization,
  PlatformCredential,
  SubscriptionPlatform,
} from "@/types/platform"
import { getAllPlatforms } from "@/platforms/platform-registry"
import {
  loadCredential,
  saveCredential,
  deleteCredential,
} from "@/action/platform-auth"
import { listen } from "@tauri-apps/api/event"
import { invoke } from "@tauri-apps/api/core"

interface DeviceLoginState {
  device: DeviceAuthorization
  platformId: string
  status: "pending" | "completed" | "expired" | "error"
  error?: string
}

interface PlatformState {
  platformId: string
  loggedIn: boolean
  credential: PlatformCredential | null
  loading: boolean
  syncing: boolean
  error: string | null
  subscriptionCount: number
}

interface PlatformContextValue {
  platforms: SubscriptionPlatform[]
  selectedId: string
  state: PlatformState
  selectPlatform: (id: string) => void
  startLogin: (id: string) => Promise<void>
  handleOAuthCallback: (url: string) => Promise<void>
  logout: (id: string) => Promise<void>
  syncSubscriptions: (id: string) => Promise<void>
  oauthPending: boolean
  deviceLogin: DeviceLoginState | null
  cancelDeviceLogin: () => void
}

const PlatformContext = createContext<PlatformContextValue | null>(null)

const EMPTY_STATE: PlatformState = {
  platformId: "manual",
  loggedIn: false,
  credential: null,
  loading: true,
  syncing: false,
  error: null,
  subscriptionCount: 0,
}

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const platforms = useMemo(() => getAllPlatforms(), [])
  const [selectedId, setSelectedId] = useState("manual")
  const [state, setState] = useState<PlatformState>(EMPTY_STATE)
  const [oauthPending, setOAuthPending] = useState(false)
  const [deviceLogin, setDeviceLogin] = useState<DeviceLoginState | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Restore saved credential when switching platforms
  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))

    loadCredential(selectedId)
      .then((cred) => {
        if (cancelled) return
        setState((s) => ({
          ...s,
          platformId: selectedId,
          loggedIn: cred != null,
          credential: cred ?? null,
          loading: false,
        }))
      })
      .catch((err) => {
        if (cancelled) return
        setState((s) => ({ ...s, loading: false, error: String(err) }))
      })

    return () => { cancelled = true }
  }, [selectedId])

  // Listen for OAuth deep link callback (authorization code flow only)
  useEffect(() => {
    const unlisten = listen("deep_link_oauth", async () => {
      setOAuthPending(true)
      try {
        const callback = await invoke<{ url: string } | null>("get_pending_oauth")
        if (callback?.url) {
          await handleOAuthCallbackInternal(callback.url)
        }
      } finally {
        setOAuthPending(false)
      }
    })
    return () => { unlisten.then((fn) => fn()) }
  }, [selectedId])

  const finishAuth = useCallback(
    async (platform: SubscriptionPlatform, cred: PlatformCredential) => {
      await saveCredential(platform.id, cred)
      setState((s) => ({
        ...s,
        platformId: platform.id,
        loggedIn: true,
        credential: cred,
        loading: false,
        error: null,
      }))
      // Auto-sync subscriptions after login
      await syncSubscriptionsInternal(platform, cred)
    },
    []
  )

  const handleOAuthCallbackInternal = useCallback(
    async (url: string) => {
      const platform = platforms.find((p) => p.id === selectedId)
      if (!platform?.handleAuthCallback) throw new Error("OAuth not supported")
      setState((s) => ({ ...s, loading: true }))
      try {
        const cred = await platform.handleAuthCallback(url)
        await finishAuth(platform, cred)
      } catch (err) {
        setState((s) => ({ ...s, loading: false, error: String(err) }))
      }
    },
    [selectedId, platforms, finishAuth]
  )

  const syncSubscriptionsInternal = useCallback(
    async (platform: SubscriptionPlatform, cred: PlatformCredential) => {
      setState((s) => ({ ...s, syncing: true, error: null }))
      try {
        const subs = await platform.fetchSubscriptions(cred)
        const { insertSubscription } = await import("@/action/db")
        let count = 0
        for (const sub of subs) {
          const id = await insertSubscription(sub.subscriptionUrl, sub.name)
          if (id) count++
        }
        setState((s) => ({ ...s, syncing: false, subscriptionCount: count }))
      } catch (err) {
        setState((s) => ({ ...s, syncing: false, error: String(err) }))
      }
    },
    []
  )

  const selectPlatform = useCallback((id: string) => {
    setSelectedId(id)
    cancelDeviceLogin()
  }, [])

  const cancelDeviceLogin = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    setDeviceLogin(null)
  }, [])

  // Device flow: request code + poll for completion
  const startLogin = useCallback(
    async (id: string) => {
      const platform = platforms.find((p) => p.id === id)
      if (!platform) throw new Error(`Unknown platform: ${id}`)

      if (platform.authMethod === "oauth_device" && platform.requestDeviceAuthorization) {
        // --- Device flow ---
        setState((s) => ({ ...s, loading: true, error: null }))
        try {
          const device = await platform.requestDeviceAuthorization()
          setDeviceLogin({ device, platformId: id, status: "pending" })
          setState((s) => ({ ...s, loading: false }))

          // Start polling
          pollRef.current = setInterval(async () => {
            if (!platform.pollForToken) return
            try {
              const cred = await platform.pollForToken(device)
              if (cred) {
                // Got token
                if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
                setDeviceLogin((d) => d ? { ...d, status: "completed" } : null)
                await finishAuth(platform, cred)
              }
              // null = still pending, keep polling
              if (Date.now() > device.expiresAt) {
                if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
                setDeviceLogin((d) => d ? { ...d, status: "expired" } : null)
              }
            } catch (err) {
              if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
              setDeviceLogin((d) => d ? { ...d, status: "error", error: String(err) } : null)
            }
          }, device.interval * 1000)
        } catch (err) {
          setState((s) => ({ ...s, loading: false, error: String(err) }))
        }
      } else if (platform.authMethod === "oauth" && platform.getAuthorizationUrl) {
        // --- Authorization code flow ---
        const redirectUri = "aurestream://oauth/callback"
        const authUrl = await platform.getAuthorizationUrl(redirectUri)
        const { openUrl } = await import("@tauri-apps/plugin-opener")
        await openUrl(authUrl)
      } else {
        throw new Error("OAuth not supported on this platform")
      }
    },
    [platforms, finishAuth]
  )

  const handleOAuthCallback = useCallback(
    async (url: string) => {
      setSelectedId("aurestream")
      await handleOAuthCallbackInternal(url)
    },
    [handleOAuthCallbackInternal]
  )

  const logout = useCallback(
    async (id: string) => {
      await deleteCredential(id)
      setState(() => ({ ...EMPTY_STATE, platformId: id, loading: false }))
      cancelDeviceLogin()
    },
    [cancelDeviceLogin]
  )

  const syncSubscriptions = useCallback(
    async (id: string) => {
      const platform = platforms.find((p) => p.id === id)
      if (!platform || !state.credential) {
        setState((s) => ({ ...s, error: "Not logged in" }))
        return
      }
      await syncSubscriptionsInternal(platform, state.credential)
    },
    [platforms, state.credential, syncSubscriptionsInternal]
  )

  const value = useMemo<PlatformContextValue>(
    () => ({
      platforms,
      selectedId,
      state,
      selectPlatform,
      startLogin,
      handleOAuthCallback,
      logout,
      syncSubscriptions,
      oauthPending,
      deviceLogin,
      cancelDeviceLogin,
    }),
    [
      platforms, selectedId, state, selectPlatform, startLogin,
      handleOAuthCallback, logout, syncSubscriptions, oauthPending,
      deviceLogin, cancelDeviceLogin,
    ]
  )

  return (
    <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
  )
}

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext)
  if (!ctx) throw new Error("usePlatform must be used within PlatformProvider")
  return ctx
}
