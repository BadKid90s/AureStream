import { Package, RefreshCw, Pencil, Trash2, Wifi, WifiOff } from 'lucide-react'
import type { Provider } from '@/types'

interface ProviderCardProps {
  provider: Provider
  onEdit: (provider: Provider) => void
  onDelete: (id: string) => void
  onRefresh: (id: string) => void
}

export function ProviderCard({ provider, onEdit, onDelete, onRefresh }: ProviderCardProps) {
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
      <div className="h-1.5 bg-gradient-to-r from-primary via-teal-500 to-primary/50" />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{provider.name}</h3>
              {provider.group && (
                <span className="text-[11px] text-muted-foreground">{provider.group}</span>
              )}
            </div>
          </div>
          {/* Status badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
            provider.enabled
              ? 'bg-green-500/10 text-green-600'
              : 'bg-gray-500/10 text-gray-500'
          }`}>
            {provider.enabled ? (
              <><Wifi className="w-2.5 h-2.5" /> 启用</>
            ) : (
              <><WifiOff className="w-2.5 h-2.5" /> 禁用</>
            )}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-center">
            <div className="text-lg font-bold text-foreground">{provider.nodeCount}</div>
            <div className="text-[10px] text-muted-foreground">节点数量</div>
          </div>
          <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-center">
            <div className="text-xs font-medium text-foreground">{formatDate(provider.lastUpdated)}</div>
            <div className="text-[10px] text-muted-foreground">更新时间</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRefresh(provider.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            更新订阅
          </button>
          <button
            onClick={() => onEdit(provider)}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={() => onDelete(provider.id)}
            className="p-2 rounded-xl hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  )
}
