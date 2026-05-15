mod commands;
mod config;

use commands::builtin_config::build_aureproxy_mihomo_config;
use commands::mihomo_kernel::{download_geodata, start_mihomo_kernel, stop_mihomo_kernel, MihomoKernelState};
use commands::proxy::{get_proxy_config, get_proxy_status, set_current_node, start_proxy, stop_proxy, update_proxy_config, ProxyState};
use commands::provider::{add_provider, delete_provider, get_nodes, get_nodes_by_provider, get_providers, test_all_nodes_latency, test_node_latency, update_provider};
use commands::settings::{load_app_settings, load_latency_cache, save_app_settings, save_latency_cache};
use commands::subscription::{delete_subscription_file, download_subscription, get_subscription_path};
use config::AureConfigState;
use tauri::Manager;

/// `tauri-plugin-mihomo` 内用 reqwest 访问 `127.0.0.1:9090`；若进程继承系统代理（指向本机 mixed-port），
/// 这些请求会错误走代理，导致 `/proxies`、组延迟测试等全部失败。在创建插件/任意 HTTP 客户端之前写入 NO_PROXY。
fn ensure_loopback_in_no_proxy_env() {
    let loopback = "127.0.0.1,localhost,::1";

    for key in ["NO_PROXY", "no_proxy"] {
        let Ok(cur) = std::env::var(key) else {
            std::env::set_var(key, loopback);
            continue;
        };

        let cur = cur.trim();
        if cur.is_empty() {
            std::env::set_var(key, loopback);
            continue;
        }
        if cur == "*" {
            continue;
        }
        let has_loopback = cur.split(',').any(|p| {
            let p = p.trim();
            p == "127.0.0.1" || p == "localhost" || p == "::1"
        });
        if has_loopback {
            continue;
        }
        std::env::set_var(key, format!("{loopback},{cur}"));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    ensure_loopback_in_no_proxy_env();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_mihomo::Builder::new().build())
        .setup(|app| {
            let config_state = AureConfigState::load(app.handle())?;
            app.manage(config_state);
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
            download_geodata,
            load_app_settings,
            save_app_settings,
            load_latency_cache,
            save_latency_cache,
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
