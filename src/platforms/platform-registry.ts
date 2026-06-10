// Platform registry — all subscription platforms are registered here.
// Add new third-party platforms by importing them and adding to customPlatforms.

import type { SubscriptionPlatform } from "@/types/platform"
import { AureStreamPlatform } from "./builtin/aurestream"
import { ManualPlatform } from "./builtin/manual"

const builtinPlatforms: SubscriptionPlatform[] = [
  AureStreamPlatform,
  ManualPlatform,
]

const customPlatforms: SubscriptionPlatform[] = [
  // Import and add third-party platforms here.
]

const allPlatforms = [...builtinPlatforms, ...customPlatforms]

export function getPlatform(id: string): SubscriptionPlatform | undefined {
  return allPlatforms.find((p) => p.id === id)
}

export function getBuiltinPlatforms(): SubscriptionPlatform[] {
  return builtinPlatforms
}

export function getCustomPlatforms(): SubscriptionPlatform[] {
  return customPlatforms
}

export function getAllPlatforms(): SubscriptionPlatform[] {
  return allPlatforms
}

export function registerPlatform(platform: SubscriptionPlatform): void {
  if (allPlatforms.some((p) => p.id === platform.id)) {
    console.warn(`[platforms] duplicate platform id: ${platform.id}`)
    return
  }
  customPlatforms.push(platform)
}
