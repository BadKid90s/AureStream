import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Provider, Node } from '@/types'
import { downloadSubscription, deleteSubscriptionFile, getSubscriptionPath } from '@/lib/api'
import { reloadConfig } from 'tauri-plugin-mihomo-api'

interface AppStore {
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
  toggleTheme: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
    }),
    {
      name: 'aureproxy-app-store',
    }
  )
)

// --- Auto-update timers (not persisted, managed in memory) ---
const autoUpdateTimers = new Map<string, ReturnType<typeof setInterval>>()

function clearAutoUpdateTimer(providerId: string) {
  const timer = autoUpdateTimers.get(providerId)
  if (timer) {
    clearInterval(timer)
    autoUpdateTimers.delete(providerId)
  }
}

function setupAutoUpdateTimer(providerId: string, intervalMinutes: number, refreshFn: (id: string) => Promise<void>) {
  clearAutoUpdateTimer(providerId)
  const timer = setInterval(() => {
    refreshFn(providerId)
  }, intervalMinutes * 60 * 1000)
  autoUpdateTimers.set(providerId, timer)
}

interface ProxyStore {
  providers: Provider[]
  nodes: Node[]
  currentProvider?: Provider
  currentNode?: Node
  isConnected: boolean
  isConnecting: boolean
  connectedAt?: number
  connectedIp?: string
  uploadSpeed: number
  downloadSpeed: number
  isTestingLatency: boolean
  /** 正在更新的 provider ID 集合 */
  refreshingIds: Set<string>

  addProvider: (provider: Provider) => void
  updateProvider: (id: string, updates: Partial<Provider>) => void
  deleteProvider: (id: string) => void
  setCurrentProvider: (provider?: Provider) => void
  setCurrentNode: (node?: Node) => void
  setNodes: (nodes: Node[]) => void
  updateNodeDelay: (nodeId: string, delay: number) => void
  connect: () => Promise<void>
  disconnect: () => void
  setConnectStatus: (isConnected: boolean) => void
  setConnectingStatus: (isConnecting: boolean) => void
  updateSpeeds: (upload: number, download: number) => void
  testLatency: () => Promise<void>
  /** 下载订阅配置文件并更新 provider 元数据 */
  fetchAndSaveSubscription: (id: string) => Promise<void>
  /** 设置当前订阅并通知 mihomo 加载配置 */
  setCurrentSubscription: (provider?: Provider) => Promise<void>
  /** 初始化所有 provider 的自动更新定时器 */
  initAutoUpdateTimers: () => void
}

