// AureStream official subscription platform — OAuth device authorization flow.
// User opens a browser, enters a short code, and the app polls for completion.

import type {
  DeviceAuthorization,
  PlatformCredential,
  PlatformSubscription,
  SubscriptionPlatform,
} from "@/types/platform"

const API_BASE = "https://api.aurestream.io"

export const AureStreamPlatform: SubscriptionPlatform = {
  id: "aurestream",
  name: "AureStream 官方平台",
  description: "在浏览器中输入授权码完成登录，自动同步订阅配置",
  authMethod: "oauth_device",

  requestDeviceAuthorization: async () => {
    const resp = await fetch(`${API_BASE}/oauth/device/code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: "aurestream-desktop" }),
    })
    if (!resp.ok) {
      throw new Error(`Device authorization request failed: ${resp.status}`)
    }
    const json = await resp.json()
    return {
      verificationUri: json.verification_uri,
      userCode: json.user_code,
      verificationUriComplete: json.verification_uri_complete,
      interval: json.interval ?? 5,
      expiresAt: Date.now() + (json.expires_in ?? 600) * 1000,
    }
  },

  pollForToken: async (device: DeviceAuthorization) => {
    const resp = await fetch(`${API_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: device.userCode, // server returns device_code in first step
        client_id: "aurestream-desktop",
      }),
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      // authorization_pending = user hasn't completed yet (not an error)
      if (err.error === "authorization_pending") {
        return null as unknown as PlatformCredential
      }
      // slow_down = polling too fast
      if (err.error === "slow_down") {
        return null as unknown as PlatformCredential
      }
      throw new Error(`Token request failed: ${resp.status} ${err.error ?? ""}`)
    }
    const json = await resp.json()
    return {
      providerId: "aurestream",
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : undefined,
    }
  },

  fetchSubscriptions: async (cred: PlatformCredential) => {
    const resp = await fetch(`${API_BASE}/v1/subscriptions`, {
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
    const resp = await fetch(`${API_BASE}/oauth/token`, {
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
