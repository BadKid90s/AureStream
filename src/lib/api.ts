import { invoke } from '@tauri-apps/api/core'
import type { Provider, Node } from '@/types'

export interface ProxyConfig {
  listen: string
  http_port: number
  socks5_port: number
}

export interface ProxyStatus {
  is_running: boolean
  current_node?: string
  upload_bytes: number
  download_bytes: number
}

export interface LatencyResult {
  node_id: string
  delay?: number
  error?: string
}

export async function startProxy(): Promise<string> {
  return await invoke<string>('start_proxy')
}

export async function stopProxy(): Promise<string> {
  return await invoke<string>('stop_proxy')
}

export async function getProxyStatus(): Promise<ProxyStatus> {
  return await invoke<ProxyStatus>('get_proxy_status')
}

export async function setCurrentNode(nodeName: string): Promise<void> {
  return await invoke<void>('set_current_node', { nodeName })
}

export async function updateProxyConfig(config: ProxyConfig): Promise<void> {
  return await invoke<void>('update_proxy_config', { config })
}

export async function getProxyConfig(): Promise<ProxyConfig> {
  return await invoke<ProxyConfig>('get_proxy_config')
}

export async function addProvider(provider: Provider): Promise<void> {
  return await invoke<void>('add_provider', { provider })
}

export async function updateProvider(id: string, updates: Provider): Promise<void> {
  return await invoke<void>('update_provider', { id, updates })
}

export async function deleteProvider(id: string): Promise<void> {
  return await invoke<void>('delete_provider', { id })
}

export async function getProviders(): Promise<Provider[]> {
  return await invoke<Provider[]>('get_providers')
}

export async function getNodes(): Promise<Node[]> {
  return await invoke<Node[]>('get_nodes')
}

export async function getNodesByProvider(providerId: string): Promise<Node[]> {
  return await invoke<Node[]>('get_nodes_by_provider', { providerId })
}

export async function fetchSubscription(url: string): Promise<string> {
  return await invoke<string>('fetch_subscription', { url })
}

export async function testNodeLatency(nodeId: string, server: string, port: number): Promise<LatencyResult> {
  return await invoke<LatencyResult>('test_node_latency', { nodeId, server, port })
}

export async function testAllNodesLatency(): Promise<LatencyResult[]> {
  return await invoke<LatencyResult[]>('test_all_nodes_latency')
}

// --- Subscription management ---

export interface SubscriptionMeta {
  upload_bytes?: number
  download_bytes?: number
  total_bytes?: number
  expire_timestamp?: number
}

export interface DownloadResult {
  path: string
  contentLength: number
  meta?: SubscriptionMeta
  debugHeaders?: [string, string][]
}

export async function downloadSubscription(providerId: string, url: string): Promise<DownloadResult> {
  return await invoke<DownloadResult>('download_subscription', { providerId, url })
}

export async function getSubscriptionPath(providerId: string): Promise<string | null> {
  return await invoke<string | null>('get_subscription_path', { providerId })
}

export async function deleteSubscriptionFile(providerId: string): Promise<void> {
  return await invoke<void>('delete_subscription_file', { providerId })
}
