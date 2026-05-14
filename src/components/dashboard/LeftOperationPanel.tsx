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
  const decimals = i >= 2 ? 1 : 1
  return `${v.toFixed(decimals)} ${sizes[i]}`
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
  const stateKey = isConnected ? 'connected' : 'disconnected'

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
      {/* 时长 — 仅已连接 */}
      <div className="flex shrink-0 flex-col items-center justify-center h-[3rem]" key={`duration-${stateKey}`}>
        {isConnected ? (
          <p className="animate-fade-in-down text-[2.5rem] font-semibold tabular-nums leading-none tracking-tight text-foreground">
            {formatDuration(elapsedSec)}
          </p>
        ) : (
          <div aria-hidden className="h-[3rem]" />
        )}
      </div>

      {/* ConnectButton — 始终可见，同一元素 */}
      <div className="flex shrink-0 items-center justify-center">
        <ConnectButton disabled={!canConnect} size="lg" proxyMode={isConnected ? proxyMode : undefined} />
      </div>

      {/* 速率胶囊 — 仅已连接 */}
      <div className="flex shrink-0 flex-col items-center justify-center h-[2.25rem] my-6" key={`speed-${stateKey}`}>
        {isConnected ? (
          <div className="animate-fade-in-up inline-flex items-center gap-3 rounded-full border border-border/70 bg-muted/45 px-4 py-2 text-sm tabular-nums text-muted-foreground">
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
        ) : (
          <div aria-hidden className="h-[2.25rem]" />
        )}
      </div>

      {/* 底部槽位：代理模式 ↔ 节点入口 — 固定高度防抖 */}
      <div className="flex shrink-0 items-center justify-center h-[8rem]" key={`bottom-${stateKey}`}>
        {isConnected ? (
          <Button
            type="button"
            variant="outline"
            onClick={onOpenNodePicker}
            className="animate-fade-in-up group flex w-[28rem] items-center rounded-full px-6 h-20 text-left font-normal"
          >
            <span className="flex w-full items-center gap-3 min-w-0">
              {/* 旗帜 + 名称 — 占 60% */}
              <span className="flex items-center gap-2.5 w-[60%] shrink-0">
                <span className="text-xl leading-none shrink-0" aria-hidden>
                  {nodeLine.flag}
                </span>
                <span className="flex items-baseline gap-1.5 min-w-0 overflow-hidden">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {nodeLine.primary}
                  </span>
                  {nodeLine.secondary ? (
                    <span className="text-[11px] text-muted-foreground truncate">
                      · {nodeLine.secondary}
                    </span>
                  ) : null}
                </span>
              </span>

              {/* 分隔 */}
              <span className="shrink-0 text-muted-foreground/30" aria-hidden>|</span>

              {/* 类型 */}
              <span className="text-[11px] text-muted-foreground shrink-0 uppercase tracking-wide">
                {currentNode?.type ?? '—'}
              </span>
            </span>

            {/* 延迟 + 箭头 — 垂直居中在胶囊中 */}
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
          <div className="flex animate-fade-in-up w-full flex-col gap-3 px-2">
            <span className="text-xs font-semibold text-muted-foreground/80 tracking-wide text-center">代理模式</span>
            <div className="grid grid-cols-3 gap-5">
              {PROXY_OPTIONS.map(({ mode, icon: Icon, desc }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onProxyModeChange(mode)}
                  className={cn(
                    'flex items-center justify-center gap-3 rounded-xl px-4 py-3 transition-all duration-200',
                    'cursor-pointer',
                    proxyMode === mode
                      ? 'bg-primary/12 text-foreground ring-1 ring-primary/30'
                      : 'bg-muted/35 text-muted-foreground hover:bg-muted/55 hover:text-foreground',
                  )}
                  aria-pressed={proxyMode === mode}
                >
                  <Icon className="size-5 shrink-0" strokeWidth={1.75} />
                  <div className="flex flex-col items-center text-center min-w-0">
                    <span className="text-sm font-semibold">{mode}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
