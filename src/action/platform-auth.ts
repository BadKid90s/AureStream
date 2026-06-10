// Platform credential persistence via tauri-plugin-store.
// Tokens are stored in the app data directory with OS-level file permissions,
// NOT in SQLite.

import { LazyStore } from "@tauri-apps/plugin-store"
import type { PlatformCredential } from "@/types/platform"

const STORE_PATH = "platform-auth.json"
let store: LazyStore | null = null

function getStore(): LazyStore {
  if (!store) store = new LazyStore(STORE_PATH)
  return store
}

export async function loadCredential(
  platformId: string
): Promise<PlatformCredential | null> {
  const s = getStore()
  const raw = await s.get<PlatformCredential>(platformId)
  return raw ?? null
}

export async function saveCredential(
  platformId: string,
  cred: PlatformCredential
): Promise<void> {
  const s = getStore()
  await s.set(platformId, cred)
  await s.save()
}

export async function deleteCredential(platformId: string): Promise<void> {
  const s = getStore()
  await s.delete(platformId)
  await s.save()
}

export async function listSavedPlatforms(): Promise<string[]> {
  const s = getStore()
  const keys = await s.keys()
  return keys as string[]
}
