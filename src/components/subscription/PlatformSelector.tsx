// Platform selector tabs + auth panel for SubscriptionPage.
// Supports device flow (show code) and authorization code flow (browser redirect).

import { useState } from "react"
import { LogInIcon, LogOutIcon, RefreshCwIcon, CheckIcon, GlobeIcon, CopyIcon, ExternalLinkIcon, TimerIcon } from "lucide-react"
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
    deviceLogin,
    cancelDeviceLogin,
  } = usePlatform()
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const current = platforms.find((p) => p.id === selectedId)
  const isDeviceFlow = current?.authMethod === "oauth_device"
  const isDevicePending = deviceLogin?.status === "pending"

  const handleLogin = async () => {
    setBusy(true)
    try {
      await startLogin(selectedId)
    } catch (e) {
      console.error(e)
    } finally {
      if (!isDeviceFlow) setBusy(false)
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

  const copyCode = async () => {
    if (!deviceLogin) return
    try {
      await navigator.clipboard.writeText(deviceLogin.device.userCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const openVerificationUrl = () => {
    if (!deviceLogin) return
    const url = deviceLogin.device.verificationUriComplete ?? deviceLogin.device.verificationUri
    window.open(url, "_blank")
  }

  const remainingSeconds = deviceLogin
    ? Math.max(0, Math.floor((deviceLogin.device.expiresAt - Date.now()) / 1000))
    : 0

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
          {state.loading && !isDevicePending ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
              <RefreshCwIcon className="size-4 animate-spin" />
              加载中...
            </div>
          ) : state.loggedIn ? (
            /* ---- Logged in ---- */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                  <CheckIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">已登录</p>
                  {state.subscriptionCount > 0 && (
                    <p className="text-xs text-muted-foreground">{state.subscriptionCount} 条订阅</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSync}
                  disabled={busy || state.syncing}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  )}
                >
                  <RefreshCwIcon className={cn("size-3", state.syncing && "animate-spin")} />
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
          ) : isDevicePending && deviceLogin ? (
            /* ---- Device flow: show code ---- */
            <div className="space-y-4">
              <p className="text-sm font-medium">在浏览器中完成授权</p>

              {/* Verification URL */}
              <button
                onClick={openVerificationUrl}
                className="flex w-full items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm hover:bg-muted/80 transition-colors"
              >
                <span className="text-muted-foreground truncate mr-2">
                  {deviceLogin.device.verificationUri}
                </span>
                <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
              </button>

              {/* User code */}
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-center">
                  <span className="text-2xl font-bold tracking-[0.3em] text-primary select-all">
                    {deviceLogin.device.userCode}
                  </span>
                </div>
                <button
                  onClick={copyCode}
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted transition-colors"
                >
                  <CopyIcon className="size-3.5" />
                  {copied ? "已复制" : "复制"}
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                打开上方链接，输入授权码完成登录。应用将自动同步订阅。
              </p>

              {/* Timer + Cancel */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TimerIcon className="size-3" />
                  <span>{Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, "0")} 后过期</span>
                </div>
                <button
                  onClick={cancelDeviceLogin}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  取消
                </button>
              </div>

              {/* Polling indicator */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCwIcon className="size-3 animate-spin" />
                等待授权中...
              </div>
            </div>
          ) : (
            /* ---- Not logged in, not in device flow ---- */
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{current.description}</p>
              <button
                onClick={handleLogin}
                disabled={busy}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-all"
                )}
              >
                <LogInIcon className="size-4" />
                {busy ? "加载中..." : `登录 ${current.name}`}
              </button>
            </div>
          )}

          {/* Device flow status messages */}
          {deviceLogin?.status === "completed" && (
            <p className="mt-3 text-xs text-emerald-600 font-medium">授权成功，正在同步订阅...</p>
          )}
          {deviceLogin?.status === "expired" && (
            <p className="mt-3 text-xs text-amber-600">授权码已过期，请重新登录</p>
          )}
          {deviceLogin?.status === "error" && (
            <p className="mt-3 text-xs text-red-500">{deviceLogin.error ?? "授权失败"}</p>
          )}

          {state.error && !deviceLogin && (
            <p className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
