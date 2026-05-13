import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { GitBranch } from 'lucide-react'
import {
  ConnectionInfoCard,
  CONNECTION_CARD_STRETCH_CLASS as STRETCH_CARD,
} from '@/components/dashboard/ConnectionInfoCard'
import { MiniThroughputSpark } from '@/components/dashboard/MiniThroughputSpark'
import { NodePickerDialog } from '@/components/dashboard/NodePickerDialog'
import { TrafficUsageRing } from '@/components/dashboard/TrafficUsageRing'
import { PageShell } from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { useProxyStore } from '@/stores/appStore'

export interface DashboardProps {
  /** 无当前供应商时跳转「服务商」页 */
  onOpenProviders?: () => void
}

type ProxyMode = '规则' | '全局' | '直连'

const PROXY_MODES: ProxyMode[] = ['规则', '全局', '直连']

const SERIES_LEN = 48

/** 双栏主网格：与左侧 `CONNECTION_CARD_STRETCH_CLASS` 卡片配合等高拉伸 */
const DASHBOARD_TWO_COLUMN_GRID_CLASS =
  'relative grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-2 lg:items-stretch lg:gap-8'

function formatSpeedBytes(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 KB/s'
  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.min(
    Math.floor(Math.log(bytesPerSecond) / Math.log(k)),
    sizes.length - 1
  )
  const v = bytesPerSecond / Math.pow(k, i)
  const decimals = i >= 2 ? 1 : i === 1 ? 1 : 0
  return `${v.toFixed(decimals)} ${sizes[i]}`
}

