// Platform selector tabs + auth panel for SubscriptionPage.
// OAuth uses RFC 8252 loopback redirect — no device code, no manual input.

import { useState } from "react"
import { LogInIcon, LogOutIcon, RefreshCwIcon, CheckIcon, GlobeIcon, Loader2Icon } from "lucide-react"
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
    authBusy,
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
      <div className="flex items-center gap-1 rounded-xl bg-muted/65 p-1 backdrop-blur-md border border-slate-200/20 dark:border-white/[0.03] shadow-xs">
        {platforms.map((p) => {
          const isActive = selectedId === p.id
          return (
            <button
              key={p.id}
              onClick={() => selectPlatform(p.id)}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.8 text-xs font-semibold transition-all cursor-pointer active:scale-98 select-none outline-none",
                isActive
                  ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/25"
              )}
            >
              <GlobeIcon className="size-3.5 opacity-80" />
              {p.name}
            </button>
          )
        })}
      </div>

      {/* Platform auth panel — hidden for manual mode */}
      {current && selectedId !== "manual" && (
        <div
          className={cn(
            "rounded-xl border p-4 transition-all duration-300 shadow-xs",
            state.loggedIn
              ? "border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.04] to-teal-500/[0.01]"
              : "border-border bg-card hover:border-primary/10"
          )}
        >
          {state.loading || authBusy ? (
            <div className="flex flex-col items-center justify-center gap-3 py-5">
              <Loader2Icon className="size-6 animate-spin text-primary" />
              <p className="text-sm font-semibold text-foreground">
                {authBusy ? "正在等待浏览器授权..." : "加载中..."}
              </p>
              {authBusy && (
                <p className="text-xs text-muted-foreground text-center max-w-[200px] leading-relaxed">
                  在浏览器中完成登录后，本页面将自动同步
                </p>
              )}
            </div>
          ) : state.loggedIn ? (
            /* ---- Logged in ---- */
            <div className="space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 relative">
                  <CheckIcon className="size-3.5" />
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20"></span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground/80 leading-none">账号状态</p>
                  <p className="text-sm font-bold text-foreground mt-1 leading-none">已登录 {current.name}</p>
                </div>
              </div>

              {state.subscriptionCount > 0 && (
                <div className="text-xs text-muted-foreground/90 font-semibold bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-500/10 rounded-lg px-2.5 py-1.5 flex justify-between items-center">
                  <span>检测到可用订阅</span>
                  <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    {state.subscriptionCount} 个订阅
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-0.5">
                <button
                  onClick={handleSync}
                  disabled={busy || state.syncing}
                  className={cn(
                    "flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-indigo-600 px-3 py-1.8 text-xs font-bold text-white shadow-xs hover:shadow-md hover:shadow-primary/10 transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  )}
                >
                  <RefreshCwIcon className={cn("size-3", state.syncing && "animate-spin")} />
                  {state.syncing ? "同步中..." : "同步订阅"}
                </button>
                <button
                  onClick={handleLogout}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.8 text-xs font-semibold text-muted-foreground hover:bg-rose-500/5 hover:text-rose-600 hover:border-rose-500/10 dark:hover:bg-rose-500/10 transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  <LogOutIcon className="size-3" />
                  登出
                </button>
              </div>
            </div>
          ) : (
            /* ---- Not logged in ---- */
            <div className="space-y-3.5">
              <p className="text-xs text-muted-foreground leading-relaxed">{current.description}</p>
              <button
                onClick={handleLogin}
                disabled={busy}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:shadow-md hover:shadow-primary/10 transition-all duration-300 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                )}
              >
                <LogInIcon className="size-4" />
                {busy ? "正在跳转浏览器..." : `登录 ${current.name} 拉取订阅`}
              </button>
            </div>
          )}

          {state.error && (
            <p className="mt-3 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
