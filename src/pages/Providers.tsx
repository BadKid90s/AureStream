import { useState } from 'react'
import { Package, Plus } from 'lucide-react'
import { ProviderCard } from '@/components/provider/ProviderCard'
import { ProviderModal } from '@/components/provider/ProviderModal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PageShell } from '@/components/layout/PageShell'
import { useProxyStore } from '@/stores/appStore'
import type { Provider, Node } from '@/types'

export function Providers() {
  const {
    providers,
    addProvider,
    updateProvider,
    deleteProvider,
    setNodes,
    currentProvider,
    setCurrentProvider,
  } = useProxyStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const deleteTarget = deleteTargetId
    ? providers.find((p) => p.id === deleteTargetId)
    : undefined

  const handleSave = (providerData: Omit<Provider, 'id' | 'nodeCount' | 'lastUpdated'>) => {
    const id = editingProvider?.id || crypto.randomUUID()
    const nodeCount =
      editingProvider?.nodeCount ?? Math.floor(Math.random() * 20) + 5
    const lastUpdated = new Date().toISOString()

    const demoTraffic: Pick<Provider, 'trafficTotalGB' | 'trafficUsedGB' | 'expiresAt'> =
      !editingProvider
        ? {
            trafficTotalGB: 200,
            trafficUsedGB: 50.3,
            expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
          }
        : {
            trafficTotalGB: editingProvider.trafficTotalGB,
            trafficUsedGB: editingProvider.trafficUsedGB,
            expiresAt: editingProvider.expiresAt,
          }

    const newProvider: Provider = {
      ...(editingProvider ?? {}),
      ...providerData,
      ...demoTraffic,
      id,
      nodeCount,
      lastUpdated,
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

  const handleDeleteRequest = (id: string) => {
    setDeleteTargetId(id)
  }

  const handleConfirmDelete = () => {
    if (deleteTargetId) {
      deleteProvider(deleteTargetId)
    }
    setDeleteTargetId(null)
  }

  const handleRefresh = async (id: string) => {
    updateProvider(id, { lastUpdated: new Date().toISOString() })
  }

  const handleAddNew = () => {
    setEditingProvider(null)
    setIsModalOpen(true)
  }

  return (
    <PageShell title="服务商管理" subtitle="添加与管理订阅服务商">
      <div className="space-y-4 sm:space-y-5 lg:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={handleAddNew}
          className="inline-flex w-full sm:w-auto shrink-0 items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-white text-xs sm:text-sm font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] sm:hover:scale-105 active:scale-95 transition-all duration-200 touch-manipulation"
        >
          <Plus className="w-4 h-4 shrink-0" />
          添加服务商
        </button>
        </div>

      {/* Providers grid */}
      {providers.length === 0 ? (
        <div className="glass rounded-xl sm:rounded-2xl p-8 sm:p-10 lg:p-12 text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center">
            <Package className="w-7 h-7 sm:w-8 sm:h-8 text-primary opacity-50" />
          </div>
          <p className="text-sm sm:text-base text-muted-foreground font-medium">暂无服务商</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">点击上方按钮添加您的第一个订阅</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              isActive={currentProvider?.id === provider.id}
              onSetActive={setCurrentProvider}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
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

      <AlertDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null)
        }}
      >
        <AlertDialogContent className="sm:max-w-[440px] glass-strong !border-white/20 !rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">删除服务商</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `确定要删除「${deleteTarget.name}」吗？相关的节点也会被删除。`
                : '确定要删除这个服务商吗？相关的节点也会被删除。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTargetId(null)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </PageShell>
  )
}
