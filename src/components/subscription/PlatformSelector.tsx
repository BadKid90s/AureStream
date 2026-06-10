// Platform selector dropdown + auth panel for SubscriptionPage.

import { useState } from "react"
import { LogInIcon, LogOutIcon, RefreshCwIcon, CheckIcon, GlobeIcon } from "lucide-react"
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
      {/* Platform tabs */}
      <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
        {platforms.map((p) => (
          <button
            key={p.id}
            onClick={() => selectPlatform(p.id)}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
              selectedId === p.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GlobeIcon className="size-3.5" />
            {p.name}
          </button>
        ))}
      </div>

      {/* Platform auth panel — hidden for manual mode */}
      {current && selectedId !== "manual" && (
        <div
          className={cn(
            "rounded-xl border p-4 transition-all",
            state.loggedIn
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
              : "border-border bg-card"
          )}
        >
          {state.loading ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
              <RefreshCwIcon className="size-4 animate-spin" />
              加载中...
            </div>
          ) : state.loggedIn ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                  <CheckIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">已登录</p>
                  {state.subscriptionCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {state.subscriptionCount} 条订阅
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{current.description}</p>
              <div className="flex gap-2">
                <button
                  onClick={handleSync}
                  disabled={busy || state.syncing}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
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
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 transition-colors"
                >
                  <LogOutIcon className="size-3" />
                  登出
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{current.description}</p>
              <button
                onClick={handleLogin}
                disabled={busy || oauthPending}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-all"
                )}
              >
                <LogInIcon className="size-4" />
                {oauthPending
                  ? "等待授权..."
                  : busy
                  ? "登录中..."
                  : `登录 ${current.name}`}
              </button>
            </div>
          )}

          {state.error && (
            <p className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
