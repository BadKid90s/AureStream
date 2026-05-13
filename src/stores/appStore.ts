import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Provider, Node } from '@/types'

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
      name: 'mihomoproxy-app-store',
    }
  )
)

interface ProxyStore {
  providers: Provider[]
  nodes: Node[]
  currentProvider?: Provider
  currentNode?: Node
  isConnected: boolean
  isConnecting: boolean
  /** 连接成功时的 Unix 毫秒时间戳，用于首页连接计时 */
  connectedAt?: number
  /** 连接态展示的出口 IP（演示/mock，断开清空） */
  connectedIp?: string
  uploadSpeed: number
  downloadSpeed: number
  isTestingLatency: boolean

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

      addProvider: (provider) => set({ providers: [...get().providers, provider] }),

      updateProvider: (id, updates) =>
        set({
          providers: get().providers.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }),

      deleteProvider: (id) => {
        const newProviders = get().providers.filter((p) => p.id !== id)
        const newNodes = get().nodes.filter((n) => n.providerId !== id)
        let currentProvider = get().currentProvider
        let currentNode = get().currentNode
        if (currentProvider?.id === id) currentProvider = undefined
        if (currentNode?.providerId === id) currentNode = undefined
        set({ providers: newProviders, nodes: newNodes, currentProvider, currentNode })
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
    }),
    {
      name: 'mihomoproxy-proxy-store',
    }
  )
)
