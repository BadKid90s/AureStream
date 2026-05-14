mod commands;
mod db;

use std::sync::Mutex;

use commands::proxy::{get_proxy_config, get_proxy_status, set_current_node, start_proxy, stop_proxy, update_proxy_config, ProxyState};
use commands::provider::{add_provider, delete_provider, get_nodes, get_nodes_by_provider, get_providers, test_all_nodes_latency, test_node_latency, update_provider};
use commands::subscription::{delete_subscription_file, download_subscription, get_subscription_path};
use tauri::Manager;

pub struct DbState(pub Mutex<rusqlite::Connection>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_mihomo::Builder::new().build())
        .setup(|app| {
            let conn = db::init_db(app.handle())?;
            app.manage(DbState(Mutex::new(conn)));
            app.manage(ProxyState::default());
            Ok(())
        })
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
            test_node_latency,
            test_all_nodes_latency,
            download_subscription,
            get_subscription_path,
            delete_subscription_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
