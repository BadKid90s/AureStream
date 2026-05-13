import { useState } from 'react'
import { Package, Plus, Globe } from 'lucide-react'
import { ProviderCard } from '@/components/provider/ProviderCard'
import { ProviderModal } from '@/components/provider/ProviderModal'
import { useProxyStore } from '@/stores/appStore'
import type { Provider, Node } from '@/types'

export function Providers() {
  const { providers, addProvider, updateProvider, deleteProvider, setNodes } = useProxyStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)

  const handleSave = (providerData: Omit<Provider, 'id' | 'nodeCount' | 'lastUpdated'>) => {
    const newProvider: Provider = {
      ...providerData,
      id: editingProvider?.id || crypto.randomUUID(),
      nodeCount: editingProvider?.nodeCount || Math.floor(Math.random() * 20) + 5,
      lastUpdated: new Date().toISOString(),
    }

    if (editingProvider) {
      updateProvider(editingProvider.id, newProvider)
    } else {
      addProvider(newProvider)

      const mockNodes: Node[] = Array.from({ length: newProvider.nodeCount }, (_, i) => ({
        id: crypto.randomUUID(),
        name: `节点 ${i + 1}`,
        providerId: newProvider.id,
        type: 'http',
        server: `server${i + 1}.example.com`,
        port: 8080 + i,
        enabled: true,
      }))

      setNodes([...useProxyStore.getState().nodes, ...mockNodes])
    }

    setEditingProvider(null)
  }

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个服务商吗？相关的节点也会被删除。')) {
      deleteProvider(id)
    }
  }

  const handleRefresh = async (id: string) => {
    updateProvider(id, { lastUpdated: new Date().toISOString() })
  }

  const handleAddNew = () => {
    setEditingProvider(null)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">服务商管理</h1>
            <p className="text-sm text-muted-foreground">管理您的订阅服务商和节点</p>
          </div>
        </div>
        <button
          onClick={handleAddNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-teal-600 text-white text-sm font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          添加服务商
        </button>
      </div>

      {/* Providers grid */}
      {providers.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Package className="w-8 h-8 text-primary opacity-50" />
          </div>
          <p className="text-muted-foreground font-medium">暂无服务商</p>
          <p className="text-sm text-muted-foreground mt-1">点击上方按钮添加您的第一个订阅</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      )}

      <ProviderModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSave={handleSave}
        editingProvider={editingProvider}
      />
    </div>
  )
}
