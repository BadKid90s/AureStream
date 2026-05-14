mod commands;
mod db;

use std::sync::Mutex;

use commands::builtin_config::build_aureproxy_mihomo_config;
use commands::mihomo_kernel::{start_mihomo_kernel, stop_mihomo_kernel, MihomoKernelState};
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
            app.manage(MihomoKernelState::default());
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
            delete_subscription_file,
            build_aureproxy_mihomo_config,
            start_mihomo_kernel,
            stop_mihomo_kernel,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                use commands::mihomo_kernel::{stop_mihomo_sidecar, MihomoKernelState};
                if let Some(mihomo) = app_handle.try_state::<MihomoKernelState>() {
                    let _ = tauri::async_runtime::block_on(stop_mihomo_sidecar(&*mihomo));
                }
            }
        });
}
