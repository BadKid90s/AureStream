pub mod proxy;
pub mod provider;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyConfig {
    pub listen: String,
    pub http_port: u16,
    pub socks5_port: u16,
}

impl Default for ProxyConfig {
    fn default() -> Self {
        Self {
            listen: "127.0.0.1".to_string(),
            http_port: 7890,
            socks5_port: 7891,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyStatus {
    pub is_running: bool,
    pub current_node: Option<String>,
    pub upload_bytes: u64,
    pub download_bytes: u64,
}

impl Default for ProxyStatus {
    fn default() -> Self {
        Self {
            is_running: false,
            current_node: None,
            upload_bytes: 0,
            download_bytes: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Provider {
    pub id: String,
    pub name: String,
    pub url: String,
    pub group: Option<String>,
    pub enabled: bool,
    pub last_updated: String,
    pub node_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    pub id: String,
    pub name: String,
    pub provider_id: String,
    pub node_type: String,
    pub server: String,
    pub port: u16,
    pub delay: Option<u32>,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LatencyResult {
    pub node_id: String,
    pub delay: Option<u32>,
    pub error: Option<String>,
}
