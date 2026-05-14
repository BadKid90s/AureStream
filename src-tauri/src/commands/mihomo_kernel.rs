use std::path::{Path, PathBuf};

use serde_yaml::Value;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_shell::{process::CommandEvent, ShellExt};
use tokio::sync::Mutex;

pub struct MihomoKernelState {
    inner: Mutex<Option<MihomoChild>>,
}

struct MihomoChild {
    child: tauri_plugin_shell::process::CommandChild,
}

impl Default for MihomoKernelState {
    fn default() -> Self {
        Self {
            inner: Mutex::new(None),
        }
    }
}

const EXTERNAL_CONTROLLER: &str = "127.0.0.1:9090";

fn patch_subscription_yaml(raw: &str) -> Result<String, String> {
    let mut v: Value =
        serde_yaml::from_str(raw).map_err(|e| format!("解析订阅配置失败: {}", e))?;
    let map = match &mut v {
        Value::Mapping(m) => m,
        _ => return Err("订阅配置根节点不是 YAML 对象".to_string()),
    };
    map.insert(
        Value::String("external-controller".to_string()),
        Value::String(EXTERNAL_CONTROLLER.to_string()),
    );
    map.insert(Value::String("secret".to_string()), Value::String(String::new()));
    serde_yaml::to_string(&v).map_err(|e| format!("序列化配置失败: {}", e))
}

async fn write_patched_config(app: &AppHandle, subscription_path: &Path) -> Result<PathBuf, String> {
    let bytes = tokio::fs::read(subscription_path)
        .await
        .map_err(|e| format!("读取订阅文件失败: {}", e))?;
    let text = String::from_utf8(bytes).map_err(|e| format!("订阅文件不是有效 UTF-8: {}", e))?;

    let patched = patch_subscription_yaml(&text)?;

    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("无法获取应用配置目录: {}", e))?;
    let runtime_dir = config_dir.join("runtime");
    tokio::fs::create_dir_all(&runtime_dir)
        .await
        .map_err(|e| format!("创建 runtime 目录失败: {}", e))?;

    let out = runtime_dir.join("aureproxy-mihomo.yaml");
    tokio::fs::write(&out, patched.as_bytes())
        .await
        .map_err(|e| format!("写入运行配置失败: {}", e))?;

    Ok(out)
}

async fn wait_for_controller_ready() -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build()
        .map_err(|e| format!("构建 HTTP 客户端失败: {}", e))?;

    for _ in 0..60 {
        match client
            .get("http://127.0.0.1:9090/version")
            .send()
            .await
        {
            Ok(r) if r.status().is_success() => return Ok(()),
            _ => tokio::time::sleep(std::time::Duration::from_millis(150)).await,
        }
    }
    Err("等待 Mihomo API 就绪超时（请确认 127.0.0.1:9090 未被占用且 sidecar 可执行）".to_string())
}

/// 将订阅配置修正为与 `tauri-plugin-mihomo` 默认控制器地址一致，并写入应用配置目录。
#[tauri::command]
pub async fn patch_mihomo_subscription(
    app: AppHandle,
    subscription_path: String,
) -> Result<String, String> {
    let p = PathBuf::from(&subscription_path);
    if !p.is_file() {
        return Err("订阅配置文件不存在".to_string());
    }
    let out = write_patched_config(&app, &p).await?;
    Ok(out.to_string_lossy().to_string())
}

/// 启动（或重启）Mihomo sidecar，使用已打补丁的配置路径。
#[tauri::command]
pub async fn start_mihomo_kernel(
    app: AppHandle,
    state: State<'_, MihomoKernelState>,
    patched_config_path: String,
) -> Result<(), String> {
    let config = PathBuf::from(&patched_config_path);
    if !config.is_file() {
        return Err("运行配置不存在，请先调用 patch_mihomo_subscription".to_string());
    }

    let work_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("无法获取本地数据目录: {}", e))?
        .join("mihomo-work");
    tokio::fs::create_dir_all(&work_dir)
        .await
        .map_err(|e| format!("创建工作目录失败: {}", e))?;

    {
        let mut guard = state.inner.lock().await;
        if let Some(MihomoChild { child }) = guard.take() {
            let _ = child.kill();
        }
    }

    let cfg_str = config
        .to_str()
        .ok_or_else(|| "配置路径含非法字符".to_string())?
        .to_string();
    let work_str = work_dir
        .to_str()
        .ok_or_else(|| "工作目录路径含非法字符".to_string())?
        .to_string();

    let sidecar = app
        .shell()
        .sidecar("mihomo")
        .map_err(|e| format!("加载 Mihomo sidecar 失败: {}（开发环境请确认已下载 binaries）", e))?
        .args(["-f", &cfg_str, "-d", &work_str]);

    let (mut rx, child) = sidecar
        .spawn()
        .map_err(|e| format!("启动 Mihomo 进程失败: {}", e))?;

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stderr(line) => {
                    eprintln!("[mihomo] {}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Stdout(line) => {
                    eprintln!("[mihomo] {}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Error(err) => {
                    eprintln!("[mihomo] {err}");
                }
                _ => {}
            }
        }
    });

    {
        let mut guard = state.inner.lock().await;
        *guard = Some(MihomoChild { child });
    }

    wait_for_controller_ready().await?;
    Ok(())
}

/// 结束由本进程拉起的 Mihomo sidecar。
#[tauri::command]
pub async fn stop_mihomo_kernel(state: State<'_, MihomoKernelState>) -> Result<(), String> {
    let mut guard = state.inner.lock().await;
    if let Some(MihomoChild { child }) = guard.take() {
        child
            .kill()
            .map_err(|e| format!("终止 Mihomo 进程失败: {}", e))?;
    }
    Ok(())
}
