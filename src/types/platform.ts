// Subscription platform types — unified interface for all subscription sources.

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

  getAuthorizationUrl(redirectUri: string): Promise<string>
  handleAuthCallback(callbackUrl: string): Promise<PlatformCredential>
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
