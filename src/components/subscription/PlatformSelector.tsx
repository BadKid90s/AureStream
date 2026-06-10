// Platform selector dropdown + auth panel for SubscriptionPage.

import { useState } from "react"
import { LogInIcon, LogOutIcon, RefreshCwIcon, CheckIcon } from "lucide-react"
import { usePlatform } from "@/contexts/PlatformContext"
import { cn } from "@/lib/utils"

export function PlatformSelector() {
  const {
    platforms,
    selectedId,
    state,
    selectPlatform,
    startLogin,
    logout,
    syncSubscriptions,
    oauthPending,
  } = usePlatform()
  const [busy, setBusy] = useState(false)

  const current = platforms.find((p) => p.id === selectedId)

  const handleLogin = async () => {
    setBusy(true)
    try {
      await startLogin(selectedId)
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  const handleLogout = async () => {
    setBusy(true)
    try {
      await logout(selectedId)
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  const handleSync = async () => {
    setBusy(true)
    try {
      await syncSubscriptions(selectedId)
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Platform dropdown */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground shrink-0">
          订阅来源
        </label>
        <select
          value={selectedId}
          onChange={(e) => selectPlatform(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {platforms.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Platform panel */}
      {current && selectedId !== "manual" && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground mb-3">
            {current.description}
          </p>

          {state.loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCwIcon className="size-3.5 animate-spin" />
              加载中...
            </div>
          ) : state.loggedIn ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckIcon className="size-4" />
                已登录
                {state.platformId !== selectedId && (
                  <span className="text-muted-foreground">
                    · {state.subscriptionCount} 条订阅
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSync}
                  disabled={busy || state.syncing}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  )}
                >
                  <RefreshCwIcon
                    className={cn("size-3", state.syncing && "animate-spin")}
                  />
                  {state.syncing ? "同步中..." : "刷新订阅"}
                </button>
                <button
                  onClick={handleLogout}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                >
                  <LogOutIcon className="size-3" />
                  登出
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              disabled={busy || oauthPending}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              )}
            >
              <LogInIcon className="size-4" />
              {oauthPending ? "等待授权..." : busy ? "登录中..." : `登录 ${current.name}`}
            </button>
          )}

          {state.error && (
            <p className="mt-2 text-xs text-red-500">{state.error}</p>
          )}
        </div>
      )}
    </div>
  )
}
