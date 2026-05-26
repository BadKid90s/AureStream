//! GeoX 数据库下载命令。

use crate::network::geox;
use crate::runtime::RuntimeManager;
use tauri::{AppHandle, Manager, State};

/// 后台下载所有 geox 数据库（GeoIP/GeoSite）。
///
/// 通过 EventBus 发送进度事件。下载完成后再启动 Mihomo。
#[tauri::command]
pub async fn download_geox_databases(
    app: AppHandle,
    rt: State<'_, RuntimeManager>,
) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("无法获取本地数据目录: {}", e))?;

    geox::download_all(&data_dir, rt.events())
        .await
        .map_err(|e| format!("下载 geox 数据库失败: {}", e))
}

/// 检查 geox 数据库是否已全部缓存。
#[tauri::command]
pub async fn check_geox_cached(app: AppHandle) -> Result<bool, String> {
    let data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("无法获取本地数据目录: {}", e))?;

    Ok(geox::all_cached(&data_dir).await)
}
