import { Package, RefreshCw, Pencil, Trash2, Wifi, WifiOff } from 'lucide-react'
import type { Provider } from '@/types'

interface ProviderCardProps {
  provider: Provider
  isActive?: boolean
  onSetActive: (provider: Provider) => void
  onEdit: (provider: Provider) => void
  onDelete: (id: string) => void
  onRefresh: (id: string) => void
}

export function ProviderCard({
  provider,
  isActive = false,
  onSetActive,
  onEdit,
  onDelete,
  onRefresh,
}: ProviderCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="glass rounded-2xl overflow-hidden group transition-all duration-300 hover:scale-[1.02]">
      {/* Colored top bar */}
      <div className="h-1.5 bg-gradient-to-r from-primary via-indigo-500 to-primary/50" />

      <div className="p-3.5 sm:p-4 md:p-5 space-y-3 sm:space-y-3.5 md:space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 min-[380px]:flex-row min-[380px]:items-start min-[380px]:justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Package className="w-[0.9375rem] h-[0.9375rem] sm:w-4 sm:h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-xs sm:text-sm truncate">{provider.name}</h3>
              {provider.group && (
                <span className="text-[10px] sm:text-[11px] text-muted-foreground block truncate">
                  {provider.group}
                </span>
              )}
            </div>
          </div>
          {/* Status badge */}
          <span
            className={`inline-flex shrink-0 self-start min-[380px]:self-auto items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium ${
              provider.enabled
                ? 'bg-primary/10 text-primary'
                : 'bg-gray-500/10 text-gray-500'
            }`}
          >
            {provider.enabled ? (
              <><Wifi className="w-2.5 h-2.5" /> 启用</>
            ) : (
              <><WifiOff className="w-2.5 h-2.5" /> 禁用</>
            )}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-black/5 dark:bg-white/5 text-center min-w-0">
            <div className="text-base sm:text-lg font-bold text-foreground tabular-nums">
              {provider.nodeCount}
            </div>
            <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">节点数量</div>
          </div>
          <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-black/5 dark:bg-white/5 text-center min-w-0">
            <div className="text-[10px] sm:text-xs font-medium text-foreground leading-tight break-words px-0.5">
              {formatDate(provider.lastUpdated)}
            </div>
            <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">更新时间</div>
          </div>
        </div>

        <div className="pt-0.5">
          {isActive ? (
            <div className="w-full rounded-xl border border-primary/35 bg-primary/10 py-2.5 text-center text-[11px] sm:text-xs font-semibold text-primary">
              当前订阅 · 使用中
            </div>
          ) : (
            <button
              type="button"
              disabled={!provider.enabled}
              onClick={() => onSetActive(provider)}
              className="w-full rounded-xl bg-gradient-to-r from-primary to-indigo-600 py-2.5 text-[11px] sm:text-xs font-semibold text-white shadow-md shadow-primary/25 transition-all hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 touch-manipulation"
            >
              设为当前订阅
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col min-[340px]:flex-row items-stretch min-[340px]:items-center gap-2">
          <button
            type="button"
            onClick={() => onRefresh(provider.id)}
            className="flex min-[340px]:flex-1 w-full items-center justify-center gap-1.5 py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors touch-manipulation"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            更新订阅
          </button>
          <div className="flex items-center justify-center gap-2 min-[340px]:justify-end shrink-0">
            <button
              type="button"
              onClick={() => onEdit(provider)}
              className="flex-1 min-[340px]:flex-none p-2 rounded-lg sm:rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors touch-manipulation inline-flex justify-center"
              aria-label="编辑服务商"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(provider.id)}
              className="flex-1 min-[340px]:flex-none p-2 rounded-lg sm:rounded-xl hover:bg-red-500/10 transition-colors touch-manipulation inline-flex justify-center"
              aria-label="删除服务商"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
