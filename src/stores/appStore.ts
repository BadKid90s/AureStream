import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Provider, Node } from '@/types'
import {
  addProvider as addProviderIpc,
  updateProvider as updateProviderIpc,
  deleteProvider as deleteProviderIpc,
  getProxyConfig,
  getProviders,
  getNodes,
  startProxy,
  downloadSubscription,
  deleteSubscriptionFile,
  getSubscriptionPath,
  testAllNodesLatency,
  buildAureproxyMihomoConfig,
  startMihomoKernel,
  stopProxy,
  updateProxyConfig,
} from '@/lib/api'
import {
  reloadConfig,
  delayGroup,
  getGroupByName,
  getProxies,
  selectNodeForGroup,
} from 'tauri-plugin-mihomo-api'
import {
  AURE_NODE_SELECTOR,
  DEFAULT_PROXY_BYPASS_DOMAINS,
  MIHOMO_LATENCY_TEST_URL,
} from '@/constants/mihomo'
import { mihomoProxiesToNodes } from '@/lib/mihomoSubscriptionNodes'

interface AppStore {
  theme: 'light' | 'dark'
  proxyBypassDomains: string
  setTheme: (theme: 'light' | 'dark') => void
  setProxyBypassDomains: (value: string) => void
  toggleTheme: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      proxyBypassDomains: DEFAULT_PROXY_BYPASS_DOMAINS,
      setTheme: (theme) => set({ theme }),
      setProxyBypassDomains: (value) => set({ proxyBypassDomains: value }),
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

/** 校正当前选中订阅：仅存 1 条时一律视为当前使用中；零条清空；多条时校正无效引用 */
function normalizeCurrentSubscriptionSelection(
  providers: Provider[],
  currentProvider: Provider | undefined,
  currentNode: Node | undefined,
): { currentProvider: Provider | undefined; currentNode: Node | undefined } {
  if (providers.length === 0) {
    return { currentProvider: undefined, currentNode: undefined }
  }
  if (providers.length === 1) {
    const only = providers[0]
    const nodeOk =
      currentNode?.providerId === only.id ? currentNode : undefined
    return { currentProvider: only, currentNode: nodeOk }
  }
  if (currentProvider && !providers.some(p => p.id === currentProvider.id)) {
    return { currentProvider: undefined, currentNode: undefined }
  }
  const nodeOk =
    currentNode && currentProvider && currentNode.providerId === currentProvider.id
      ? currentNode
      : undefined
  return { currentProvider, currentNode: nodeOk }
}

interface ProxyStore {
  providers: Provider[]
  nodes: Node[]
  currentProvider?: Provider
  currentNode?: Node
  isConnected: boolean
  isConnecting: boolean
  /** 正在执行断开（关闭内核与系统代理），避免重复点击 */
  isDisconnecting: boolean
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
  /** 选择节点并在已连接时同步到 Mihomo Selector */
  applyNodeSelection: (node?: Node) => Promise<void>
  /** 从内核 `/proxies` 拉取叶子代理，填充当前订阅的节点列表 */
  refreshSubscriptionNodesFromMihomo: () => Promise<void>
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
  isDisconnecting: false,
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
      const cur = normalizeCurrentSubscriptionSelection(
        providers,
        get().currentProvider,
        get().currentNode,
      )
      set({ providers, nodes, ...cur })
    } catch (e) {
      console.error('Failed to load providers from DB:', e)
    }
  },

  addProvider: async (provider) => {
    await addProviderIpc(provider)
    const providers = [...get().providers, provider]
    set({ providers })
    if (provider.autoUpdateInterval) {
      setupAutoUpdateTimer(provider.id, provider.autoUpdateInterval, get().fetchAndSaveSubscription)
    }
    // 添加后若仅有这一条订阅，自动设为「使用中」
    if (providers.length === 1) {
      await get().setCurrentSubscription(provider)
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
    const sel = normalizeCurrentSubscriptionSelection(newProviders, currentProvider, get().currentNode)
    set({ providers: newProviders, ...sel })
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

  applyNodeSelection: async (node) => {
    set({ currentNode: node })
    if (!node || !get().isConnected) return
    try {
      await selectNodeForGroup(AURE_NODE_SELECTOR, node.name)
    } catch (e) {
      console.error('切换节点失败:', e)
    }
  },

  refreshSubscriptionNodesFromMihomo: async () => {
    const { currentProvider } = get()
    if (!currentProvider) return
    try {
      const raw = await getProxies()
      const leafNodes = mihomoProxiesToNodes(raw, currentProvider.id)
      let groupNow: string | undefined
      try {
        const grp = await getGroupByName(AURE_NODE_SELECTOR)
        groupNow = grp?.now
      } catch {
        // 内核尚未建好组时可忽略
      }
      const prev = get().currentNode
      let next: Node | undefined
      if (prev && leafNodes.some((n) => n.id === prev.id)) {
        next = leafNodes.find((n) => n.id === prev.id)!
      } else if (groupNow && leafNodes.some((n) => n.id === groupNow)) {
        next = leafNodes.find((n) => n.id === groupNow)!
      } else if (leafNodes.length > 0) {
        next = leafNodes[0]
      }
      set({ nodes: leafNodes, currentNode: next })
      if (next && groupNow !== next.name) {
        try {
          await selectNodeForGroup(AURE_NODE_SELECTOR, next.name)
        } catch (e) {
          console.warn('selectNodeForGroup 同步失败:', e)
        }
      }
    } catch (e) {
      console.error('从 Mihomo 刷新订阅节点失败:', e)
    }
  },

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
    if (get().isDisconnecting) throw new Error('正在断开连接，请稍候')

    set({ isConnecting: true })
    try {
      // 获取订阅配置文件路径
      const path = await getSubscriptionPath(currentProvider.id)
      if (!path) throw new Error('订阅配置文件不存在，请先更新订阅')

      const proxyBypassDomains = useAppStore.getState().proxyBypassDomains
      const proxyConfig = await getProxyConfig()
      await updateProxyConfig({
        ...proxyConfig,
        bypass_domains: proxyBypassDomains,
      })
      await startProxy()

      // 对齐 external-controller、启动 Mihomo sidecar（内部轮询 API 就绪）
      const runtimePath = await buildAureproxyMihomoConfig(currentProvider.id)
      await startMihomoKernel(runtimePath)

      await get().refreshSubscriptionNodesFromMihomo()

      set({
        isConnecting: false,
        isConnected: true,
        connectedAt: Date.now(),
      })
    } catch (e) {
      try {
        await stopProxy()
      } catch {
        // ignore
      }
      set({ isConnecting: false })
      throw e
    }
  },

  disconnect: async () => {
    if (get().isDisconnecting) return
    set({ isDisconnecting: true })
    try {
      try {
        const { closeAllConnections } = await import('tauri-plugin-mihomo-api')
        await closeAllConnections()
      } catch {
        // ignore cleanup errors
      }
      try {
        await stopProxy()
      } catch {
        // ignore
      }
      let dbNodes: Node[] = []
      try {
        const n = await getNodes()
        if (Array.isArray(n)) dbNodes = n
      } catch {
        /* 忽略：测试环境或未初始化 DB */
      }
      const prevNode = get().currentNode
      const cp = get().currentProvider
      const nextNode =
        prevNode &&
        cp &&
        dbNodes.some((x) => x.id === prevNode.id && x.providerId === cp.id)
          ? dbNodes.find((x) => x.id === prevNode.id)
          : undefined
      set({
        isConnected: false,
        connectedAt: undefined,
        connectedIp: undefined,
        uploadSpeed: 0,
        downloadSpeed: 0,
        nodes: dbNodes,
        currentNode: nextNode,
      })
    } finally {
      set({ isDisconnecting: false })
    }
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
      // 如果已连接，先测试内核组内的节点
      if (get().isConnected) {
        try {
          const delays = await delayGroup(
            AURE_NODE_SELECTOR,
            MIHOMO_LATENCY_TEST_URL,
            8000,
            false
          )
          set((state) => {
            const nodes = state.nodes.map((n) => ({
              ...n,
              delay: delays[n.name] ?? n.delay,
            }))
            const cur = state.currentNode
            const currentNode =
              cur && nodes.find((x) => x.id === cur.id)
                ? { ...nodes.find((x) => x.id === cur.id)! }
                : cur
            return { nodes, currentNode }
          })
        } catch (groupError) {
          console.warn('Failed to test group latency:', groupError)
        }
      }

      // 获取当前订阅的节点列表
      const providers = get().providers
      const currentProvider = get().currentProvider
      const nodes = get().nodes
      const list = currentProvider
        ? nodes.filter((n) => n.providerId === currentProvider.id && n.enabled)
        : []

      if (list.length === 0) return

      // 逐个测试每个节点并即时更新UI
      for (const node of list) {
        try {
          const result = await testNodeLatency(node.id, node.server, node.port)
          if (result.delay !== undefined) {
            set((state) => ({
              nodes: state.nodes.map((n) =>
                n.id === node.id ? { ...n, delay: result.delay } : n
              ),
              currentNode: state.currentNode?.id === node.id
                ? { ...state.currentNode, delay: result.delay }
                : state.currentNode
            }))
          }
        } catch (nodeError) {
          console.warn(`Failed to test latency for node ${node.name}:`, nodeError)
        }

        // 短暂延迟以改善用户体验
        await new Promise(resolve => setTimeout(resolve, 150))
      }
    } catch (e) {
      console.error('Failed to start latency testing:', e)
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
      let currentProvider = get().currentProvider
      if (currentProvider?.id === id) {
        const fresh = providers.find(p => p.id === id)
        if (fresh) currentProvider = fresh
      }
      const sel = normalizeCurrentSubscriptionSelection(providers, currentProvider, get().currentNode)
      set({ providers, ...sel })

      if (get().isConnected && get().currentProvider?.id === id) {
        try {
          const sp = await getSubscriptionPath(id)
          if (sp) {
            const runtimePath = await buildAureproxyMihomoConfig(id)
            await reloadConfig(true, runtimePath)
            await get().refreshSubscriptionNodesFromMihomo()
          }
        } catch (e) {
          console.error('订阅更新后 reload 内核失败:', e)
        }
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

    // 确保订阅文件存在；已连接时对运行中的内核发送 reload（使用补丁后的路径）
    try {
      const path = await getSubscriptionPath(provider.id)
      if (path) {
        const runtimePath = await buildAureproxyMihomoConfig(provider.id)
        if (get().isConnected) {
          await reloadConfig(true, runtimePath)
          await get().refreshSubscriptionNodesFromMihomo()
        }
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
