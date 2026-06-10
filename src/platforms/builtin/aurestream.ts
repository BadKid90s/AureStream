// AureStream official subscription platform.

import type {
  PlatformCredential,
  PlatformSubscription,
  SubscriptionPlatform,
} from "@/types/platform"

const AUTH_BASE = "https://api.aurestream.io"
const REDIRECT_URI = "aurestream://oauth/callback"

export const AureStreamPlatform: SubscriptionPlatform = {
  id: "aurestream",
  name: "AureStream 官方平台",
  description: "登录 AureStream 账号，自动同步订阅配置",
  authMethod: "oauth",

  getAuthorizationUrl: () => {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: "aurestream-desktop",
      redirect_uri: REDIRECT_URI,
      scope: "subscription:read",
    })
    return Promise.resolve(`${AUTH_BASE}/oauth/authorize?${params}`)
  },

  handleAuthCallback: async (callbackUrl: string) => {
    const url = new URL(callbackUrl)
    const code = url.searchParams.get("code")
    if (!code) throw new Error("Missing authorization code in callback")

    const resp = await fetch(`${AUTH_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: "aurestream-desktop",
        redirect_uri: REDIRECT_URI,
      }),
    })
    if (!resp.ok) throw new Error(`Token exchange failed: ${resp.status}`)

    const json = await resp.json()
    return {
      providerId: "aurestream",
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : undefined,
    }
  },

  fetchSubscriptions: async (cred: PlatformCredential) => {
    const resp = await fetch(`${AUTH_BASE}/v1/subscriptions`, {
      headers: { Authorization: `Bearer ${cred.accessToken}` },
    })
    if (!resp.ok) throw new Error(`Failed to fetch subscriptions: ${resp.status}`)

    const json = await resp.json()
    return (json.subscriptions ?? []).map(
      (sub: any): PlatformSubscription => ({
        providerId: "aurestream",
        externalId: sub.id ?? sub.uuid ?? "",
        name: sub.name ?? "AureStream 订阅",
        subscriptionUrl: sub.url ?? sub.subscription_url ?? "",
        expireTime: sub.expire_time ? sub.expire_time * 1000 : undefined,
        usedTraffic: sub.used ?? sub.upload_add_download,
        totalTraffic: sub.total ?? sub.total_traffic,
      })
    )
  },

  refreshCredential: async (cred: PlatformCredential) => {
    if (!cred.refreshToken) throw new Error("No refresh token available")
    const resp = await fetch(`${AUTH_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: cred.refreshToken,
        client_id: "aurestream-desktop",
      }),
    })
    if (!resp.ok) throw new Error(`Token refresh failed: ${resp.status}`)
    const json = await resp.json()
    return {
      ...cred,
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? cred.refreshToken,
      expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : undefined,
    }
  },
}
