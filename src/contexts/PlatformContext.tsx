// Platform context — manages selected platform, auth state, and subscription sync.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type {
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
        setState((s) => ({
          ...s,
          loading: false,
          error: String(err),
        }))
      })

    return () => { cancelled = true }
  }, [selectedId])

  // Listen for OAuth deep link callback
  useEffect(() => {
    const unlisten = listen("deep_link_oauth", async () => {
      setOAuthPending(true)
      try {
        const callback = await invoke<{ url: string } | null>(
          "get_pending_oauth"
        )
        if (callback?.url) {
          await handleOAuthCallbackInternal(callback.url)
        }
      } finally {
        setOAuthPending(false)
      }
    })
    return () => { unlisten.then((fn) => fn()) }
  }, [selectedId])

  const handleOAuthCallbackInternal = useCallback(
    async (url: string) => {
      const platform = platforms.find((p) => p.id === selectedId)
      if (!platform) throw new Error(`Unknown platform: ${selectedId}`)

      setState((s) => ({ ...s, loading: true }))
      try {
        const cred = await platform.handleAuthCallback(url)
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
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: String(err),
        }))
      }
    },
    [selectedId, platforms]
  )

  const syncSubscriptionsInternal = useCallback(
    async (platform: SubscriptionPlatform, cred: PlatformCredential) => {
      setState((s) => ({ ...s, syncing: true, error: null }))
      try {
        const subs = await platform.fetchSubscriptions(cred)
        // Import each subscription using the existing flow
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
  }, [])

  const startLogin = useCallback(
    async (id: string) => {
      const platform = platforms.find((p) => p.id === id)
      if (!platform || platform.authMethod !== "oauth") throw new Error("OAuth not supported")

      const redirectUri = "aurestream://oauth/callback"
      const authUrl = await platform.getAuthorizationUrl(redirectUri)

      // Open system browser
      const { openUrl } = await import("@tauri-apps/plugin-opener")
      await openUrl(authUrl)
    },
    [platforms]
  )

  const handleOAuthCallback = useCallback(
    async (url: string) => {
      setSelectedId("aurestream") // Default to aurestream for OAuth
      await handleOAuthCallbackInternal(url)
    },
    [handleOAuthCallbackInternal]
  )

  const logout = useCallback(
    async (id: string) => {
      await deleteCredential(id)
      setState(() => ({
        ...EMPTY_STATE,
        platformId: id,
        loading: false,
      }))
    },
    []
  )

  const syncSubscriptions = useCallback(
    async (id: string) => {
      const platform = platforms.find((p) => p.id === id)
      if (!platform || !state.credential) {
        setState((s) => ({
          ...s,
          error: "Not logged in",
        }))
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
    }),
    [
      platforms,
      selectedId,
      state,
      selectPlatform,
      startLogin,
      handleOAuthCallback,
      logout,
      syncSubscriptions,
      oauthPending,
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
