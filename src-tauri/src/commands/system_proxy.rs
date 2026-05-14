//! 系统级代理：连接成功后写入 OS 代理设置，断开或退出时尽量关闭。
//! macOS：对 `networksetup -listallnetworkservices` 列出的已启用服务调用 `set*proxy`。
//! 其他平台：占位，后续可接 Windows 注册表 / Linux gsettings。

use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Command, Stdio};

use serde_yaml::Value;

fn run_networksetup(args: &[&str]) -> Result<(), String> {
    let out = Command::new("/usr/sbin/networksetup")
        .args(args)
        .stderr(Stdio::piped())
        .stdout(Stdio::piped())
        .output()
        .map_err(|e| format!("执行 networksetup 失败: {}", e))?;
    if !out.status.success() {
        let stderr = String::from_utf8_lossy(&out.stderr);
        let stdout = String::from_utf8_lossy(&out.stdout);
        return Err(format!(
            "networksetup {} 失败: {}",
            args.join(" "),
            if stderr.trim().is_empty() {
                stdout.trim().to_string()
            } else {
                stderr.trim().to_string()
            }
        ));
    }
    Ok(())
}

fn macos_list_network_services() -> Result<Vec<String>, String> {
    let out = Command::new("/usr/sbin/networksetup")
        .arg("-listallnetworkservices")
        .output()
        .map_err(|e| format!("列出网络服务失败: {}", e))?;
    if !out.status.success() {
        return Err(format!(
            "networksetup -listallnetworkservices 失败: {}",
            String::from_utf8_lossy(&out.stderr)
        ));
    }
    let reader = BufReader::new(out.stdout.as_slice());
    let mut services = Vec::new();
    for (i, line) in reader.lines().enumerate() {
        let line = line.map_err(|e| format!("读取 networksetup 输出失败: {}", e))?;
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if i == 0 && line.contains("asterisk") {
            continue;
        }
        if line.starts_with('*') {
            continue;
        }
        if line.ends_with('*') {
            continue;
        }
        services.push(line.to_string());
    }
    if services.is_empty() {
        return Err("未发现可用的网络服务（无法设置系统代理）".to_string());
    }
    Ok(services)
}

#[cfg(target_os = "macos")]
fn apply_macos(host: &str, http_port: u16, socks_port: u16) -> Result<(), String> {
    let services = macos_list_network_services()?;
    for svc in &services {
        run_networksetup(&["-setwebproxy", svc, host, &http_port.to_string()])?;
        run_networksetup(&["-setsecurewebproxy", svc, host, &http_port.to_string()])?;
        run_networksetup(&[
            "-setsocksfirewallproxy",
            svc,
            host,
            &socks_port.to_string(),
        ])?;
        run_networksetup(&["-setwebproxystate", svc, "on"])?;
        run_networksetup(&["-setsecurewebproxystate", svc, "on"])?;
        run_networksetup(&["-setsocksfirewallproxystate", svc, "on"])?;
    }
    Ok(())
}

#[cfg(target_os = "macos")]
fn clear_macos() -> Result<(), String> {
    let services = macos_list_network_services()?;
    for svc in &services {
        let _ = run_networksetup(&["-setwebproxystate", svc, "off"]);
        let _ = run_networksetup(&["-setsecurewebproxystate", svc, "off"]);
        let _ = run_networksetup(&["-setsocksfirewallproxystate", svc, "off"]);
    }
    Ok(())
}

/// 将 Mihomo 监听地址转换为写入系统代理的主机名（本机回环统一为 127.0.0.1）。
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub(crate) fn system_proxy_host(bind: &str) -> String {
    match bind {
        "0.0.0.0" | "::" | "[::]" => "127.0.0.1".to_string(),
        other => other.to_string(),
    }
}

/// 从 Mihomo YAML 读取 HTTP / SOCKS 端口（支持 `mixed-port` 或 `port` + `socks-port`）。
pub(crate) fn read_mihomo_inbound_ports(path: &Path) -> Result<(String, u16, u16), String> {
    let text =
        std::fs::read_to_string(path).map_err(|e| format!("读取 Mihomo 配置失败: {}", e))?;
    let v: Value = serde_yaml::from_str(&text).map_err(|e| format!("解析 Mihomo YAML 失败: {}", e))?;
    let bind = v
        .get("bind-address")
        .and_then(Value::as_str)
        .unwrap_or("127.0.0.1")
        .to_string();

    if let Some(m) = v.get("mixed-port").and_then(Value::as_u64) {
        let p: u16 = m
            .try_into()
            .map_err(|_| "mixed-port 超出 u16 范围".to_string())?;
        return Ok((bind, p, p));
    }

    let http: u16 = v
        .get("port")
        .and_then(Value::as_u64)
        .map(|x| {
            x.try_into()
                .map_err(|_| "port 超出 u16 范围".to_string())
        })
        .transpose()?
        .unwrap_or(7890);

    let socks: u16 = v
        .get("socks-port")
        .and_then(Value::as_u64)
        .map(|x| {
            x.try_into()
                .map_err(|_| "socks-port 超出 u16 范围".to_string())
        })
        .transpose()?
        .unwrap_or(7891);

    Ok((bind, http, socks))
}

pub(crate) fn apply_for_mihomo_config(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let (bind, http, socks) = read_mihomo_inbound_ports(path)?;
        let host = system_proxy_host(&bind);
        return apply_macos(&host, http, socks);
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = path;
        Ok(())
    }
}

pub(crate) fn clear_platform() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        return clear_macos();
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(())
    }
}
