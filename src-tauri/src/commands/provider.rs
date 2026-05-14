use crate::commands::mihomo_constants::{LATENCY_TEST_TCP_HOST, LATENCY_TEST_TCP_PORT};
use crate::commands::{LatencyResult, Node, Provider};
use crate::DbState;
use tauri::State;

fn row_to_provider(row: &rusqlite::Row) -> rusqlite::Result<Provider> {
    Ok(Provider {
        id: row.get("id")?,
        name: row.get("name")?,
        url: row.get("url")?,
        last_updated: row.get("last_updated")?,
        node_count: row.get::<_, i64>("node_count")? as usize,
        traffic_total_gb: row.get("traffic_total_gb")?,
        traffic_used_gb: row.get("traffic_used_gb")?,
        expires_at: row.get("expires_at")?,
        auto_update_interval: row.get::<_, Option<i64>>("auto_update_interval")?.map(|v| v as u32),
    })
}

fn row_to_node(row: &rusqlite::Row) -> rusqlite::Result<Node> {
    Ok(Node {
        id: row.get("id")?,
        name: row.get("name")?,
        provider_id: row.get("provider_id")?,
        r#type: row.get("type")?,
        server: row.get("server")?,
        port: row.get::<_, i64>("port")? as u16,
        delay: row.get::<_, Option<i64>>("delay")?.map(|v| v as u32),
        enabled: row.get::<_, i64>("enabled")? != 0,
    })
}

#[tauri::command]
pub fn add_provider(state: State<DbState>, provider: Provider) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO providers (id, name, url, last_updated, node_count, traffic_total_gb, traffic_used_gb, expires_at, auto_update_interval)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![
            provider.id,
            provider.name,
            provider.url,
            provider.last_updated,
            provider.node_count as i64,
            provider.traffic_total_gb,
            provider.traffic_used_gb,
            provider.expires_at,
            provider.auto_update_interval.map(|v| v as i64),
        ],
    )
    .map_err(|e| format!("Failed to add provider: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn update_provider(
    state: State<DbState>,
    id: String,
    updates: Provider,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE providers SET name=?1, url=?2, last_updated=?3, node_count=?4,
         traffic_total_gb=?5, traffic_used_gb=?6, expires_at=?7, auto_update_interval=?8
         WHERE id=?9",
        rusqlite::params![
            updates.name,
            updates.url,
            updates.last_updated,
            updates.node_count as i64,
            updates.traffic_total_gb,
            updates.traffic_used_gb,
            updates.expires_at,
            updates.auto_update_interval.map(|v| v as i64),
            id,
        ],
    )
    .map_err(|e| format!("Failed to update provider: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn delete_provider(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM nodes WHERE provider_id = ?1", [&id])
        .map_err(|e| format!("Failed to delete nodes: {}", e))?;
    conn.execute("DELETE FROM providers WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete provider: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn get_providers(state: State<DbState>) -> Result<Vec<Provider>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, url, last_updated, node_count, traffic_total_gb, traffic_used_gb, expires_at, auto_update_interval FROM providers")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    let providers = stmt
        .query_map([], row_to_provider)
        .map_err(|e| format!("Failed to query providers: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect providers: {}", e))?;
    Ok(providers)
}

#[tauri::command]
pub fn get_nodes(state: State<DbState>) -> Result<Vec<Node>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, provider_id, type, server, port, delay, enabled FROM nodes")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    let nodes = stmt
        .query_map([], row_to_node)
        .map_err(|e| format!("Failed to query nodes: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect nodes: {}", e))?;
    Ok(nodes)
}

#[tauri::command]
pub fn get_nodes_by_provider(
    state: State<DbState>,
    provider_id: String,
) -> Result<Vec<Node>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, provider_id, type, server, port, delay, enabled FROM nodes WHERE provider_id = ?1")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    let nodes = stmt
        .query_map([&provider_id], row_to_node)
        .map_err(|e| format!("Failed to query nodes: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect nodes: {}", e))?;
    Ok(nodes)
}

async fn tcp_latency_to_health_check_host() -> (Option<u32>, Option<String>) {
    let addr = format!("{}:{}", LATENCY_TEST_TCP_HOST, LATENCY_TEST_TCP_PORT);
    let start = std::time::Instant::now();

    match tokio::time::timeout(
        std::time::Duration::from_secs(5),
        tokio::net::TcpStream::connect(&addr),
    )
    .await
    {
        Ok(Ok(_)) => (
            Some(start.elapsed().as_millis() as u32),
            None::<String>,
        ),
        Ok(Err(e)) => (None, Some(e.to_string())),
        Err(_) => (None, Some("Connection timeout".to_string())),
    }
}

#[tauri::command]
#[allow(unused_variables)]
pub async fn test_node_latency(node_id: String, server: String, port: u16) -> LatencyResult {
    let (delay, error) = tcp_latency_to_health_check_host().await;
    LatencyResult {
        node_id,
        delay,
        error,
    }
}

#[tauri::command]
pub async fn test_all_nodes_latency(
    state: State<'_, DbState>,
) -> Result<Vec<LatencyResult>, String> {
    let node_ids: Vec<String> = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id FROM nodes WHERE enabled = 1")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        rows
    };

    if node_ids.is_empty() {
        return Ok(Vec::new());
    }

    let (delay, error) = tcp_latency_to_health_check_host().await;
    let results = node_ids
        .into_iter()
        .map(|node_id| LatencyResult {
            node_id,
            delay,
            error: error.clone(),
        })
        .collect();
    Ok(results)
}