export const useProxyStore = create<ProxyStore>()(
  persist(
    (set, get) => ({
      providers: [],
      nodes: [],
      currentProvider: undefined,
      currentNode: undefined,
      isConnected: false,
      isConnecting: false,
      connectedAt: undefined,
      connectedIp: undefined,
      uploadSpeed: 0,
      downloadSpeed: 0,
      isTestingLatency: false,
      refreshingIds: new Set<string>(),

      addProvider: (provider) => {
        set({ providers: [...get().providers, provider] })
        if (provider.autoUpdateInterval) {
          setupAutoUpdateTimer(provider.id, provider.autoUpdateInterval, get().fetchAndSaveSubscription)
        }
      },

      updateProvider: (id, updates) => {
        const prev = get().providers.find(p => p.id === id)
        set({
          providers: get().providers.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })
        // 更新自动更新定时器
        if (prev && updates.autoUpdateInterval !== undefined) {
          if (updates.autoUpdateInterval) {
            setupAutoUpdateTimer(id, updates.autoUpdateInterval, get().fetchAndSaveSubscription)
          } else {
            clearAutoUpdateTimer(id)
          }
        }
        // 同步 currentProvider
        if (get().currentProvider?.id === id) {
          set({ currentProvider: { ...get().currentProvider!, ...updates } })
        }
      },

      deleteProvider: (id) => {
        clearAutoUpdateTimer(id)
        const newProviders = get().providers.filter((p) => p.id !== id)
        let currentProvider = get().currentProvider
        if (currentProvider?.id === id) currentProvider = undefined
        set({ providers: newProviders, currentProvider })
        // 删除订阅文件
        deleteSubscriptionFile(id).catch(() => {})
      },

      setCurrentProvider: (provider) => {
        const cur = get().currentNode
        const nextNode =
          provider && cur?.providerId === provider.id ? cur : undefined
        set({
          currentProvider: provider,
          currentNode: nextNode,
        })
      },

      setCurrentNode: (node) => set({ currentNode: node }),

      setNodes: (nodes) => set({ nodes }),

      updateNodeDelay: (nodeId, delay) =>
        set((state) => {
          const nodes = state.nodes.map((n) =>
            n.id === nodeId ? { ...n, delay } : n
          )
          const currentNode =
            state.currentNode?.id === nodeId
              ? { ...state.currentNode, delay }
              : state.currentNode
          return { nodes, currentNode }
        }),

      connect: async () => {
        const { currentProvider, nodes, currentNode } = get()
        if (!currentProvider) return
        const pool = nodes.filter(
          (n) => n.providerId === currentProvider.id && n.enabled
        )
        if (pool.length === 0) return

        let node = currentNode
        if (!node || node.providerId !== currentProvider.id) {
          node = pool[0]
          set({ currentNode: node })
        }

        set({ isConnecting: true })
        await new Promise((resolve) => setTimeout(resolve, 1000))
        const mockOctet = () => Math.floor(Math.random() * 220) + 12
        const connectedIp = `${mockOctet()}.${mockOctet()}.${mockOctet()}.${mockOctet()}`
        set({
          isConnecting: false,
          isConnected: true,
          connectedAt: Date.now(),
          connectedIp,
        })
      },

      disconnect: () =>
        set({
          isConnected: false,
          connectedAt: undefined,
          connectedIp: undefined,
          uploadSpeed: 0,
          downloadSpeed: 0,
        }),

      setConnectStatus: (isConnected) =>
        set((s) => ({
          isConnected,
          connectedAt: isConnected ? s.connectedAt ?? Date.now() : undefined,
          connectedIp: isConnected ? s.connectedIp : undefined,
          ...(!isConnected ? { uploadSpeed: 0, downloadSpeed: 0 } : {}),
        })),

      setConnectingStatus: (isConnecting) => set({ isConnecting }),

      updateSpeeds: (upload, download) => set({ uploadSpeed: upload, downloadSpeed: download }),

      testLatency: async () => {
        set({ isTestingLatency: true })
        const { nodes, currentProvider } = get()
        const target = currentProvider
          ? nodes.filter((n) => n.providerId === currentProvider.id)
          : nodes
        for (const node of target) {
          const delay = Math.floor(Math.random() * 400) + 20
          await new Promise((resolve) => setTimeout(resolve, 100))
          set({
            nodes: get().nodes.map((n) => (n.id === node.id ? { ...n, delay } : n)),
          })
        }
        set({ isTestingLatency: false })
        const s = get()
        if (s.currentNode) {
          const fresh = s.nodes.find((n) => n.id === s.currentNode!.id)
          if (fresh) set({ currentNode: fresh })
        }
      },

      fetchAndSaveSubscription: async (id: string) => {
        const provider = get().providers.find(p => p.id === id)
        if (!provider) return

        const refreshingIds = new Set(get().refreshingIds)
        refreshingIds.add(id)
        set({ refreshingIds })

        try {
          await downloadSubscription(id, provider.url)
          set({
            providers: get().providers.map(p =>
              p.id === id
                ? { ...p, lastUpdated: new Date().toISOString() }
                : p
            ),
          })
          // 同步 currentProvider
          if (get().currentProvider?.id === id) {
            set({
              currentProvider: {
                ...get().currentProvider!,
                lastUpdated: new Date().toISOString(),
              },
            })
          }
        } catch (e) {
          console.error(`Failed to fetch subscription for ${id}:`, e)
        } finally {
          const ids = new Set(get().refreshingIds)
          ids.delete(id)
          set({ refreshingIds: ids })
        }
      },

      setCurrentSubscription: async (provider?: Provider) => {
        set({ currentProvider: provider, currentNode: undefined })
        if (!provider) return

        // 确保订阅文件存在，然后通知 mihomo 加载
        try {
          const path = await getSubscriptionPath(provider.id)
          if (path) {
            await reloadConfig(true, path)
          }
        } catch (e) {
          console.error('Failed to reload mihomo config:', e)
        }
      },

      initAutoUpdateTimers: () => {
        // 清除所有旧定时器
        for (const id of autoUpdateTimers.keys()) {
          clearAutoUpdateTimer(id)
        }
        // 为每个有 autoUpdateInterval 的 provider 设置定时器
        for (const provider of get().providers) {
          if (provider.autoUpdateInterval) {
            setupAutoUpdateTimer(
              provider.id,
              provider.autoUpdateInterval,
              get().fetchAndSaveSubscription
            )
          }
        }
      },
    }),
    {
      name: 'aureproxy-proxy-store',
      // 不持久化 refreshingIds（运行时状态）
      partialize: (state) => {
        const { refreshingIds, ...rest } = state
        return rest
      },
    }
  )
)
