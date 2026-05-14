import { Package, RefreshCw, Pencil, Trash2, Clock, Loader2, ArrowUpRight, HardDrive } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Provider } from '@/types'

interface ProviderCardProps {
  provider: Provider
  isActive?: boolean
  isRefreshing?: boolean
  onSetActive: (provider: Provider) => void
  onEdit: (provider: Provider) => void
  onDelete: (id: string) => void
  onRefresh: (id: string) => void
}

function formatTrafficGB(gb?: number): string {
  if (gb == null || !Number.isFinite(gb)) return '—'
  return `${gb.toFixed(1)}`
}

function formatExpiry(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function ProviderCard({
  provider,
  isActive = false,
  isRefreshing = false,
  onSetActive,
  onEdit,
  onDelete,
  onRefresh,
}: ProviderCardProps) {
  const trafficTotal = provider.trafficTotalGB
  const trafficUsed = provider.trafficUsedGB
  const trafficRemaining =
    trafficTotal != null && trafficTotal > 0 && trafficUsed != null
      ? Math.max(0, trafficTotal - trafficUsed)
      : undefined
  const trafficPct =
    trafficTotal != null && trafficTotal > 0 && trafficUsed != null && Number.isFinite(trafficUsed)
      ? Math.min(100, Math.max(0, (trafficUsed / trafficTotal) * 100))
      : undefined

  return (
    <div
      className={cn(
        'glass rounded-2xl overflow-hidden transition-all duration-300 h-full',
        isActive ? 'ring-1 ring-primary/30 shadow-[0_0_24px_rgba(59,130,246,0.1)]' : 'hover:shadow-[var(--shadow-glass-hover)]',
      )}
    >
      {/* 顶部装饰条 */}
      <div className={cn(
        'h-1 transition-colors duration-300',
        isActive
          ? 'bg-gradient-to-r from-primary via-indigo-500 to-primary'
          : 'bg-gradient-to-r from-primary/40 via-indigo-500/30 to-transparent',
      )} />

      <div className="p-4 sm:p-5 flex flex-col gap-3.5 h-full">
        {/* 头部：名称 + 状态 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300',
              isActive ? 'bg-primary/15' : 'bg-muted/50',
            )}>
              <Package className={cn('w-4.5 h-4.5', isActive ? 'text-primary' : 'text-muted-foreground')} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate text-foreground">{provider.name}</h3>
            </div>
          </div>
          {isActive && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 shrink-0">
              使用中
            </span>
          )}
        </div>

        {/* 订阅信息行 */}
        <div className="flex items-center gap-2 flex-wrap">
          {provider.expiresAt && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/40 text-[11px] text-muted-foreground">
              <Clock className="w-3 h-3 opacity-60" />
              {formatExpiry(provider.expiresAt)}
            </span>
          )}
          {provider.autoUpdateInterval && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/8 text-primary text-[11px]">
              <RefreshCw className="w-3 h-3" />
              每 {provider.autoUpdateInterval}m
            </span>
          )}
        </div>

        {/* 流量信息 — flex-1 填充剩余空间，按钮固定在底部 */}
        <div className="flex-1 flex flex-col justify-center">
        {trafficTotal != null ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-muted-foreground">流量使用</span>
              <span className="text-xs tabular-nums">
                <span className="font-semibold text-foreground">{formatTrafficGB(trafficUsed)}</span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-muted-foreground">{formatTrafficGB(trafficTotal)} GB</span>
              </span>
            </div>
            <div className="relative h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
              <div
                className={cn(
                  'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                  trafficPct != null && trafficPct > 90
                    ? 'bg-red-400'
                    : trafficPct != null && trafficPct > 70
                      ? 'bg-yellow-400'
                      : 'bg-primary',
                )}
                style={{ width: `${trafficPct ?? 0}%` }}
              />
            </div>
            {trafficRemaining != null && (
              <p className="text-[11px] text-muted-foreground">
                剩余 <span className="font-medium text-foreground tabular-nums">{trafficRemaining.toFixed(1)} GB</span>
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
            <HardDrive className="w-3.5 h-3.5" />
            <span>暂无流量信息</span>
          </div>
        )}
        </div>

        {/* 分割线 */}
        <div className="border-t border-border/30" />

        {/* 操作区 */}
        <div className="flex items-center gap-2">
          {isActive ? (
            <button
              type="button"
              onClick={() => onRefresh(provider.id)}
              disabled={isRefreshing}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-primary/10 text-primary hover:bg-primary/15 transition-colors touch-manipulation disabled:opacity-50"
            >
              {isRefreshing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {isRefreshing ? '更新中...' : '更新订阅'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSetActive(provider)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-primary to-indigo-600 text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-[0.98] touch-manipulation"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              设为当前
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(provider)}
            className="p-2 rounded-xl hover:bg-muted/50 transition-colors touch-manipulation"
            aria-label="编辑"
          >
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(provider.id)}
            className="p-2 rounded-xl hover:bg-red-500/10 transition-colors touch-manipulation"
            aria-label="删除"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  )
}
