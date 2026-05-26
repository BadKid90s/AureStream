//! 智能路由命令：节点能力探测。

use crate::adapter::mihomo::probe;
use std::time::Duration;
use tauri::command;

/// 探测节点的 AI 和流媒体服务支持情况。
///
/// 通过本地 Mihomo 代理访问各服务端点，判断是否可用。
#[command]
pub async fn probe_node_capabilities(
    proxy_port: u16,
) -> Result<probe::AiProbeResult, String> {
    let proxy_url = format!("http://127.0.0.1:{}", proxy_port);
    let timeout = Duration::from_secs(10);

    probe::probe_ai_support(&proxy_url, timeout)
        .await
        .map_err(|e| format!("AI 服务探测失败: {}", e))
}

/// 探测节点的流媒体服务支持情况。
#[command]
pub async fn probe_streaming_capabilities(
    proxy_port: u16,
) -> Result<probe::StreamingProbeResult, String> {
    let proxy_url = format!("http://127.0.0.1:{}", proxy_port);
    let timeout = Duration::from_secs(10);

    probe::probe_streaming_support(&proxy_url, timeout)
        .await
        .map_err(|e| format!("流媒体服务探测失败: {}", e))
}
