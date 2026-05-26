//! 内置 Clash/Mihomo 运行时配置：`proxy-providers` 使用本地 YAML（type: file）+ 固定规则与单一 Selector。
//! Mihomo 将 `proxy-providers.path` 限制在 `-d`（home）及 SAFE_PATHS 之下；YAML 内使用**相对于 `-d` 的路径**
//! （如 `subscriptions/<id>.yaml`），并与侧进程传入的 `-d`（`app_local_data_dir()/mihomo-work`）一致，
//! 避免 Windows 上使用绝对规范化路径与用户目录推导不一致而导致 fatal。
//! 数据源仍在应用配置目录 `subscriptions/` 下，生成运行配置时会复制到 `mihomo-work/subscriptions/`。

use super::mihomo_constants::DEFAULT_MIXED_PORT;
use super::proxy::ProxyState;
use crate::adapter::mihomo::config_gen;
use crate::models::{RuntimePolicy, RuntimeProfile, SmartRoutingProfile};
use std::path::PathBuf;
use crate::runtime::RuntimeManager;
use tauri::{AppHandle, Manager, State};

/// 写入 `runtime/aurestream-mihomo.yaml`：`proxy-providers.type: file` 的 `path` 为相对 `-d` 的 **`subscriptions/<provider_id>.yaml`**（实体文件位于 `.../mihomo-work/subscriptions/`）。
/// 数据源为应用配置目录下 `subscriptions/<provider_id>.yaml`；每次生成时复制到镜像目录以同步内容。
#[tauri::command]
pub async fn build_runtime_config(
    app: AppHandle,
    provider_id: String,
    smart_routing: SmartRoutingProfile,
    proxy_state: State<'_, ProxyState>,
) -> Result<String, String> {
    let (listen, mixed_port) = {
        let mut config = proxy_state.config.lock().map_err(|e| e.to_string())?;
        config.listen = super::mihomo_constants::DEFAULT_LISTEN_ADDR.to_string();
        if config.mixed_port == 0 {
            config.mixed_port = DEFAULT_MIXED_PORT;
        }
        (config.listen.clone(), config.mixed_port)
    };

    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("无法获取应用配置目录: {}", e))?;

    let src = config_dir
        .join("subscriptions")
        .join(format!("{}.yaml", provider_id));

    if !src.is_file() {
        return Err("订阅本地配置文件不存在，请先在服务商页更新订阅".to_string());
    }

    let work_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("无法获取本地数据目录: {}", e))?
        .join(super::mihomo_constants::MIHOMO_WORK_DIR);

    let rel_path = config_gen::mirror_subscription_to_workdir(&src, &work_dir, &provider_id)
        .await
        .map_err(|e| format!("同步订阅文件到 mihomo-work 失败: {}", e))?;

    let rt = app.state::<RuntimeManager>();
    let endpoints = crate::storage::endpoint_repo::list_by_source(rt.pool(), &provider_id)
        .await
        .map_err(|e| format!("从数据库加载节点失败: {}", e))?;

    let profile = RuntimeProfile {
        endpoints,
        selected_node_id: None,
        policy: RuntimePolicy {
            smart_routing,
            ..Default::default()
        },
        dns: Default::default(),
        tun: Default::default(),
        listen,
        mixed_port,
    };

    let text = config_gen::generate_full_config(&rel_path, &profile)
        .map_err(|e| format!("生成配置失败: {}", e))?;

    let runtime_dir = config_dir.join("runtime");
    tokio::fs::create_dir_all(&runtime_dir)
        .await
        .map_err(|e| format!("创建 runtime 目录失败: {}", e))?;

    let out: PathBuf = runtime_dir.join("aurestream-mihomo.yaml");
    tokio::fs::write(&out, text.as_bytes())
        .await
        .map_err(|e| format!("写入运行配置失败: {}", e))?;

    Ok(out.to_string_lossy().to_string())
}
