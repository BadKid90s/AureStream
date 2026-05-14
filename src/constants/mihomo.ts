/** 与内核 health-check / delayGroup 及 Rust `mihomo_constants::LATENCY_TEST_URL` 一致 */
export const MIHOMO_LATENCY_TEST_URL =
  'http://www.gstatic.com/generate_204' as const

/** 离线 Rust TCP 侧与 HTTPS generate_204 对齐 */
export const MIHOMO_LATENCY_TEST_TCP_HOST = 'www.gstatic.com' as const
export const MIHOMO_LATENCY_TEST_TCP_PORT = 443 as const

/** 与后端 `builtin_config::AURE_NODE_SELECTOR` 一致；选节点时传给 selectNodeForGroup */
export const AURE_NODE_SELECTOR = 'Aure_Node_Selector'
