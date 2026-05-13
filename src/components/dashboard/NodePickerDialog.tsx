import { Activity, ChevronRight, Server } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useProxyStore } from '@/stores/appStore'
import { cn } from '@/lib/utils'
import { getLatencyColor } from '@/types'

interface NodePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NodePickerDialog({ open, onOpenChange }: NodePickerDialogProps) {
  const {
    nodes,
    currentProvider,
    currentNode,
    setCurrentNode,
    testLatency,
    isTestingLatency,
  } = useProxyStore()

  const list = currentProvider
    ? nodes.filter((n) => n.providerId === currentProvider.id && n.enabled)
    : []

  const handlePick = (id: string) => {
    const node = list.find((n) => n.id === id)
    if (node) setCurrentNode(node)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md flex flex-col max-h-[min(85dvh,32rem)] p-0 gap-0 overflow-hidden border-border">
        <div className="border-b border-border p-6 pb-4">
          <DialogHeader className="mb-0">
            <DialogTitle>节点列表</DialogTitle>
            <DialogDescription className="text-xs">
              {currentProvider ? '选择要使用的节点' : '请先选择供应商'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">
              暂无可用节点
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {list.map((node) => {
                const active = currentNode?.id === node.id
                const delayText =
                  node.delay !== undefined ? `${node.delay}ms` : '未测速'
                return (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => handlePick(node.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all',
                        active
                          ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                          : 'hover:bg-black/5 dark:hover:bg-white/10 text-foreground'
                      )}
                    >
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Server className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{node.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {node.server}:{node.port}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'text-xs font-semibold tabular-nums shrink-0',
                          getLatencyColor(node.delay)
                        )}
                      >
                        {delayText}
                      </span>
                      {active && (
                        <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-border p-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => testLatency()}
              disabled={isTestingLatency || list.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-accent text-accent-foreground font-medium text-sm hover:bg-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Activity className="w-4 h-4" />
              {isTestingLatency ? '测速中...' : '一键测速'}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 py-2.5 rounded-xl border border-border bg-background font-medium text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-all"
            >
              完成
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
