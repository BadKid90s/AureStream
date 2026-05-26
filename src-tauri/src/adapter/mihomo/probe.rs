//! 节点能力探测：通过 Mihomo 代理测试 AI/流媒体服务可用性。
//!
//! 使用 Mihomo 的 `proxy-providers` 和 `proxy-groups` 功能，
//! 通过特定节点访问 AI/流媒体服务端点，判断是否可用。

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

use crate::error::AppError;

/// AI 服务探测结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiProbeResult {
    pub openai: bool,
    pub claude: bool,
    pub gemini: bool,
}

/// 流媒体服务探测结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamingProbeResult {
    pub netflix: bool,
    pub disney: bool,
    pub youtube_premium: bool,
}

/// 通过 HTTP 代理探测 AI 服务可用性
///
/// # 参数
/// - `proxy_url`: HTTP 代理地址，如 `http://127.0.0.1:7890`
/// - `timeout`: 请求超时时间
///
/// # 返回
/// 各 AI 服务的可用性状态
pub async fn probe_ai_support(
    proxy_url: &str,
    timeout: Duration,
) -> Result<AiProbeResult, AppError> {
    let client = Client::builder()
        .proxy(reqwest::Proxy::all(proxy_url).map_err(AppError::Http)?)
        .timeout(timeout)
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(AppError::Http)?;

    let openai = check_url_accessible(&client, "https://chat.openai.com").await;
    let claude = check_url_accessible(&client, "https://claude.ai").await;
    let gemini = check_url_accessible(&client, "https://gemini.google.com").await;

    Ok(AiProbeResult {
        openai,
        claude,
        gemini,
    })
}

/// 通过 HTTP 代理探测流媒体服务可用性
///
/// # 参数
/// - `proxy_url`: HTTP 代理地址，如 `http://127.0.0.1:7890`
/// - `timeout`: 请求超时时间
///
/// # 返回
/// 各流媒体服务的可用性状态
pub async fn probe_streaming_support(
    proxy_url: &str,
    timeout: Duration,
) -> Result<StreamingProbeResult, AppError> {
    let client = Client::builder()
        .proxy(reqwest::Proxy::all(proxy_url).map_err(AppError::Http)?)
        .timeout(timeout)
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(AppError::Http)?;

    let netflix = check_url_accessible(&client, "https://www.netflix.com").await;
    let disney = check_url_accessible(&client, "https://www.disneyplus.com").await;
    let youtube_premium = check_url_accessible(&client, "https://www.youtube.com/premium").await;

    Ok(StreamingProbeResult {
        netflix,
        disney,
        youtube_premium,
    })
}

/// 检查 URL 是否可访问（非 403/451/503）
async fn check_url_accessible(client: &Client, url: &str) -> bool {
    match client.get(url).send().await {
        Ok(resp) => {
            let status = resp.status().as_u16();
            // 200-299: 可访问
            // 301/302/307/308: 重定向（通常表示可访问）
            // 403: 禁止访问（地区限制）
            // 451: 法律原因不可用
            // 503: 服务不可用
            !(status == 403 || status == 451 || status == 503)
        }
        Err(_) => false,
    }
}
