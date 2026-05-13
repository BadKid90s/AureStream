import { Activity, Zap, Globe, Gauge } from 'lucide-react'
import { ConnectButton } from '@/components/dashboard/ConnectButton'
import { ProviderSelect } from '@/components/dashboard/ProviderSelect'
import { NodeSelect } from '@/components/dashboard/NodeSelect'
import { StatusCard } from '@/components/dashboard/StatusCard'
import { useProxyStore } from '@/stores/appStore'

export function Dashboard() {
  const { testLatency, isTestingLatency, isConnected, currentNode, downloadSpeed } = useProxyStore()

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '0 B/s'
    const k = 1024
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k))
    return `${(bytesPerSecond / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Hero section with connect button */}
      <div className="relative pt-6 pb-10">
        {/* Decorative background blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-primary/10 via-teal-400/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col items-center">
          <ConnectButton />
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-4 text-center">
          <Globe className="w-5 h-5 mx-auto mb-2 text-primary" />
          <div className="text-2xl font-bold">{currentNode?.name || '--'}</div>
          <div className="text-xs text-muted-foreground mt-1">当前节点</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <Gauge className="w-5 h-5 mx-auto mb-2 text-primary" />
          <div className="text-2xl font-bold text-primary">
            {currentNode?.delay !== undefined ? `${currentNode.delay}ms` : '--'}
          </div>
          <div className="text-xs text-muted-foreground mt-1">延迟</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <Zap className="w-5 h-5 mx-auto mb-2 text-primary" />
          <div className="text-2xl font-bold">{isConnected ? formatSpeed(downloadSpeed) : '--'}</div>
          <div className="text-xs text-muted-foreground mt-1">下载速度</div>
        </div>
      </div>

      {/* Controls card */}
      <div className="glass rounded-2xl p-6 space-y-5">
        <ProviderSelect />
        <NodeSelect />

        <div className="pt-4 border-t border-white/10">
          <button
            onClick={testLatency}
            disabled={isTestingLatency}
            className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground font-medium text-sm hover:bg-primary/20 transition-all duration-200 disabled:opacity-50"
          >
            <Activity className="w-4 h-4 inline mr-2" />
            {isTestingLatency ? '测速中...' : '一键测速'}
          </button>
        </div>
      </div>

      {/* Status card */}
      <StatusCard />
    </div>
  )
}
