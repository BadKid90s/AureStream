// Subscription platform types — unified interface for all subscription sources.
// Supports both OAuth authorization code flow (browser redirect) and
// OAuth device authorization flow (user enters code in browser).

export type AuthMethod = "oauth" | "oauth_device" | "none"

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

// ---- Device authorization flow ----

export interface DeviceAuthorization {
  /** URL the user opens in a browser */
  verificationUri: string
  /** Short code the user enters on the verification page */
  userCode: string
  /** Full verification URL with code pre-filled (optional, for convenience) */
  verificationUriComplete?: string
  /** Polling interval in seconds */
  interval: number
  /** When the device code expires (epoch ms) */
  expiresAt: number
}

// ---- Plugin interface ----

export interface SubscriptionPlatform {
  id: string
  name: string
  description: string
  icon?: string
  authMethod: AuthMethod

  // --- Device flow (authMethod === "oauth_device") ---
  /** Request a device + user code from the authorization server. */
  requestDeviceAuthorization?(): Promise<DeviceAuthorization>
  /** Poll the token endpoint until the user completes authorization. */
  pollForToken?(device: DeviceAuthorization): Promise<PlatformCredential>

  // --- Authorization code flow (authMethod === "oauth") ---
  getAuthorizationUrl?(redirectUri: string): Promise<string>
  handleAuthCallback?(callbackUrl: string): Promise<PlatformCredential>

  // --- Subscriptions ---
  fetchSubscriptions(cred: PlatformCredential): Promise<PlatformSubscription[]>

  // --- Optional ---
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
