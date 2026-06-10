// Platform context — manages selected platform, auth state, and subscription sync.
// OAuth flow: RFC 8252 Authorization Code + PKCE with loopback redirect (127.0.0.1).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { PlatformCredential, SubscriptionPlatform } from "@/types/platform"
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
  logout: (id: string) => Promise<void>
  syncSubscriptions: (id: string) => Promise<void>
  authBusy: boolean
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

// ---- PKCE helpers ----

function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

async function computeCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(verifier))
  return base64UrlEncode(new Uint8Array(hash))
}

function base64UrlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function generateState(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

// ---- Provider ----

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const platforms = useMemo(() => getAllPlatforms(), [])
  const [selectedId, setSelectedId] = useState("manual")
  const [state, setState] = useState<PlatformState>(EMPTY_STATE)
  const [authBusy, setAuthBusy] = useState(false)

  // Restore saved credential
  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    loadCredential(selectedId)
      .then((cred) => {
        if (cancelled) return
        setState((s) => ({ ...s, platformId: selectedId, loggedIn: cred != null, credential: cred ?? null, loading: false }))
      })
      .catch((err) => {
        if (cancelled) return
        setState((s) => ({ ...s, loading: false, error: String(err) }))
      })
    return () => { cancelled = true }
  }, [selectedId])

  const finishAuth = useCallback(async (platform: SubscriptionPlatform, cred: PlatformCredential) => {
    await saveCredential(platform.id, cred)
    setState((s) => ({ ...s, platformId: platform.id, loggedIn: true, credential: cred, loading: false, error: null }))
    await syncSubscriptionsInternal(platform, cred)
  }, [])

  const syncSubscriptionsInternal = useCallback(async (platform: SubscriptionPlatform, cred: PlatformCredential) => {
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
      // Notify UI to refresh subscription list
      window.dispatchEvent(new CustomEvent("subscription-synced"))
    } catch (err) {
      setState((s) => ({ ...s, syncing: false, error: String(err) }))
    }
  }, [])

  const selectPlatform = useCallback((id: string) => { setSelectedId(id) }, [])

  // RFC 8252: PKCE + loopback redirect
  const startLogin = useCallback(async (id: string) => {
    const platform = platforms.find((p) => p.id === id)
    if (!platform || platform.authMethod !== "oauth") throw new Error("OAuth not supported")

    setAuthBusy(true)
    setState((s) => ({ ...s, loading: true, error: null }))

    try {
      // 1. Start local callback server
      const port = await invoke<number>("start_oauth_server")
      const redirectUri = `http://127.0.0.1:${port}/callback`

      // 2. Generate PKCE + state
      const codeVerifier = generateCodeVerifier()
      const codeChallenge = await computeCodeChallenge(codeVerifier)
      const state = generateState()

      // 3. Build auth URL and open browser
      const authUrl = platform.buildAuthorizationUrl({ redirectUri, codeChallenge, state })

      const { openUrl } = await import("@tauri-apps/plugin-opener")
      await openUrl(authUrl)

      // 4. Wait for callback from localhost server
      const code = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          unlisten()
          reject(new Error("Authorization timed out"))
        }, 120_000)

        const unlistenPromise = listen("oauth_callback_received", async () => {
          clearTimeout(timeout)
          unlisten()
          try {
            const c = await invoke<string | null>("get_oauth_callback_code")
            await invoke("stop_oauth_server")
            if (c) {
              resolve(c)
            } else {
              reject(new Error("No authorization code in callback"))
            }
          } catch (e) {
            reject(e)
          }
        })
        let unlisten = () => { unlistenPromise.then((fn) => fn()) }
      })

      // 5. Exchange code for token
      const cred = await platform.exchangeCodeForToken({ code, codeVerifier, redirectUri })
      setAuthBusy(false)
      await finishAuth(platform, cred)
    } catch (err) {
      setAuthBusy(false)
      setState((s) => ({ ...s, loading: false, error: String(err) }))
      // Ensure server is stopped
      invoke("stop_oauth_server").catch(() => {})
    }
  }, [platforms, finishAuth])

  const logout = useCallback(async (id: string) => {
    await deleteCredential(id)
    setState(() => ({ ...EMPTY_STATE, platformId: id, loading: false }))
  }, [])

  const syncSubscriptions = useCallback(async (id: string) => {
    const platform = platforms.find((p) => p.id === id)
    if (!platform || !state.credential) { setState((s) => ({ ...s, error: "Not logged in" })); return }
    await syncSubscriptionsInternal(platform, state.credential)
  }, [platforms, state.credential, syncSubscriptionsInternal])

  const value = useMemo<PlatformContextValue>(() => ({
    platforms, selectedId, state, selectPlatform,
    startLogin, logout, syncSubscriptions, authBusy,
  }), [platforms, selectedId, state, selectPlatform, startLogin, logout, syncSubscriptions, authBusy])

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
}

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext)
  if (!ctx) throw new Error("usePlatform must be used within PlatformProvider")
  return ctx
}
