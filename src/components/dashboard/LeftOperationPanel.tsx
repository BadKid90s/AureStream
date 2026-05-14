import { ChevronRight, ArrowLeftRight, Globe, Zap } from 'lucide-react'
import { ConnectButton } from '@/components/dashboard/ConnectButton'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { getLatencyColor } from '@/types'
import type { Node } from '@/types'

type ProxyMode = '规则' | '全局' | '直连'

const PROXY_OPTIONS: { mode: ProxyMode; icon: typeof ArrowLeftRight; desc: string }[] = [
  { mode: '规则', icon: ArrowLeftRight, desc: '根据规则自动分流' },
  { mode: '全局', icon: Globe, desc: '全部流量通过代理' },
  { mode: '直连', icon: Zap, desc: '不经过代理直连' },
]

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 KB/s'
  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.min(Math.floor(Math.log(bytesPerSecond) / Math.log(k)), sizes.length - 1)
  const v = bytesPerSecond / Math.pow(k, i)
  return `${v.toFixed(1)} ${sizes[i]}`
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

function parseNodeLabels(node?: Node): {
  flag: string
  primary: string
  secondary: string
} {
  if (!node?.name)
    return { flag: '🌐', primary: '未选择', secondary: '' }
  const parts = node.name.split(/·|•/).map((p) => p.trim()).filter(Boolean)
  const primary = parts[0] ?? node.name
  const secondary = parts.slice(1, 3).join(' · ') || node.server
  const flagMap: Record<string, string> = {
    中国: '🇨🇳', 香港: '🇭🇰', 台湾: '🇹🇼', 日本: '🇯🇵',
    东京: '🇯🇵', 新加坡: '🇸🇬', 美国: '🇺🇸', 英国: '🇬🇧',
    韩国: '🇰🇷', 德国: '🇩🇪', 法国: '🇫🇷',
  }
  const flag = flagMap[primary] ?? '🌐'
  return { flag, primary, secondary }
}

export function LeftOperationPanel({
  isConnected,
  canConnect,
  connectedAt,
  nowTick,
  downloadSpeed,
  uploadSpeed,
  currentNode,
  proxyMode,
  onProxyModeChange,
  onOpenNodePicker,
}: {
  isConnected: boolean
  canConnect: boolean
  connectedAt?: number
  nowTick: number
  downloadSpeed: number
  uploadSpeed: number
  currentNode?: Node
  proxyMode: ProxyMode
  onProxyModeChange: (mode: ProxyMode) => void
  onOpenNodePicker: () => void
}) {
  const elapsedSec =
    isConnected && connectedAt
      ? Math.max(0, Math.floor((nowTick - connectedAt) / 1000))
      : 0

  const nodeLine = parseNodeLabels(currentNode)

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 sm:gap-4 px-4">
      {/* 区域 1：连接时长 — 固定高度，未连接时透明 */}
      <div className="flex h-[3rem] shrink-0 items-center justify-center">
        <p
          className={cn(
            'text-2xl sm:text-3xl lg:text-[2.5rem] font-semibold tabular-nums leading-none tracking-tight text-foreground transition-opacity duration-300',
            isConnected ? 'opacity-100' : 'opacity-0',
          )}
        >
          {formatDuration(elapsedSec)}
        </p>
      </div>

      {/* 区域 2：连接按钮 + 文字 — 固定高度，始终可见 */}
      <div className="flex h-[11rem] sm:h-[13rem] shrink-0 items-center justify-center mt-8 sm:mt-10">
        <ConnectButton disabled={!canConnect} size="sm" className="sm:hidden" proxyMode={isConnected ? proxyMode : undefined} />
        <ConnectButton disabled={!canConnect} size="default" className="hidden sm:flex" proxyMode={isConnected ? proxyMode : undefined} />
      </div>

      {/* 区域 3：网速 — 固定高度，未连接时透明 */}
      <div className="flex h-[2.5rem] shrink-0 items-center justify-center ">
        <div
          className={cn(
            'inline-flex items-center gap-2.5 sm:gap-3 rounded-full border border-border/70 bg-muted/45 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm tabular-nums text-muted-foreground transition-opacity duration-300',
            isConnected ? 'opacity-100' : 'opacity-0',
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="text-foreground/70" aria-hidden>↓</span>
            <span className="font-medium text-foreground">{formatSpeed(downloadSpeed)}</span>
          </span>
          <Separator orientation="vertical" className="h-4 bg-border/80" decorative />
          <span className="inline-flex items-center gap-1.5">
            <span className="text-foreground/70" aria-hidden>↑</span>
            <span className="font-medium text-foreground">{formatSpeed(uploadSpeed)}</span>
          </span>
        </div>
      </div>

      {/* 区域 4：代理模式 ↔ 节点信息 — 固定高度，起始位置一致 */}
      <div className="flex shrink-0 items-center justify-center h-[7rem] w-full">
        {isConnected ? (
          <Button
            type="button"
            variant="outline"
            onClick={onOpenNodePicker}
            className="animate-fade-in-up group flex w-full max-w-[28rem] items-center rounded-full px-4 sm:px-5 h-14 sm:h-16 text-left font-normal"
          >
            <span className="flex w-full items-center gap-3 min-w-0">
              <span className="flex items-center gap-2.5 shrink-0 min-w-0">
                <span className="text-xl leading-none shrink-0" aria-hidden>
                  {nodeLine.flag}
                </span>
                <span className="flex flex-col gap-0.5 min-w-0 overflow-hidden">
                  <span className="text-sm font-semibold text-foreground truncate leading-tight">
                    {nodeLine.primary}
                  </span>
                  {nodeLine.secondary ? (
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate leading-tight">
                      · {nodeLine.secondary}
                    </span>
                  ) : null}
                </span>
              </span>
            </span>

            <span className="flex items-center gap-2.5 shrink-0 ml-auto pl-4">
              {currentNode?.delay != null ? (
                <span className={cn('text-xs font-semibold tabular-nums', getLatencyColor(currentNode.delay))}>
                  {currentNode.delay} ms
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">未测速</span>
              )}
              <ChevronRight
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                aria-hidden
              />
            </span>
          </Button>
        ) : (
          <div className="animate-fade-in-up flex w-full flex-col gap-2 px-2">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {PROXY_OPTIONS.map(({ mode, icon: Icon}) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onProxyModeChange(mode)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 transition-all duration-200',
                    'cursor-pointer',
                    proxyMode === mode
                      ? 'bg-primary/12 text-foreground ring-1 ring-primary/30'
                      : 'bg-muted/35 text-muted-foreground hover:bg-muted/55 hover:text-foreground',
                  )}
                  aria-pressed={proxyMode === mode}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                  <span className="text-xs font-semibold truncate">{mode}</span>

                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
