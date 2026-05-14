//! 系统级代理：连接成功后写入 OS 代理设置，断开或退出时尽量关闭。
//! macOS：对 `networksetup -listallnetworkservices` 列出的已启用服务调用 `set*proxy`。
//! 其他平台：占位，后续可接 Windows 注册表 / Linux gsettings。

use crate::commands::ProxyConfig;
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};

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
fn apply_macos(config: &ProxyConfig) -> Result<(), String> {
    if config.mixed_port == 0 {
        return Err("系统代理端口未就绪，请重新连接".to_string());
    }
    let host = system_proxy_host(&config.listen);
    let port = config.mixed_port.to_string();
    let bypass_domains = parse_bypass_domains(&config.bypass_domains);
    let services = macos_list_network_services()?;
    for svc in &services {
        run_networksetup(&["-setwebproxy", svc, &host, &port])?;
        run_networksetup(&["-setsecurewebproxy", svc, &host, &port])?;
        run_networksetup(&["-setsocksfirewallproxy", svc, &host, &port])?;
        if bypass_domains.is_empty() {
            run_networksetup(&["-setproxybypassdomains", svc, "Empty"])?;
        } else {
            let mut args: Vec<&str> = Vec::with_capacity(2 + bypass_domains.len());
            args.push("-setproxybypassdomains");
            args.push(svc.as_str());
            for domain in &bypass_domains {
                args.push(domain.as_str());
            }
            run_networksetup(&args)?;
        }
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

#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
fn parse_bypass_domains(raw: &str) -> Vec<String> {
    raw.split([',', ';', '\n', '\r'])
        .map(str::trim)
        .filter(|item| !item.is_empty())
        .map(ToString::to_string)
        .collect()
}

pub(crate) fn apply_platform(config: &ProxyConfig) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        return apply_macos(config);
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = config;
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
