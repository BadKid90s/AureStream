use serde::Serialize;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize)]
pub struct DownloadResult {
    pub path: String,
    pub content_length: usize,
}

#[tauri::command]
pub async fn download_subscription(
    app: AppHandle,
    provider_id: String,
    url: String,
) -> Result<DownloadResult, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get config dir: {}", e))?;

    let sub_dir = config_dir.join("subscriptions");
    tokio::fs::create_dir_all(&sub_dir)
        .await
        .map_err(|e| format!("Failed to create subscriptions dir: {}", e))?;

    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to fetch subscription: {}", e))?;

    let content = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    let file_path = sub_dir.join(format!("{}.yaml", provider_id));
    tokio::fs::write(&file_path, &content)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(DownloadResult {
        path: file_path.to_string_lossy().to_string(),
        content_length: content.len(),
    })
}

#[tauri::command]
pub async fn get_subscription_path(
    app: AppHandle,
    provider_id: String,
) -> Result<Option<String>, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get config dir: {}", e))?;

    let file_path = config_dir
        .join("subscriptions")
        .join(format!("{}.yaml", provider_id));

    if file_path.exists() {
        Ok(Some(file_path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn delete_subscription_file(
    app: AppHandle,
    provider_id: String,
) -> Result<(), String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get config dir: {}", e))?;

    let file_path = config_dir
        .join("subscriptions")
        .join(format!("{}.yaml", provider_id));

    if file_path.exists() {
        tokio::fs::remove_file(&file_path)
            .await
            .map_err(|e| format!("Failed to delete file: {}", e))?;
    }

    Ok(())
}
