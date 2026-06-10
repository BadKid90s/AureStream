//! RFC 8252 — OAuth 2.0 for Native Apps: loopback redirect server.
//! Starts a tiny HTTP server on a random port bound to 127.0.0.1.
//! The browser redirects here after user authorization.

use std::net::TcpListener;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

static CALLBACK_STATE: Mutex<Option<CallbackState>> = Mutex::new(None);

struct CallbackState {
    port: u16,
    code: Mutex<Option<String>>,
    error: Mutex<Option<String>>,
}

fn find_free_port() -> Option<u16> {
    for port in 18200..18300 {
        if TcpListener::bind(("127.0.0.1", port)).is_ok() {
            return Some(port);
        }
    }
    None
}

#[tauri::command]
pub fn start_oauth_server(app: AppHandle) -> Result<u16, String> {
    let port = find_free_port().ok_or("No free port available for OAuth callback")?;

    {
        let mut guard = CALLBACK_STATE.lock().map_err(|e| e.to_string())?;
        *guard = Some(CallbackState {
            port,
            code: Mutex::new(None),
            error: Mutex::new(None),
        });
    }

    let server = tiny_http::Server::http(&format!("127.0.0.1:{}", port))
        .map_err(|e| format!("Failed to start OAuth callback server: {}", e))?;

    std::thread::spawn(move || {
        // Accept exactly one request
        if let Ok(Some(req)) = server.recv_timeout(std::time::Duration::from_secs(120)) {
            let url = req.url().to_string();
            log::info!("[oauth] callback received: {}", url);

            // Parse and extract code/error
            if let Some(query) = url.split('?').nth(1) {
                let params: std::collections::HashMap<String, String> = url::form_urlencoded::parse(query.as_bytes())
                    .map(|(k, v)| (k.into_owned(), v.into_owned()))
                    .collect();

                if let Ok(mut guard) = CALLBACK_STATE.lock() {
                    if let Some(ref st) = *guard {
                        if let Some(code) = params.get("code") {
                            *st.code.lock().unwrap() = Some(code.clone());
                        }
                        if let Some(err) = params.get("error") {
                            *st.error.lock().unwrap() = Some(err.clone());
                        }
                    }
                }

                let html = r#"<!DOCTYPE html><html><head><meta charset="utf-8"><title>授权完成</title></head><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0"><div style="text-align:center"><h2>授权成功</h2><p>您可以关闭此页面并返回 AureStream</p></div></body></html>"#;
                let header: tiny_http::Header = "Content-Type: text/html; charset=utf-8".parse().unwrap();
                let _ = req.respond(tiny_http::Response::from_string(html).with_header(header));
            }
        }
        log::info!("[oauth] callback server stopped");
        let _ = app.emit("oauth_callback_received", "");
    });

    Ok(port)
}

#[tauri::command]
pub fn get_oauth_callback_code() -> Result<Option<String>, String> {
    let guard = CALLBACK_STATE.lock().map_err(|e| e.to_string())?;
    if let Some(ref st) = *guard {
        st.code.lock().map_err(|e| e.to_string()).map(|c| c.clone())
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn stop_oauth_server() -> Result<(), String> {
    let mut guard = CALLBACK_STATE.lock().map_err(|e| e.to_string())?;
    *guard = None;
    Ok(())
}
