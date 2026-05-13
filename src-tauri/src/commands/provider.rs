use crate::commands::{LatencyResult, Node, Provider};
use std::sync::Mutex;
use tauri::State;

pub struct ProviderState {
    pub providers: Mutex<Vec<Provider>>,
    pub nodes: Mutex<Vec<Node>>,
}

impl Default for ProviderState {
    fn default() -> Self {
        Self {
            providers: Mutex::new(Vec::new()),
            nodes: Mutex::new(Vec::new()),
        }
    }
}

#[tauri::command]
pub fn add_provider(state: State<ProviderState>, provider: Provider) -> Result<(), String> {
    let mut providers = state.providers.lock().map_err(|e| e.to_string())?;
    providers.push(provider);
    Ok(())
}

#[tauri::command]
pub fn update_provider(
    state: State<ProviderState>,
    id: String,
    updates: Provider,
) -> Result<(), String> {
    let mut providers = state.providers.lock().map_err(|e| e.to_string())?;
    if let Some(provider) = providers.iter_mut().find(|p| p.id == id) {
        *provider = updates;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_provider(state: State<ProviderState>, id: String) -> Result<(), String> {
    let mut providers = state.providers.lock().map_err(|e| e.to_string())?;
    providers.retain(|p| p.id != id);
    
    let mut nodes = state.nodes.lock().map_err(|e| e.to_string())?;
    nodes.retain(|n| n.provider_id != id);
    
    Ok(())
}

#[tauri::command]
pub fn get_providers(state: State<ProviderState>) -> Result<Vec<Provider>, String> {
    let providers = state.providers.lock().map_err(|e| e.to_string())?;
    Ok(providers.clone())
}

#[tauri::command]
pub fn get_nodes(state: State<ProviderState>) -> Result<Vec<Node>, String> {
    let nodes = state.nodes.lock().map_err(|e| e.to_string())?;
    Ok(nodes.clone())
}

#[tauri::command]
pub fn get_nodes_by_provider(
    state: State<ProviderState>,
    provider_id: String,
) -> Result<Vec<Node>, String> {
    let nodes = state.nodes.lock().map_err(|e| e.to_string())?;
    let filtered: Vec<Node> = nodes
        .iter()
        .filter(|n| n.provider_id == provider_id)
        .cloned()
        .collect();
    Ok(filtered)
}

#[tauri::command]
pub async fn fetch_subscription(url: String) -> Result<String, String> {
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to fetch subscription: {}", e))?;
    
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    
    Ok(body)
}

#[tauri::command]
pub async fn test_node_latency(node_id: String, server: String, port: u16) -> LatencyResult {
    let start = std::time::Instant::now();
    let addr = format!("{}:{}", server, port);
    
    match tokio::time::timeout(
        std::time::Duration::from_secs(5),
        tokio::net::TcpStream::connect(&addr)
    ).await {
        Ok(Ok(_)) => {
            let delay = start.elapsed().as_millis() as u32;
            LatencyResult {
                node_id,
                delay: Some(delay),
                error: None,
            }
        }
        Ok(Err(e)) => {
            LatencyResult {
                node_id,
                delay: None,
                error: Some(e.to_string()),
            }
        }
        Err(_) => {
            LatencyResult {
                node_id,
                delay: None,
                error: Some("Connection timeout".to_string()),
            }
        }
    }
}

#[tauri::command]
pub async fn test_all_nodes_latency(
    state: State<'_, ProviderState>,
) -> Result<Vec<LatencyResult>, String> {
    let nodes_snapshot: Vec<(String, String, u16)> = {
        let nodes = state.nodes.lock().map_err(|e| e.to_string())?;
        nodes.iter().map(|n| (n.id.clone(), n.server.clone(), n.port)).collect()
    };

    let mut results = Vec::new();

    for (node_id, server, port) in nodes_snapshot {
        let result = test_node_latency(node_id, server, port).await;
        results.push(result);
    }

    Ok(results)
}
