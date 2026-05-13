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
      uploadSpeed: 0,
      downloadSpeed: 0,
      isTestingLatency: false,

      addProvider: (provider) => set({ providers: [...get().providers, provider] }),
      
      updateProvider: (id, updates) => set({
        providers: get().providers.map(p => p.id === id ? { ...p, ...updates } : p)
      }),
      
      deleteProvider: (id) => {
        const newProviders = get().providers.filter(p => p.id !== id)
        const newNodes = get().nodes.filter(n => n.providerId !== id)
        const currentProvider = get().currentProvider?.id === id ? undefined : get().currentProvider
        const currentNode = currentProvider === undefined ? undefined : 
                           get().currentNode?.providerId === id ? undefined : get().currentNode
        set({ providers: newProviders, nodes: newNodes, currentProvider, currentNode })
      },
      
      setCurrentProvider: (provider) => set({ 
        currentProvider: provider,
        nodes: provider ? get().nodes.filter(n => n.providerId === provider.id) : []
      }),
      
      setCurrentNode: (node) => set({ currentNode: node }),
      
      setNodes: (nodes) => set({ nodes }),
      
      updateNodeDelay: (nodeId, delay) => set({
        nodes: get().nodes.map(n => n.id === nodeId ? { ...n, delay } : n)
      }),
      
      connect: async () => {
        set({ isConnecting: true })
        await new Promise(resolve => setTimeout(resolve, 1000))
        set({ isConnecting: false, isConnected: true })
      },
      
      disconnect: () => set({ isConnected: false }),
      
      setConnectStatus: (isConnected) => set({ isConnected }),
      
      setConnectingStatus: (isConnecting) => set({ isConnecting }),
      
      updateSpeeds: (upload, download) => set({ uploadSpeed: upload, downloadSpeed: download }),
      
      testLatency: async () => {
        set({ isTestingLatency: true })
        const nodes = get().nodes
        for (const node of nodes) {
          const delay = Math.floor(Math.random() * 400) + 20
          await new Promise(resolve => setTimeout(resolve, 100))
          set({
            nodes: get().nodes.map(n => n.id === node.id ? { ...n, delay } : n)
          })
        }
        set({ isTestingLatency: false })
      },
    }),
    {
      name: 'mihomoproxy-proxy-store',
    }
  )
)
