// Subscription platform types.
// Primary OAuth flow: RFC 8252 Authorization Code + PKCE with loopback redirect.

export type AuthMethod = "oauth" | "none"

export interface PlatformCredential {
  providerId: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
  apiKey?: string
  extra?: Record<string, string>
}

export interface PlatformSubscription {
  providerId: string
  externalId: string
  name: string
  subscriptionUrl: string
  expireTime?: number
  usedTraffic?: number
  totalTraffic?: number
}

export interface AccountInfo {
  name?: string
  email?: string
  subscriptionCount?: number
}

export interface SubscriptionPlatform {
  id: string
  name: string
  description: string
  icon?: string
  authMethod: AuthMethod

  /** Build the full authorization URL (with PKCE challenge, redirect_uri, state). */
  buildAuthorizationUrl(params: {
    redirectUri: string
    codeChallenge: string
    state: string
  }): string

  /** Exchange code + code_verifier for tokens. */
  exchangeCodeForToken(params: {
    code: string
    codeVerifier: string
    redirectUri: string
  }): Promise<PlatformCredential>

  fetchSubscriptions(cred: PlatformCredential): Promise<PlatformSubscription[]>

  refreshCredential?(cred: PlatformCredential): Promise<PlatformCredential>
  getAccountInfo?(cred: PlatformCredential): Promise<AccountInfo>
}

export interface PlatformAuthState {
  platformId: string
  loggedIn: boolean
  credential?: PlatformCredential
  accountName?: string
  error?: string
}
