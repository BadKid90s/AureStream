import { useState, useEffect } from "react"
import {
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
  LinkIcon,
  ShieldCheckIcon,
  AlertCircleIcon,
  CopyIcon,
  CheckIcon,
  LayersIcon,
  GaugeIcon,
  ActivityIcon,
  GlobeIcon,
  ExternalLinkIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { badge, btn, iconBadge, surface, type } from "@/lib/typography"

import { useSubscriptions } from "@/hooks/useSubscriptions"
import { insertSubscription, deleteSubscription, updateSubscription } from "@/action/db"
import { message } from "@tauri-apps/plugin-dialog"
import { getStoreValue, setStoreValue } from "@/single/store"
import { AUTO_UPDATE_STORE_KEY, UPDATE_INTERVAL_STORE_KEY } from "@/types/definition"
import type { UpdateInterval } from "@/types/definition"
import { syncActiveConnectionConfig } from "@/lib/config-sync"
import { usePlatform } from "@/contexts/PlatformContext"
import { PlatformSelector } from "@/components/subscription/PlatformSelector"

const getFriendlyNameFromUrl = (urlStr: string, t: (key: string) => string): string => {
  try {
    const parsed = new URL(urlStr)
    const pathname = parsed.pathname
    const segments = pathname.split("/").filter(Boolean)
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1]
      const cleanName = lastSegment.split("?")[0].replace(/\.(yaml|yml|ini|txt|conf)$/i, "")
      if (cleanName && cleanName !== "subscribe" && cleanName !== "sub") {
        return decodeURIComponent(cleanName)
      }
    }
    const hostname = parsed.hostname
    const hostParts = hostname.split(".")
    if (hostParts.length > 1) {
      const domain = hostParts[hostParts.length - 2]
      if (domain && domain !== "com" && domain !== "net" && domain !== "org") {
        return domain.toUpperCase() + " " + t("subscription")
      }
    }
    return parsed.hostname + " " + t("subscription")
  } catch (e) {
    return t("unnamed_subscription")
  }
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 GB"
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb < 0.01) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${gb.toFixed(1)} GB`
}

function formatExpiry(expireTimeMs: number, t: (key: string) => string): string {
  if (!expireTimeMs || expireTimeMs <= 0) return t("unlimited")
  const date = new Date(expireTimeMs)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function formatLastUpdate(timestamp: number, t: (key: string) => string): string {
  if (!timestamp || timestamp <= 0) return t("never")
  const date = new Date(timestamp * 1000)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function getStatus(expireTimeMs: number): "active" | "expired" | "expiring" {
  if (!expireTimeMs || expireTimeMs <= 0) return "active"
  const now = Date.now()
  if (expireTimeMs <= now) return "expired"
  if (expireTimeMs - now < 7 * 24 * 3600 * 1000) return "expiring"
  return "active"
}

export function SubscriptionPage() {
  const { t } = useTranslation()
  const {
    subscriptions,
    activeIdentifier,
    nodes,
    loading,
    refresh,
    selectSubscription,
    requireIdleForMutation,
  } = useSubscriptions()
  const { selectedId } = usePlatform()

  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [autoUpdate, setAutoUpdate] = useState(true)
  const [updateInterval, setUpdateInterval] = useState<UpdateInterval>("24h")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUpdatingAll, setIsUpdatingAll] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const handleCopyUrl = async (identifier: string, urlStr: string) => {
    try {
      await navigator.clipboard.writeText(urlStr)
      setCopiedId(identifier)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error("Failed to copy URL:", err)
    }
  }

  // Dashboard calculations
  const totalCount = subscriptions.length
  const selectedSub = subscriptions.find((sub) => sub.identifier === activeIdentifier) || subscriptions[0]
  const activeSubName = selectedSub ? selectedSub.name : t("no_subscription")

  let totalUsedTraffic = 0
  let totalMaxTraffic = 0
  let expiredCount = 0
  let expiringCount = 0

  subscriptions.forEach((sub) => {
    totalUsedTraffic += sub.used_traffic || 0
    totalMaxTraffic += sub.total_traffic || 0
    const status = getStatus(sub.expire_time)
    if (status === "expired") {
      expiredCount++
    } else if (status === "expiring") {
      expiringCount++
    }
  })

  const overallPercent = totalMaxTraffic > 0 ? (totalUsedTraffic / totalMaxTraffic) * 100 : 0

  // Load persisted auto-update settings
  useEffect(() => {
    getStoreValue(AUTO_UPDATE_STORE_KEY, true).then(setAutoUpdate)
    getStoreValue(UPDATE_INTERVAL_STORE_KEY, "24h").then((v) => setUpdateInterval(v as UpdateInterval))
  }, [])

  // Refresh list when platform sync adds subscriptions
  useEffect(() => {
    const handler = () => refresh()
    window.addEventListener("subscription-synced", handler)
    return () => window.removeEventListener("subscription-synced", handler)
  }, [refresh])

  const handleAutoUpdateChange = async (val: boolean) => {
    setAutoUpdate(val)
    await setStoreValue(AUTO_UPDATE_STORE_KEY, val)
    window.dispatchEvent(new CustomEvent("auto-update-setting-changed"))
  }

  const handleUpdateIntervalChange = async (val: UpdateInterval) => {
    setUpdateInterval(val)
    await setStoreValue(UPDATE_INTERVAL_STORE_KEY, val)
  }

  /** Rebuild config.json when the active subscription content changes. */
  async function reloadIfActive(identifier: string) {
    if (identifier !== activeIdentifier) return
    try {
      await syncActiveConnectionConfig("subscription-updated")
    } catch (e) {
      console.error("[subscription] config sync after update failed:", e)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url || isSubmitting) return
    setIsSubmitting(true)
    try {
      const finalName = name.trim() || getFriendlyNameFromUrl(url, t)
      const id = await insertSubscription(url, finalName)
      if (id) {
        await selectSubscription(id)
        setName("")
        setUrl("")
        await refresh()
        setIsAddModalOpen(false)
      } else {
        await message(t("cannot_parse_subscription"), {
          title: t("import_failed"),
          kind: "error",
        })
      }
    } catch (err: any) {
      console.error(err)
      await message(`${t("add_failed")}: ${err.message || err}`, {
        title: t("error"),
        kind: "error",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (identifier: string) => {
    if (!(await requireIdleForMutation())) return
    try {
      await deleteSubscription(identifier)
      await refresh()
    } catch (err) {
      console.error(err)
    }
  }

  const handleSingleUpdate = async (identifier: string) => {
    setUpdatingId(identifier)
    try {
      const ok = await updateSubscription(identifier)
      if (ok) {
        await refresh()
        await reloadIfActive(identifier)
      } else {
        await message(t("update_subscription_failed"), {
          title: t("update_failed"),
          kind: "error",
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleUpdateAll = async () => {
    if (isUpdatingAll) return
    setIsUpdatingAll(true)
    let activeWasUpdated = false
    try {
      for (const sub of subscriptions) {
        const ok = await updateSubscription(sub.identifier)
        if (ok && sub.identifier === activeIdentifier) {
          activeWasUpdated = true
        }
      }
      await refresh()
      if (activeWasUpdated) {
        await reloadIfActive(activeIdentifier)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsUpdatingAll(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden h-full relative px-4 sm:px-6 py-4.5 gap-4">
      {/* Ambient Glow Light Spots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[320px] h-[320px] rounded-full bg-purple-500/[0.05] dark:bg-purple-500/[0.025] filter blur-[90px] animate-pulse" style={{ animationDuration: "12s" }} />
        <div className="absolute -bottom-[10%] -right-[10%] w-[380px] h-[380px] rounded-full bg-blue-500/[0.04] dark:bg-blue-500/[0.02] filter blur-[100px] animate-pulse" style={{ animationDuration: "15s" }} />
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40 shrink-0 relative z-10">
        <div className="flex flex-col">
          <h1 className={type.pageTitle}>{t("subscription")}</h1>
          <p className={type.pageSubtitle}>{t("subscription_subtitle") || "管理和同步您的 sing-box / 通用代理节点订阅"}</p>
        </div>
        <div className="flex items-center gap-2">
          {subscriptions.length > 0 && (
            <Button
              variant="outline"
              onClick={handleUpdateAll}
              disabled={isUpdatingAll}
              className="border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground font-semibold text-xs h-9 px-3.5 rounded-xl transition-all duration-200 active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCwIcon className={cn("size-3.5", isUpdatingAll && "animate-spin")} />
              {isUpdatingAll ? t("updating") : t("update_all")}
            </Button>
          )}
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs hover:shadow-md hover:shadow-primary/10 transition-all duration-200 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <PlusIcon className="size-3.5" />
            {t("add_subscription")}
          </Button>
        </div>
      </div>

      {/* Dashboard Stats Summary */}
      {!loading && subscriptions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 shrink-0 relative z-10">
          {/* Card 1: Total Subscriptions */}
          <div className="flex items-center gap-3.5 rounded-[16px] backdrop-blur-md bg-card/60 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.05] p-3.5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-primary/20">
            <div className={cn(iconBadge.purple, "size-9 rounded-xl")}>
              <LayersIcon className="size-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-muted-foreground/85 font-medium block leading-none">
                {t("subscriptions_saved")}
              </span>
              <div className="flex items-baseline gap-1 mt-1 leading-none">
                <span className="text-[17px] font-bold tracking-tight text-foreground">{totalCount}</span>
                <span className="text-[10px] text-muted-foreground">{t("subscriptions_count")}</span>
              </div>
              <span className="text-[10.5px] text-muted-foreground/75 block truncate mt-1 leading-none">
                {t("total")}: {totalCount}
              </span>
            </div>
          </div>

          {/* Card 2: Active Subscription */}
          <div className="flex items-center gap-3.5 rounded-[16px] backdrop-blur-md bg-gradient-to-br from-primary/[0.05] via-secondary/5 to-indigo-500/[0.02] border border-primary/25 dark:border-primary/20 p-3.5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/40 relative overflow-hidden">
            <div className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <div className={cn(iconBadge.emerald, "size-9 rounded-xl")}>
              <ActivityIcon className="size-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-muted-foreground/85 font-medium block leading-none">
                {t("in_use")}
              </span>
              <span className="text-[14px] font-bold block truncate mt-1 leading-tight text-foreground" title={activeSubName}>
                {activeSubName}
              </span>
              <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium block mt-1 leading-none">
                {selectedSub ? `${t("used")}: ${(selectedSub.used_traffic / selectedSub.total_traffic * 100).toFixed(0)}%` : "-"}
              </span>
            </div>
          </div>

          {/* Card 3: Total Traffic Summary */}
          <div className="flex items-center gap-3.5 rounded-[16px] backdrop-blur-md bg-card/60 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.05] p-3.5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-primary/20">
            <div className={cn(iconBadge.blue, "size-9 rounded-xl")}>
              <GaugeIcon className="size-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-muted-foreground/85 font-medium block leading-none">
                {t("total_traffic_label") || "数据汇总"}
              </span>
              <div className="flex items-baseline gap-1 mt-1 leading-none">
                <span className="text-[16px] font-bold tracking-tight text-foreground">{formatBytes(totalMaxTraffic)}</span>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex justify-between items-center text-[9.5px] text-muted-foreground leading-none">
                  <span>{t("used")}: {formatBytes(totalUsedTraffic)}</span>
                  <span>{overallPercent.toFixed(0)}%</span>
                </div>
                <Progress value={overallPercent} className="h-1 bg-muted/65 [&>div]:bg-primary" />
              </div>
            </div>
          </div>

          {/* Card 4: Health Expiry Warnings */}
          <div className="flex items-center gap-3.5 rounded-[16px] backdrop-blur-md bg-card/60 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.05] p-3.5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-primary/20">
            <div className={cn(
              expiredCount > 0 ? iconBadge.slate : expiringCount > 0 ? iconBadge.slate : iconBadge.indigo,
              "size-9 rounded-xl",
              expiredCount > 0 ? "bg-red-500/10 text-red-600" : expiringCount > 0 ? "bg-amber-500/10 text-amber-600" : ""
            )}>
              <AlertCircleIcon className="size-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-muted-foreground/85 font-medium block leading-none">
                订阅状态
              </span>
              <div className="flex items-baseline gap-1 mt-1 leading-none">
                <span className={cn(
                  "text-[15px] font-bold tracking-tight",
                  expiredCount > 0 ? "text-red-600" : expiringCount > 0 ? "text-amber-600" : "text-foreground"
                )}>
                  {expiredCount > 0 
                    ? `${expiredCount} ${t("expired")}` 
                    : expiringCount > 0 
                    ? `${expiringCount} 即将到期` 
                    : t("in_service")}
                </span>
              </div>
              <span className="text-[10.5px] text-muted-foreground/75 block truncate mt-1.5 leading-none">
                {expiredCount === 0 && expiringCount === 0 ? "全部状态正常" : "建议检查更新"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area (Split Screen) */}
      {!loading && totalCount > 0 ? (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_1fr] xl:grid-cols-[400px_1fr] gap-4.5 relative z-10 overflow-hidden pb-1">
          {/* Left panel: List view */}
          <div className="flex flex-col gap-3 min-h-0 h-full overflow-hidden">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                订阅列表 ({totalCount})
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 scrollbar-thin">
              {subscriptions.map((sub) => {
                const isCurrent = sub.identifier === activeIdentifier
                const percent = sub.total_traffic > 0 ? (sub.used_traffic / sub.total_traffic) * 100 : 0
                const status = getStatus(sub.expire_time)
                return (
                  <div
                    key={sub.identifier}
                    onClick={() => selectSubscription(sub.identifier)}
                    className={cn(
                      "flex flex-col gap-2.5 rounded-[16px] border p-3.5 transition-all duration-350 cursor-pointer select-none relative overflow-hidden backdrop-blur-md",
                      isCurrent
                        ? "bg-gradient-to-br from-primary/[0.08] via-secondary/[0.02] to-transparent border-primary/50 shadow-md shadow-primary/[0.03] ring-1 ring-primary/20"
                        : status === "expired"
                        ? "bg-card/35 dark:bg-white/[0.005] border-red-500/15 opacity-70 hover:opacity-95 hover:border-red-500/30"
                        : "bg-card/65 dark:bg-white/[0.015] border-slate-200/50 dark:border-white/[0.04] shadow-xs hover:bg-card/85 dark:hover:bg-white/[0.025] hover:border-primary/25 hover:shadow-md"
                    )}
                  >
                    {/* Left line indicator for active card */}
                    {isCurrent && (
                      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary rounded-r-md" />
                    )}

                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "size-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs",
                          isCurrent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          <GlobeIcon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[13px] font-semibold text-foreground truncate block leading-tight">
                            {sub.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground/75 truncate block mt-0.5 max-w-[180px] sm:max-w-xs md:max-w-md lg:max-w-[160px] xl:max-w-[200px]">
                            {sub.subscription_url}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCurrent && (
                          <span className={cn(badge.success, "h-5 px-1.5 text-[9px] rounded-md font-bold")}>
                            {t("in_use")}
                          </span>
                        )}
                        {status === "expired" && (
                          <span className={cn(badge.danger, "h-5 px-1.5 text-[9px] rounded-md font-bold")}>
                            {t("expired")}
                          </span>
                        )}
                        {status === "expiring" && (
                          <span className={cn(badge.warning, "h-5 px-1.5 text-[9px] rounded-md font-bold")}>
                            {t("expiring_soon")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 mt-0.5">
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                        <span>{formatBytes(sub.used_traffic)} / {formatBytes(sub.total_traffic)}</span>
                        <span className="font-semibold">{percent.toFixed(0)}%</span>
                      </div>
                      <Progress
                        value={percent}
                        className={cn(
                          "h-1.5 bg-muted/65 rounded-full overflow-hidden",
                          status === "expired" || percent > 85
                            ? "[&>div]:bg-red-500"
                            : percent > 60
                            ? "[&>div]:bg-amber-500"
                            : "[&>div]:bg-primary"
                        )}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right panel: Details view */}
          {selectedSub && (
            <div className="min-h-0 h-full bg-card/45 dark:bg-zinc-900/45 rounded-[22px] border border-slate-200/60 dark:border-white/[0.04] p-5 flex flex-col gap-5 backdrop-blur-md shadow-xs overflow-hidden">
              {/* Header and top actions */}
              <div className="flex flex-col gap-3 pb-4 border-b border-border/40 shrink-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-foreground tracking-tight">
                        {selectedSub.name}
                      </h2>
                      <span className={cn(
                        badge.success,
                        "h-5 px-2 text-[9.5px] rounded-md font-bold",
                        selectedSub.identifier !== activeIdentifier && "bg-muted text-muted-foreground border-transparent"
                      )}>
                        {selectedSub.identifier === activeIdentifier ? t("in_use") : "已保存"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      订阅ID: {selectedSub.identifier}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updatingId === selectedSub.identifier}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSingleUpdate(selectedSub.identifier)
                      }}
                      className="h-8.5 rounded-xl border border-border/60 hover:bg-muted text-xs font-semibold px-3 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCwIcon className={cn("size-3.5", updatingId === selectedSub.identifier && "animate-spin")} />
                      {updatingId === selectedSub.identifier ? t("updating") : "同步数据"}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(selectedSub.identifier)
                      }}
                      className="size-8.5 rounded-xl border border-rose-500/20 hover:border-rose-500/40 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 transition-colors flex items-center justify-center cursor-pointer"
                      title={t("delete_subscription")}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* Sub URL Readonly Clipboard Block */}
                <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 border border-slate-200/50 dark:border-white/[0.04] p-2 pl-3.5 relative overflow-hidden">
                  <LinkIcon className="size-3.5 text-muted-foreground/60 shrink-0" />
                  <span className="text-[11.5px] text-muted-foreground font-mono truncate flex-1 select-all" title={selectedSub.subscription_url}>
                    {selectedSub.subscription_url}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopyUrl(selectedSub.identifier, selectedSub.subscription_url)
                    }}
                    className="size-7 rounded-lg hover:bg-muted text-muted-foreground/50 hover:text-foreground transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                    title="复制链接"
                  >
                    {copiedId === selectedSub.identifier ? (
                      <CheckIcon className="size-3.5 text-emerald-500 scale-110 animate-in fade-in zoom-in duration-200" />
                    ) : (
                      <CopyIcon className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Grid: Traffic SVG gauge + Scheduler */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
                {/* Traffic usage detail */}
                <div className="flex items-center gap-4 rounded-xl border border-slate-200/55 dark:border-white/[0.03] bg-muted/20 p-4">
                  {/* Radial progress SVG */}
                  {(() => {
                    const percent = selectedSub.total_traffic > 0 ? (selectedSub.used_traffic / selectedSub.total_traffic) * 100 : 0
                    const radius = 38
                    const strokeDasharray = 2 * Math.PI * radius
                    const strokeDashoffset = strokeDasharray - (strokeDasharray * percent) / 100
                    return (
                      <div className="relative size-22 flex items-center justify-center shrink-0 select-none">
                        <svg className="size-full transform -rotate-90">
                          <defs>
                            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor={percent > 85 ? "#f43f5e" : percent > 60 ? "#fbbf24" : "#10b981"} />
                              <stop offset="100%" stopColor={percent > 85 ? "#dc2626" : percent > 60 ? "#d97706" : "#3b82f6"} />
                            </linearGradient>
                          </defs>
                          <circle
                            cx="44"
                            cy="44"
                            r={radius}
                            className="stroke-slate-200 dark:stroke-white/[0.04] fill-none"
                            strokeWidth="5"
                          />
                          <circle
                            cx="44"
                            cy="44"
                            r={radius}
                            stroke="url(#gaugeGradient)"
                            className="fill-none transition-all duration-500 ease-out"
                            strokeWidth="5"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center mt-0.5">
                          <span className="text-sm font-bold text-foreground leading-none">{percent.toFixed(0)}%</span>
                          <span className="text-[8.5px] text-muted-foreground/80 mt-0.5 font-medium">已用</span>
                        </div>
                      </div>
                    )
                  })()}

                  <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-2.5">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground/75 leading-none font-medium">已用流量</span>
                      <span className="text-[13px] font-bold text-foreground mt-1 leading-none">{formatBytes(selectedSub.used_traffic)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground/75 leading-none font-medium">可用总额</span>
                      <span className="text-[13px] font-bold text-foreground mt-1 leading-none">{formatBytes(selectedSub.total_traffic)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground/75 leading-none font-medium">剩余可用</span>
                      <span className={cn(
                        "text-[13px] font-bold mt-1 leading-none",
                        (selectedSub.total_traffic - selectedSub.used_traffic) <= 0 ? "text-rose-500" : "text-emerald-500 dark:text-emerald-400"
                      )}>
                        {formatBytes(Math.max(0, selectedSub.total_traffic - selectedSub.used_traffic))}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground/75 leading-none font-medium">到期状态</span>
                      <span className="text-[12px] font-bold text-foreground mt-1 leading-none truncate">{formatExpiry(selectedSub.expire_time, t)}</span>
                    </div>
                  </div>
                </div>

                {/* Auto Update scheduler */}
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200/55 dark:border-white/[0.03] bg-muted/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-foreground">自动更新</span>
                      <span className="text-[10px] text-muted-foreground">启用后后台定期同步最新节点</span>
                    </div>
                    <Switch size="sm" checked={autoUpdate} onCheckedChange={handleAutoUpdateChange} />
                  </div>

                  {autoUpdate && (
                    <div className="flex flex-col gap-2 pt-1 border-t border-border/30">
                      <span className="text-[9.5px] text-muted-foreground font-semibold">同步周期</span>
                      <div className="grid grid-cols-4 gap-1">
                        {(["30m", "1h", "2h", "3h", "6h", "12h", "24h", "7d"] as const).map((interval) => (
                          <button
                            key={interval}
                            type="button"
                            onClick={() => handleUpdateIntervalChange(interval)}
                            className={cn(
                              "h-7 flex items-center justify-center font-bold text-[10px] rounded-lg transition-all active:scale-95 cursor-pointer",
                              updateInterval === interval 
                                ? "bg-primary text-white shadow-xs" 
                                : "bg-background/70 dark:bg-black/15 text-muted-foreground hover:bg-background dark:hover:bg-black/35 hover:text-foreground"
                            )}
                          >
                            {interval === "30m" && "30分"}
                            {interval === "1h" && "1时"}
                            {interval === "2h" && "2时"}
                            {interval === "3h" && "3时"}
                            {interval === "6h" && "6时"}
                            {interval === "12h" && "12时"}
                            {interval === "24h" && "每天"}
                            {interval === "7d" && "每周"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Node preview list */}
              <div className="flex-1 min-h-0 flex flex-col gap-2.5">
                <div className="flex items-center justify-between border-b border-border/40 pb-2 shrink-0">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheckIcon className="size-3.5 text-emerald-500" />
                    解析节点预览
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted/65 px-1.5 py-0.5 rounded">
                    共 {nodes.length} 个节点
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto pr-1">
                  {nodes.length === 0 ? (
                    <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-muted-foreground/50 border border-dashed border-border/70 rounded-xl bg-muted/5 gap-2">
                      <AlertCircleIcon className="size-6 text-muted-foreground/35 animate-pulse" />
                      <span className="text-[11px]">暂无已解析节点数据，请点击上方“同步数据”拉取</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 pb-2">
                      {nodes.map((node) => (
                        <div
                          key={node.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/20 border border-slate-200/40 dark:border-white/[0.02] text-xs font-medium text-foreground/80 hover:border-primary/20 hover:text-primary transition-all duration-200 group select-none truncate"
                        >
                          <span className="size-1.5 rounded-full bg-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
                          <span className="truncate" title={node.name}>
                            {node.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer info: Last Updated Time */}
              <div className="text-[10.5px] text-muted-foreground/75 border-t border-border/40 pt-2.5 shrink-0 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <RefreshCwIcon className="size-3" />
                  上一次同步: <span className="font-mono">{formatLastUpdate(selectedSub.last_update_time, t)}</span>
                </span>
                {selectedSub.official_website && selectedSub.official_website !== "https://sing-box.net" && (
                  <a
                    href={selectedSub.official_website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                  >
                    访问官网
                    <ExternalLinkIcon className="size-2.5" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2 z-10">
          <span className={type.description}>{t("loading")}</span>
        </div>
      ) : (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 py-12 border border-dashed border-border/80 rounded-[24px] bg-card/30 backdrop-blur-xs min-h-[320px] relative z-10">
          <AlertCircleIcon className="size-10 text-muted-foreground/25 animate-pulse" />
          <div className="flex flex-col items-center gap-1.5">
            <span className={cn(type.value, "text-muted-foreground/80")}>{t("no_subscription_yet")}</span>
            <span className={type.caption}>点击右上角 “添加订阅” 开始配置节点吧</span>
          </div>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-2 bg-gradient-to-r from-primary to-indigo-600 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs hover:shadow-md hover:shadow-primary/10 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <PlusIcon className="size-3.5" />
            {t("add_subscription")}
          </Button>
        </div>
      )}

      {/* Add Subscription Modal Dialog */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 z-0 cursor-default" 
            onClick={() => setIsAddModalOpen(false)} 
          />
          <div className="relative z-10 w-full max-w-[440px] mx-4 rounded-2xl border border-slate-200/50 dark:border-white/[0.06] shadow-xl bg-card/95 dark:bg-zinc-900/95 p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto scrollbar-none animate-breathe">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className={cn(iconBadge.blue, "size-7.5 rounded-lg")}>
                  <PlusIcon className="size-3.5" />
                </div>
                <span className={type.sectionTitle}>{t("add_subscription")}</span>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                aria-label="Close"
              >
                <PlusIcon className="size-4 rotate-45" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex flex-col gap-4">
              <PlatformSelector />

              {selectedId === "manual" && (
                <form onSubmit={handleAdd} className="flex flex-col gap-3.5 border-t border-border/80 pt-3">
                  <div className="flex flex-col gap-1.5">
                    <label className={cn(type.label, "text-muted-foreground/90 font-medium")}>
                      {t("subscription_name_optional")}
                    </label>
                    <input
                      type="text"
                      placeholder={t("auto_generate_name")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="ui-input backdrop-blur-sm bg-slate-50/40 dark:bg-black/15 border border-slate-200/50 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/20 focus:ring-primary/15 focus:border-primary/75 shadow-xs transition-all w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={cn(type.label, "text-muted-foreground/90 font-medium")}>
                      {t("subscription_url")}
                    </label>
                    <textarea
                      placeholder={t("paste_subscription_url")}
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      rows={3}
                      className="ui-textarea backdrop-blur-sm bg-slate-50/40 dark:bg-black/15 border border-slate-200/50 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/20 focus:ring-primary/15 focus:border-primary/75 shadow-xs transition-all w-full"
                      required
                    />
                  </div>

                  <div className={cn(surface.row, "flex items-center justify-between px-3.5 py-2 mt-0.5 rounded-xl border border-slate-200/50 dark:border-white/[0.04] bg-slate-50/40 dark:bg-white/[0.01] shadow-xs backdrop-blur-sm")}>
                    <div className="flex flex-col gap-0.5">
                      <span className={type.label}>{t("auto_update")}</span>
                      <span className={type.caption}>{t("auto_update_enabled")}</span>
                    </div>
                    <Switch size="sm" checked={autoUpdate} onCheckedChange={handleAutoUpdateChange} />
                  </div>

                  {autoUpdate && (
                    <div className="flex flex-col gap-1.5">
                      <label className={cn(type.label, "text-muted-foreground/90 font-medium")}>
                        {t("update_interval")}
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(["30m", "1h", "2h", "3h", "6h", "12h", "24h", "7d"] as const).map((interval) => (
                          <button
                            key={interval}
                            type="button"
                            onClick={() => handleUpdateIntervalChange(interval)}
                            className={cn(
                              btn.pill,
                              "h-8 flex items-center justify-center font-semibold rounded-lg hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-95 backdrop-blur-sm bg-background/50 hover:bg-background/85",
                              updateInterval === interval 
                                ? "bg-gradient-to-r from-primary/95 to-indigo-600/95 border-primary/20 text-white font-bold" 
                                : btn.pillActive
                            )}
                          >
                            {interval === "30m" && t("30minutes")}
                            {interval === "1h" && t("1hour")}
                            {interval === "2h" && t("2hours")}
                            {interval === "3h" && t("3hours")}
                            {interval === "6h" && t("6hours")}
                            {interval === "12h" && t("12hours")}
                            {interval === "24h" && t("every_day")}
                            {interval === "7d" && t("every_week")}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs shadow-sm hover:shadow-md hover:shadow-primary/10 mt-1 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    {isSubmitting ? t("fetching") : t("save_subscription")}
                  </Button>
                </form>
              )}
            </div>

            {/* Collapsible Accordion Instructions */}
            <div className="border-t border-border/60 pt-3 mt-1 shrink-0">
              <details className="group outline-none">
                <summary className="flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer list-none select-none outline-none">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheckIcon className="size-3.5 text-emerald-500" />
                    <span>如何获取与配置订阅？</span>
                  </div>
                  <PlusIcon className="size-3.5 transition-transform group-open:rotate-45" />
                </summary>
                
                <div className="flex flex-col gap-4 mt-3 relative pl-1 animate-in slide-in-from-top-2 duration-200">
                  <div className="absolute left-2.5 top-2 bottom-2 w-px border-l border-dashed border-border/70 z-0 pointer-events-none" />

                  <div className="flex items-start gap-3 relative z-10">
                    <div className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 shadow-xs font-bold text-[9px] mt-0.5">
                      1
                    </div>
                    <p className={cn(type.description, "text-[11.5px] text-muted-foreground/90 leading-relaxed pt-0.5")}>
                      {t("instruction_1").replace(/^1\.\s*/, "")}
                    </p>
                  </div>

                  <div className="flex items-start gap-3 relative z-10">
                    <div className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/15 shadow-xs font-bold text-[9px] mt-0.5">
                      2
                    </div>
                    <p className={cn(type.description, "text-[11.5px] text-muted-foreground/90 leading-relaxed pt-0.5")}>
                      {t("instruction_2").replace(/^2\.\s*/, "")}
                    </p>
                  </div>

                  <div className="flex items-start gap-3 relative z-10">
                    <div className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15 shadow-xs font-bold text-[9px] mt-0.5">
                      3
                    </div>
                    <p className={cn(type.description, "text-[11.5px] text-muted-foreground/90 leading-relaxed pt-0.5")}>
                      {t("instruction_3").replace(/^3\.\s*/, "")}
                    </p>
                  </div>

                  <div className="flex items-start gap-3 relative z-10">
                    <div className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15 shadow-xs font-bold text-[9px] mt-0.5">
                      4
                    </div>
                    <p className={cn(type.description, "text-[11.5px] text-muted-foreground/90 leading-relaxed pt-0.5")}>
                      {t("instruction_4").replace(/^4\.\s*/, "")}
                    </p>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
