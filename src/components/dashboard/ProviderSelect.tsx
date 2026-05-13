import { useProxyStore } from '@/stores/appStore'
import { ChevronDown } from 'lucide-react'

interface ProviderSelectProps {
  onSelect?: (providerId: string) => void
}

export function ProviderSelect({ onSelect }: ProviderSelectProps) {
  const { providers, currentProvider, setCurrentProvider } = useProxyStore()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = providers.find(p => p.id === e.target.value)
    setCurrentProvider(provider)
    onSelect?.(e.target.value)
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">选择服务商</label>
      <div className="relative">
        <select
          value={currentProvider?.id || ''}
          onChange={handleChange}
          disabled={providers.length === 0}
          className="w-full h-11 pl-4 pr-10 rounded-xl bg-black/5 dark:bg-white/5 border-0 text-sm font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all disabled:opacity-50"
        >
          <option value="">请选择服务商</option>
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name} ({provider.nodeCount} 节点)
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
      {providers.length === 0 && (
        <p className="text-xs text-muted-foreground">
          暂无服务商，请先在服务商页面添加
        </p>
      )}
    </div>
  )
}
