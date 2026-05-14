use rusqlite::{Connection, Result};
use tauri::{AppHandle, Manager};

pub fn init_db(app: &AppHandle) -> Result<Connection, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get config dir: {}", e))?;

    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create config dir: {}", e))?;

    let db_path = config_dir.join("aureproxy.db");
    let conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
        .map_err(|e| format!("Failed to set pragmas: {}", e))?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS providers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            last_updated TEXT NOT NULL DEFAULT '',
            node_count INTEGER NOT NULL DEFAULT 0,
            traffic_total_gb REAL,
            traffic_used_gb REAL,
            expires_at TEXT,
            auto_update_interval INTEGER
        );

        CREATE TABLE IF NOT EXISTS nodes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            provider_id TEXT NOT NULL,
            type TEXT NOT NULL,
            server TEXT NOT NULL,
            port INTEGER NOT NULL,
            delay INTEGER,
            enabled INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
        );",
    )
    .map_err(|e| format!("Failed to create tables: {}", e))?;

    Ok(conn)
}
