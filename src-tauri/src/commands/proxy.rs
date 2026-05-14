use crate::commands::mihomo_kernel::{stop_mihomo_sidecar, MihomoKernelState};
use crate::commands::{ProxyConfig, ProxyStatus};
use std::sync::Mutex;
use tauri::State;

pub struct ProxyState {
    pub config: Mutex<ProxyConfig>,
    pub status: Mutex<ProxyStatus>,
}

impl Default for ProxyState {
    fn default() -> Self {
        Self {
            config: Mutex::new(ProxyConfig::default()),
            status: Mutex::new(ProxyStatus::default()),
        }
    }
}

#[tauri::command]
pub fn start_proxy(state: State<ProxyState>) -> Result<String, String> {
    let mut status = state.status.lock().map_err(|e| e.to_string())?;
    status.is_running = true;
    Ok("Proxy started successfully".to_string())
}

#[tauri::command]
pub async fn stop_proxy(
    proxy_state: State<'_, ProxyState>,
    mihomo_state: State<'_, MihomoKernelState>,
) -> Result<String, String> {
    stop_mihomo_sidecar(&mihomo_state).await?;
    let mut status = proxy_state.status.lock().map_err(|e| e.to_string())?;
    status.is_running = false;
    status.current_node = None;
    Ok("Proxy stopped successfully".to_string())
}

#[tauri::command]
pub fn get_proxy_status(state: State<ProxyState>) -> Result<ProxyStatus, String> {
    let status = state.status.lock().map_err(|e| e.to_string())?;
    Ok(status.clone())
}

#[tauri::command]
pub fn set_current_node(state: State<ProxyState>, node_name: String) -> Result<(), String> {
    let mut status = state.status.lock().map_err(|e| e.to_string())?;
    status.current_node = Some(node_name);
    Ok(())
}

#[tauri::command]
pub fn update_proxy_config(
    state: State<ProxyState>,
    config: ProxyConfig,
) -> Result<(), String> {
    let mut current_config = state.config.lock().map_err(|e| e.to_string())?;
    *current_config = config;
    Ok(())
}

#[tauri::command]
pub fn get_proxy_config(state: State<ProxyState>) -> Result<ProxyConfig, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    Ok(config.clone())
}
