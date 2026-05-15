mod commands;
mod config;

use commands::builtin_config::build_aureproxy_mihomo_config;
use commands::mihomo_kernel::{download_geodata, start_mihomo_kernel, stop_mihomo_kernel, MihomoKernelState};
use commands::proxy::{get_proxy_config, get_proxy_status, set_current_node, start_proxy, stop_proxy, update_proxy_config, ProxyState};
use commands::provider::{add_provider, delete_provider, get_nodes, get_nodes_by_provider, get_providers, test_all_nodes_latency, test_node_latency, update_provider};
use commands::settings::{load_app_settings, load_latency_cache, save_app_settings, save_latency_cache};
use commands::subscription::{delete_subscription_file, download_subscription, get_subscription_path};
use config::AureConfigState;
use log::info;
use std::path::PathBuf;
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

    // 日志目录：优先 %LOCALAPPDATA%，回退 %APPDATA%
    let log_dir = PathBuf::from(
        std::env::var("LOCALAPPDATA")
            .or_else(|_| std::env::var("APPDATA"))
            .unwrap_or_else(|_| ".".to_string()),
    )
    .join("com.root.aureproxy")
    .join("logs");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_mihomo::Builder::new().build())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    // 应用日志写入文件（排除 mihomo 标签的输出）
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Folder {
                        path: log_dir.clone(),
                        file_name: Some("aureproxy".to_string()),
                    })
                    .filter(|metadata| metadata.target() != "mihomo"),
                    // 控制台输出（dev 模式可见，排除 mihomo）
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout)
                        .filter(|metadata| metadata.target() != "mihomo"),
                ])
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                .max_file_size(5_000_000)
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(move |app| {
            // 打印日志目录，方便定位
            eprintln!("[aureproxy] 日志目录: {}", log_dir.display());
            info!("AureProxy 启动中...");
            let config_state = AureConfigState::load(app.handle())?;
            app.manage(config_state);
            app.manage(ProxyState::default());
            app.manage(MihomoKernelState::default());
            info!("应用状态初始化完成");
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
