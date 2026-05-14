import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Provider, Node } from '@/types'
import {
  addProvider as addProviderIpc,
  updateProvider as updateProviderIpc,
  deleteProvider as deleteProviderIpc,
  getProviders,
  getNodes,
  downloadSubscription,
  deleteSubscriptionFile,
  getSubscriptionPath,
  testAllNodesLatency,
} from '@/lib/api'
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

function setupAutoUpdateTimer(providerId: string, intervalMinutes: number, refreshFn: (id: string) => Promise<unknown>) {
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

  /** 从数据库加载所有 provider 和 node */
  loadProviders: () => Promise<void>
  addProvider: (provider: Provider) => Promise<void>
  updateProvider: (id: string, updates: Partial<Provider>) => Promise<void>
  deleteProvider: (id: string) => Promise<void>
  setCurrentProvider: (provider?: Provider) => void
  setCurrentNode: (node?: Node) => void
  setNodes: (nodes: Node[]) => void
  updateNodeDelay: (nodeId: string, delay: number) => void
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  setConnectStatus: (isConnected: boolean) => void
  setConnectingStatus: (isConnecting: boolean) => void
  updateSpeeds: (upload: number, download: number) => void
  testLatency: () => Promise<void>
  /** 下载订阅配置文件并更新 provider 元数据 */
  fetchAndSaveSubscription: (id: string) => Promise<{ success: boolean; error?: string }>
  /** 设置当前订阅并通知 mihomo 加载配置 */
  setCurrentSubscription: (provider?: Provider) => Promise<void>
  /** 初始化所有 provider 的自动更新定时器 */
  initAutoUpdateTimers: () => void
}

export const useProxyStore = create<ProxyStore>()((set, get) => ({
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

  loadProviders: async () => {
    try {
      const [providers, nodes] = await Promise.all([
        getProviders(),
        getNodes(),
      ])
      set({ providers, nodes })
    } catch (e) {
      console.error('Failed to load providers from DB:', e)
    }
  },

  addProvider: async (provider) => {
    await addProviderIpc(provider)
    set({ providers: [...get().providers, provider] })
    if (provider.autoUpdateInterval) {
      setupAutoUpdateTimer(provider.id, provider.autoUpdateInterval, get().fetchAndSaveSubscription)
    }
  },

  updateProvider: async (id, updates) => {
    const prev = get().providers.find(p => p.id === id)
    if (!prev) return
    const merged = { ...prev, ...updates }
    await updateProviderIpc(id, merged as Provider)
    set({
      providers: get().providers.map((p) => (p.id === id ? merged : p)),
    })
    // 更新自动更新定时器
    if (updates.autoUpdateInterval !== undefined) {
      if (updates.autoUpdateInterval) {
        setupAutoUpdateTimer(id, updates.autoUpdateInterval, get().fetchAndSaveSubscription)
      } else {
        clearAutoUpdateTimer(id)
      }
    }
    // 同步 currentProvider
    if (get().currentProvider?.id === id) {
      set({ currentProvider: merged as Provider })
    }
  },

  deleteProvider: async (id) => {
    clearAutoUpdateTimer(id)
    await deleteProviderIpc(id)
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
    const { currentProvider } = get()
    if (!currentProvider) throw new Error('请先选择一个订阅')

    set({ isConnecting: true })
    try {
      // 获取订阅配置文件路径
      const path = await getSubscriptionPath(currentProvider.id)
      if (!path) throw new Error('订阅配置文件不存在，请先更新订阅')

      // 通知 mihomo 加载配置并启动
      await reloadConfig(true, path)

      set({
        isConnecting: false,
        isConnected: true,
        connectedAt: Date.now(),
      })
    } catch (e) {
      set({ isConnecting: false })
      throw e
    }
  },

  disconnect: async () => {
    try {
      const { closeAllConnections } = await import('tauri-plugin-mihomo-api')
      await closeAllConnections()
    } catch {
      // ignore cleanup errors
    }
    set({
      isConnected: false,
      connectedAt: undefined,
      connectedIp: undefined,
      uploadSpeed: 0,
      downloadSpeed: 0,
    })
  },

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
    try {
      const results = await testAllNodesLatency()
      const delayMap = new Map(results.map(r => [r.node_id, r.delay]))
      set((state) => {
        const nodes = state.nodes.map((n) =>
          delayMap.has(n.id) ? { ...n, delay: delayMap.get(n.id) } : n
        )
        const currentNode = state.currentNode
          ? nodes.find((n) => n.id === state.currentNode!.id) ?? state.currentNode
          : undefined
        return { nodes, currentNode }
      })
    } catch (e) {
      console.error('Failed to test latency:', e)
    } finally {
      set({ isTestingLatency: false })
    }
  },

  fetchAndSaveSubscription: async (id: string) => {
    const provider = get().providers.find(p => p.id === id)
    if (!provider) return { success: false, error: '服务商不存在' }

    const refreshingIds = new Set(get().refreshingIds)
    refreshingIds.add(id)
    set({ refreshingIds })

    try {
      await downloadSubscription(id, provider.url)
      const providers = await getProviders()
      set({ providers })
      const currentProvider = get().currentProvider
      if (currentProvider?.id === id) {
        const fresh = providers.find(p => p.id === id)
        if (fresh) set({ currentProvider: fresh })
      }
      return { success: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`Failed to fetch subscription for ${id}:`, msg)
      return { success: false, error: msg }
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
}))
