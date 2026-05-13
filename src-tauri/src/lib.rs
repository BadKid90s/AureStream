mod commands;

use commands::proxy::{get_proxy_config, get_proxy_status, set_current_node, start_proxy, stop_proxy, update_proxy_config, ProxyState};
use commands::provider::{add_provider, delete_provider, fetch_subscription, get_nodes, get_nodes_by_provider, get_providers, test_all_nodes_latency, test_node_latency, update_provider, ProviderState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(ProxyState::default())
        .manage(ProviderState::default())
        .invoke_handler(tauri::generate_handler![
            start_proxy,
            stop_proxy,
            get_proxy_status,
            set_current_node,
            update_proxy_config,
            get_proxy_config,
            add_provider,
            update_provider,
            delete_provider,
            get_providers,
            get_nodes,
            get_nodes_by_provider,
            fetch_subscription,
            test_node_latency,
            test_all_nodes_latency
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
