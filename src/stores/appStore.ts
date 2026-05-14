import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
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
  testNodeLatency,
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

/** 本地持久化测速：订阅 id + 节点 id（与 Mihomo 叶子代理名一致） */
function nodeLatencyCacheKey(providerId: string, nodeId: string): string {
  return `${providerId}:${nodeId}`
}

/** Vitest 等环境下 global localStorage 可能无 setItem；提供内存后备以免 persist 崩溃 */
function createMemoryLocalStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() {
      return m.size
    },
    clear: () => m.clear(),
    getItem: (key) => m.get(key) ?? null,
    key: (index) => Array.from(m.keys())[index] ?? null,
    removeItem: (key) => {
      m.delete(key)
    },
    setItem: (key, value) => {
      m.set(key, value)
    },
  } as Storage
}

let memoryLocalStorageSingleton: Storage | null = null

function getBrowserOrMemoryStorage(): Storage {
  if (typeof globalThis.localStorage?.setItem === 'function') {
    return globalThis.localStorage
  }
  memoryLocalStorageSingleton ??= createMemoryLocalStorage()
  return memoryLocalStorageSingleton
}

function latencyPersistStorage() {
  return createJSONStorage(() => getBrowserOrMemoryStorage())
}

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

/** Mihomo `/connections` 累计量差分 → 字节/秒（供首页速率展示） */
let mihomoTrafficTimer: ReturnType<typeof setInterval> | null = null
let mihomoTrafficSnap = {
  uploadTotal: 0,
  downloadTotal: 0,
  t: 0,
  primed: false,
}

function stopMihomoTrafficPoll() {
  if (mihomoTrafficTimer != null) {
    clearInterval(mihomoTrafficTimer)
    mihomoTrafficTimer = null
  }
  mihomoTrafficSnap = { uploadTotal: 0, downloadTotal: 0, t: 0, primed: false }
}

