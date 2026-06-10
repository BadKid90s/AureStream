// Manual URL-based subscription platform — wraps the existing paste-URL flow.

import type { SubscriptionPlatform } from "@/types/platform"

export const ManualPlatform: SubscriptionPlatform = {
  id: "manual",
  name: "手动填写",
  description: "直接粘贴订阅链接导入",
  authMethod: "none",

  buildAuthorizationUrl: () => "",
  exchangeCodeForToken: () => Promise.resolve({ providerId: "manual" }),
  fetchSubscriptions: () => Promise.resolve([]),
}
