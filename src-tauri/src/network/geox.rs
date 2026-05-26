//! GeoIP/GeoSite 数据库下载服务。
//!
//! 应用启动后后台下载，下载完成后再由用户启动 Mihomo。

use std::path::PathBuf;
use tokio::fs;
use tokio::io::AsyncWriteExt;

use crate::adapter::mihomo::constants::GEODATA;
use crate::error::AppError;
use crate::models::AppEvent;
use crate::runtime::EventBus;

/// geox 数据库本地缓存目录名
const GEOX_CACHE_DIR: &str = "geox-cache";

/// 检查所有 geox 数据库是否已缓存
pub async fn all_cached(data_dir: &PathBuf) -> bool {
    let cache_dir = data_dir.join(GEOX_CACHE_DIR);
    for entry in GEODATA {
        let filename = url_filename(entry.url);
        let path = cache_dir.join(&filename);
        if !path.exists() {
            return false;
        }
    }
    true
}


/// 后台下载所有 geox 数据库
///
/// 通过 EventBus 发送进度事件。下载完成后可直接启动 Mihomo。
pub async fn download_all(
    data_dir: &PathBuf,
    event_bus: &EventBus,
) -> Result<(), AppError> {
    let cache_dir = data_dir.join(GEOX_CACHE_DIR);
    fs::create_dir_all(&cache_dir).await.map_err(AppError::Io)?;

    event_bus.publish(AppEvent::GeoxDownloadStarted);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(AppError::Http)?;

    let total = GEODATA.len();
    for (i, entry) in GEODATA.iter().enumerate() {
        let filename = url_filename(entry.url);
        let path = cache_dir.join(&filename);

        // 已缓存则跳过
        if path.exists() {
            let percent = ((i + 1) * 100 / total) as u8;
            event_bus.publish(AppEvent::GeoxDownloadProgress {
                file: filename.clone(),
                percent,
            });
            continue;
        }

        event_bus.publish(AppEvent::GeoxDownloadProgress {
            file: filename.clone(),
            percent: (i * 100 / total) as u8,
        });

        match download_file(&client, entry.url, &path).await {
            Ok(_) => {
                tracing::info!(file = %filename, "geox 数据库下载完成");
            }
            Err(e) => {
                tracing::warn!(file = %filename, error = %e, "geox 数据库下载失败");
                event_bus.publish(AppEvent::GeoxDownloadCompleted {
                    success: false,
                    message: format!("下载 {} 失败: {}", filename, e),
                });
                return Err(e);
            }
        }

        let percent = ((i + 1) * 100 / total) as u8;
        event_bus.publish(AppEvent::GeoxDownloadProgress {
            file: filename,
            percent,
        });
    }

    event_bus.publish(AppEvent::GeoxDownloadCompleted {
        success: true,
        message: "所有规则数据库下载完成".to_string(),
    });

    Ok(())
}

async fn download_file(
    client: &reqwest::Client,
    url: &str,
    dest: &PathBuf,
) -> Result<(), AppError> {
    let resp = client.get(url).send().await.map_err(AppError::Http)?;
    let bytes = resp.bytes().await.map_err(AppError::Http)?;

    let mut file = fs::File::create(dest).await.map_err(AppError::Io)?;
    file.write_all(&bytes).await.map_err(AppError::Io)?;

    Ok(())
}

fn url_filename(url: &str) -> String {
    url.rsplit('/').next().unwrap_or("unknown").to_string()
}