function formatExpiry(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatTrafficGB(gb?: number): string {
  if (gb == null || !Number.isFinite(gb)) return '—'
  return `${gb.toFixed(1)} GB`
}

function emptySeries(): number[] {
  return Array.from({ length: SERIES_LEN }, () => 0)
}

export function Dashboard({ onOpenProviders }: DashboardProps) {
  const {
    nodes,
    currentProvider,
    currentNode,
    isConnected,
    connectedAt,
    uploadSpeed,
    downloadSpeed,
    updateSpeeds,
  } = useProxyStore()

  const [nodeDialogOpen, setNodeDialogOpen] = useState(false)
  const [proxyMode, setProxyMode] = useState<ProxyMode>('规则')
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [uploadSeries, setUploadSeries] = useState(emptySeries)
  const [downloadSeries, setDownloadSeries] = useState(emptySeries)

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!isConnected) return
    const sample = () => {
      const dl = (Math.random() * 42 + 18) * 1024
      const ul = (Math.random() * 32 + 8) * 1024
      updateSpeeds(ul, dl)
    }
    sample()
    const id = window.setInterval(sample, 1300)
    return () => clearInterval(id)
  }, [isConnected, updateSpeeds])

  useLayoutEffect(() => {
    setUploadSeries(emptySeries())
    setDownloadSeries(emptySeries())
  }, [isConnected])

  useEffect(() => {
    if (!isConnected) return
    setUploadSeries((prev) => [...prev.slice(1), uploadSpeed])
    setDownloadSeries((prev) => [...prev.slice(1), downloadSpeed])
  }, [isConnected, uploadSpeed, downloadSpeed])

  useEffect(() => {
    if (isConnected) return
    const id = window.setInterval(() => {
      const t = Date.now() / 4500
      const base = (Math.sin(t) * 0.5 + 0.5) * 4096
      setUploadSeries((prev) => [...prev.slice(1), base * 0.35])
      setDownloadSeries((prev) => [...prev.slice(1), base * 0.52])
    }, 2200)
    return () => clearInterval(id)
  }, [isConnected])

  const availableNodes = useMemo(() => {
    if (!currentProvider) return []
    return nodes.filter((n) => n.providerId === currentProvider.id && n.enabled)
  }, [nodes, currentProvider])

  const canConnect = Boolean(currentProvider) && availableNodes.length > 0

  const trafficTotal = currentProvider?.trafficTotalGB
  const trafficUsed = currentProvider?.trafficUsedGB
  const trafficRemaining =
    trafficTotal != null &&
    trafficTotal > 0 &&
    trafficUsed != null &&
    Number.isFinite(trafficUsed)
      ? Math.max(0, trafficTotal - trafficUsed)
      : undefined
  const trafficPct =
    trafficTotal != null &&
    trafficTotal > 0 &&
    trafficUsed != null &&
    Number.isFinite(trafficUsed)
      ? Math.min(100, Math.max(0, (trafficUsed / trafficTotal) * 100))
      : undefined

  const subscriptionName =
    currentProvider?.name?.trim() ||
    currentProvider?.group?.trim() ||
    '—'

  const tierBadgeText =
    currentProvider?.group?.trim() &&
    currentProvider?.name?.trim() &&
    currentProvider.group.trim() !== currentProvider.name.trim()
      ? currentProvider.group.trim()
      : null

  return (
    <PageShell fillHeight className="max-w-6xl" title="首页" subtitle="连接状态与订阅概览">
      <div className="relative flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto lg:gap-6">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] opacity-[0.07] dark:opacity-[0.12] lg:h-[45%]"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 80% 70% at 50% 100%, color-mix(in srgb, var(--color-primary) 16%, transparent) 0%, transparent 65%)',
          }}
        />

        <div className={DASHBOARD_TWO_COLUMN_GRID_CLASS}>
          {/* 连接信息 */}
          <section className="flex min-h-0 w-full flex-col">
            <ConnectionInfoCard
              isConnected={isConnected}
              canConnect={canConnect}
              currentProvider={currentProvider}
              availableNodes={availableNodes}
              currentNode={currentNode}
              connectedAt={connectedAt}
              nowTick={nowTick}
              downloadSpeed={downloadSpeed}
              uploadSpeed={uploadSpeed}
              onOpenProviders={onOpenProviders}
              onOpenNodePicker={() => setNodeDialogOpen(true)}
            />
          </section>

          {/* 订阅 + 代理模式 + 吞吐（单 Card + Separator） */}
          <section className="flex min-h-0 w-full flex-col">
            <Card className={STRETCH_CARD}>
              <CardHeader className="shrink-0">
                <div className="flex flex-col gap-2">
                  <CardTitle className="text-base">订阅与网络</CardTitle>
                  <CardDescription>套餐用量、代理模式与实时吞吐</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col gap-6 pb-4">
                <div className="flex flex-col gap-4">
                  <CardTitle className="sr-only">订阅信息</CardTitle>
                  {currentProvider ? (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-end lg:gap-8">
                      <div className="flex min-w-0 flex-col gap-4">
                        {tierBadgeText ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{tierBadgeText}</Badge>
                          </div>
                        ) : null}
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] text-muted-foreground">订阅名称</span>
                          <p className="text-sm font-semibold leading-snug text-foreground">
                            {subscriptionName}
                          </p>
                        </div>
                        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="flex flex-col gap-1 rounded-xl bg-muted/40 px-3 py-2.5">
                            <dt className="text-[11px] text-muted-foreground">到期时间</dt>
                            <dd className="text-sm font-semibold tabular-nums text-foreground">
                              {formatExpiry(currentProvider.expiresAt)}
                            </dd>
                          </div>
                          <div className="flex flex-col gap-1 rounded-xl bg-muted/40 px-3 py-2.5">
                            <dt className="text-[11px] text-muted-foreground">总流量</dt>
                            <dd className="text-sm font-semibold tabular-nums text-foreground">
                              {formatTrafficGB(trafficTotal)}
                            </dd>
                          </div>
                          <div className="flex flex-col gap-1 rounded-xl bg-muted/40 px-3 py-2.5">
                            <dt className="text-[11px] text-muted-foreground">已用流量</dt>
                            <dd className="text-sm font-semibold tabular-nums text-foreground">
                              {formatTrafficGB(trafficUsed)}
                            </dd>
                          </div>
                          <div className="flex flex-col gap-1 rounded-xl bg-muted/40 px-3 py-2.5">
                            <dt className="text-[11px] text-muted-foreground">剩余</dt>
                            <dd className="text-sm font-semibold tabular-nums text-foreground">
                              {trafficRemaining != null
                                ? `${trafficRemaining.toFixed(1)} GB`
                                : '—'}
                            </dd>
                          </div>
                        </dl>
                      </div>
                      <div className="flex w-full flex-col items-stretch gap-4">
                        {trafficPct != null ? (
                          <>
                            <TrafficUsageRing pct={trafficPct} caption="用量占比" className="self-center" />
                            <div className="flex w-full max-w-xs flex-col gap-2 self-center">
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>已用 / 总额度</span>
                                <span className="font-medium tabular-nums text-foreground">
                                  {trafficPct.toFixed(0)}%
                                </span>
                              </div>
                              <Progress value={trafficPct} aria-label="流量使用进度" />
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-8 text-center">
                            <p className="text-sm font-medium text-foreground">暂无用量数据</p>
                            <p className="text-xs text-muted-foreground">
                              导入或同步订阅后即可显示环形图与进度条
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">未选择</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        选择服务商后在此查看套餐、到期日与流量可视化。
                      </p>
                      {onOpenProviders ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full rounded-xl sm:w-auto"
                          onClick={onOpenProviders}
                        >
                          选择服务商
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>

                <Separator />

                {/* 代理模式 */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <GitBranch className="text-primary" strokeWidth={1.75} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-base font-semibold leading-none tracking-tight text-foreground">
                        代理模式
                      </p>
                      <p className="text-sm text-muted-foreground">规则 / 全局 / 直连</p>
                    </div>
                  </div>
                  <ToggleGroup
                    type="single"
                    value={proxyMode}
                    onValueChange={(v: string) => {
                      if (v) setProxyMode(v as ProxyMode)
                    }}
                    className="grid w-full grid-cols-3 gap-2"
                    aria-label="代理模式"
                  >
                    {PROXY_MODES.map((mode) => (
                      <ToggleGroupItem
                        key={mode}
                        value={mode}
                        className={cn(
                          'h-9 flex-1 whitespace-nowrap rounded-lg px-2 text-[11px] sm:text-xs',
                          'focus-visible:z-10'
                        )}
                        aria-pressed={proxyMode === mode}
                      >
                        {mode}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                <Separator />

                {/* 网络吞吐 */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-base font-semibold leading-none tracking-tight text-foreground">
                      网络吞吐
                    </p>
                    <p className="text-sm text-muted-foreground">
                      模拟时间序列（连接时随速率刷新）
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <MiniThroughputSpark
                      label="上传"
                      speedText={formatSpeedBytes(uploadSpeed)}
                      values={uploadSeries}
                      tone="primary"
                    />
                    <MiniThroughputSpark
                      label="下载"
                      speedText={formatSpeedBytes(downloadSpeed)}
                      values={downloadSeries}
                      tone="accent"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        <NodePickerDialog open={nodeDialogOpen} onOpenChange={setNodeDialogOpen} />
      </div>
    </PageShell>
  )
}