function startMihomoTrafficPoll(get: () => ProxyStore) {
  stopMihomoTrafficPoll()
  const tick = async () => {
    try {
      const { getConnections } = await import('tauri-plugin-mihomo-api')
      const c = await getConnections()
      const now = Date.now()
      const up = Number(c.uploadTotal ?? 0)
      const down = Number(c.downloadTotal ?? 0)
      if (!mihomoTrafficSnap.primed) {
        mihomoTrafficSnap = { uploadTotal: up, downloadTotal: down, t: now, primed: true }
        get().applyMihomoTrafficTick(0, 0, up, down)
        return
      }
      const dt = (now - mihomoTrafficSnap.t) / 1000
      if (dt < 0.05) return
      let ul = (up - mihomoTrafficSnap.uploadTotal) / dt
      let dl = (down - mihomoTrafficSnap.downloadTotal) / dt
      if (!Number.isFinite(ul) || ul < 0) ul = 0
      if (!Number.isFinite(dl) || dl < 0) dl = 0
      get().applyMihomoTrafficTick(ul, dl, up, down)
      mihomoTrafficSnap = { uploadTotal: up, downloadTotal: down, t: now, primed: true }
    } catch {
      const st = get()
      st.applyMihomoTrafficTick(0, 0, st.sessionUploadBytes, st.sessionDownloadBytes)
    }
  }
  void tick()
  mihomoTrafficTimer = setInterval(() => void tick(), 1000)
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
  /** 当前 Mihomo 会话累计上传量（字节，来自 getConnections.uploadTotal） */
  sessionUploadBytes: number
  /** 当前 Mihomo 会话累计下载量（字节，来自 getConnections.downloadTotal） */
  sessionDownloadBytes: number
  isTestingLatency: boolean
  /** 本轮一键测速尚未完成的节点 id（用于每行显示刷新动画，含已有旧延迟的重测） */
  latencyPendingByNodeId: Record<string, boolean>
  /** 正在更新的 provider ID 集合 */
  refreshingIds: Set<string>
  /** 上次一键测速结果（按订阅+节点缓存，持久化以便再次打开列表仍显示） */
  nodeLatencyByKey: Record<string, number>

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
  /** 由 Mihomo 流量轮询一次性写入速率与本会话累计字节 */
  applyMihomoTrafficTick: (
    upBps: number,
    downBps: number,
    sessionUpBytes: number,
    sessionDownBytes: number
  ) => void
  testLatency: () => Promise<void>
  /** 下载订阅配置文件并更新 provider 元数据 */
  fetchAndSaveSubscription: (id: string) => Promise<{ success: boolean; error?: string }>
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
  isDisconnecting: false,
  connectedAt: undefined,
  connectedIp: undefined,
  uploadSpeed: 0,
  downloadSpeed: 0,
  sessionUploadBytes: 0,
  sessionDownloadBytes: 0,
  isTestingLatency: false,
  latencyPendingByNodeId: {},
  refreshingIds: new Set<string>(),
  nodeLatencyByKey: {},

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
    const prefix = `${id}:`
    set((state) => {
      const nodeLatencyByKey = { ...state.nodeLatencyByKey }
      for (const k of Object.keys(nodeLatencyByKey)) {
        if (k.startsWith(prefix)) delete nodeLatencyByKey[k]
      }
      return { providers: newProviders, ...sel, nodeLatencyByKey }
    })
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
    // 一键测速进行中：避免 /proxies 里陈旧的 history.delay 写回列表，盖住正在重测的状态
    if (get().isTestingLatency) return
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
      const state = get()
      const prevById = new Map(state.nodes.map((n) => [n.id, n]))
      const cache = state.nodeLatencyByKey
      const merged = leafNodes.map((n) => {
        const old = prevById.get(n.id)
        const cached = cache[nodeLatencyCacheKey(currentProvider.id, n.id)]
        return {
          ...n,
          // 优先本会话内存 → 持久化测速缓存 → Mihomo history（history 常为陈旧值，不应覆盖用户刚测的结果）
          delay: old?.delay ?? cached ?? n.delay,
        }
      })
      const prev = state.currentNode
      let next: Node | undefined
      if (prev && merged.some((n) => n.id === prev.id)) {
        next = merged.find((n) => n.id === prev.id)!
      } else if (groupNow && merged.some((n) => n.id === groupNow)) {
        next = merged.find((n) => n.id === groupNow)!
      } else if (merged.length > 0) {
        next = merged[0]
      }
      set({ nodes: merged, currentNode: next })
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
      const cp = state.currentProvider
      const nodeLatencyByKey = cp
        ? {
            ...state.nodeLatencyByKey,
            [nodeLatencyCacheKey(cp.id, nodeId)]: delay,
          }
        : state.nodeLatencyByKey
      return { nodes, currentNode, nodeLatencyByKey }
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

      stopMihomoTrafficPoll()
      startMihomoTrafficPoll(get)

      set({
        isConnecting: false,
        isConnected: true,
        connectedAt: Date.now(),
      })
    } catch (e) {
      stopMihomoTrafficPoll()
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
    stopMihomoTrafficPoll()
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
        sessionUploadBytes: 0,
        sessionDownloadBytes: 0,
        nodes: dbNodes,
        currentNode: nextNode,
      })
    } finally {
      set({ isDisconnecting: false })
    }
  },

  setConnectStatus: (isConnected) => {
    if (!isConnected) stopMihomoTrafficPoll()
    set((s) => ({
      isConnected,
      connectedAt: isConnected ? s.connectedAt ?? Date.now() : undefined,
      connectedIp: isConnected ? s.connectedIp : undefined,
      ...(!isConnected ? { uploadSpeed: 0, downloadSpeed: 0, sessionUploadBytes: 0, sessionDownloadBytes: 0 } : {}),
    }))
  },

  setConnectingStatus: (isConnecting) => set({ isConnecting }),

  updateSpeeds: (upload, download) => set({ uploadSpeed: upload, downloadSpeed: download }),

  applyMihomoTrafficTick: (upBps, downBps, sessionUpBytes, sessionDownBytes) =>
    set({
      uploadSpeed: upBps,
      downloadSpeed: downBps,
      sessionUploadBytes: sessionUpBytes,
      sessionDownloadBytes: sessionDownBytes,
    }),

  testLatency: async () => {
    const currentProvider0 = get().currentProvider
    const nodes0 = get().nodes
    const list0 = currentProvider0
      ? nodes0.filter((n) => n.providerId === currentProvider0.id && n.enabled)
      : []
    if (!currentProvider0 || list0.length === 0) return

    const cpId = currentProvider0.id
    const listIds = new Set(list0.map((n) => n.id))
    set((state) => {
      const nextKey = { ...state.nodeLatencyByKey }
      for (const k of Object.keys(nextKey)) {
        if (!k.startsWith(`${cpId}:`)) continue
        const nodePart = k.slice(cpId.length + 1)
        if (listIds.has(nodePart)) delete nextKey[k]
      }
      const nodes = state.nodes.map((n) =>
        listIds.has(n.id) && n.providerId === cpId ? { ...n, delay: undefined } : n
      )
      let currentNode = state.currentNode
      if (currentNode && listIds.has(currentNode.id)) {
        currentNode = { ...currentNode, delay: undefined }
      }
      const initialPending: Record<string, boolean> = {}
      for (const n of list0) initialPending[n.id] = true
      return {
        isTestingLatency: true,
        latencyPendingByNodeId: initialPending,
        nodes,
        currentNode,
        nodeLatencyByKey: nextKey,
      }
    })

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
            const cp = state.currentProvider
            const nextCache = { ...state.nodeLatencyByKey }
            const nodes = state.nodes.map((n) => {
              const measured = delays[n.name] as number | undefined
              const delay = measured ?? n.delay
              if (cp && typeof measured === 'number') {
                nextCache[nodeLatencyCacheKey(cp.id, n.id)] = measured
              }
              return { ...n, delay }
            })
            const cur = state.currentNode
            const currentNode =
              cur && nodes.find((x) => x.id === cur.id)
                ? { ...nodes.find((x) => x.id === cur.id)! }
                : cur
            // 不在此阶段取消 pending：内核 group 结果可能是陈旧延迟；各行仍以刷新图标等待逐节点 TCP 测速落盘后再展示
            return {
              nodes,
              currentNode,
              nodeLatencyByKey: nextCache,
            }
          })
        } catch (groupError) {
          console.warn('Failed to test group latency:', groupError)
        }
      }

      // 获取当前订阅的节点列表
      const currentProvider = get().currentProvider
      const nodes = get().nodes
      const list = currentProvider
        ? nodes.filter((n) => n.providerId === currentProvider.id && n.enabled)
        : []

      if (list.length === 0) return

      // 逐个测试每个节点并即时更新UI
      for (const node of list) {
        set((state) => ({
          latencyPendingByNodeId: { ...state.latencyPendingByNodeId, [node.id]: true },
        }))
        try {
          const result = await testNodeLatency(node.id, node.server, node.port)
          const cp = get().currentProvider
          set((state) => {
            const nextPending = { ...state.latencyPendingByNodeId }
            delete nextPending[node.id]
            if (result.delay === undefined) {
              return { latencyPendingByNodeId: nextPending }
            }
            return {
              nodes: state.nodes.map((n) =>
                n.id === node.id ? { ...n, delay: result.delay } : n
              ),
              currentNode: state.currentNode?.id === node.id
                ? { ...state.currentNode, delay: result.delay }
                : state.currentNode,
              nodeLatencyByKey: cp
                ? {
                    ...state.nodeLatencyByKey,
                    [nodeLatencyCacheKey(cp.id, node.id)]: result.delay as number,
                  }
                : state.nodeLatencyByKey,
              latencyPendingByNodeId: nextPending,
            }
          })
        } catch (nodeError) {
          console.warn(`Failed to test latency for node ${node.name}:`, nodeError)
          set((state) => {
            const nextPending = { ...state.latencyPendingByNodeId }
            delete nextPending[node.id]
            return { latencyPendingByNodeId: nextPending }
          })
        }

        // 短暂延迟以改善用户体验
        await new Promise(resolve => setTimeout(resolve, 150))
      }
    } catch (e) {
      console.error('Failed to start latency testing:', e)
    } finally {
      set({ isTestingLatency: false, latencyPendingByNodeId: {} })
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
  }),
    {
      name: 'aureproxy-node-latency-cache',
      storage: latencyPersistStorage(),
      partialize: (state) => ({
        nodeLatencyByKey: state.nodeLatencyByKey,
      }),
    }
  )
)
