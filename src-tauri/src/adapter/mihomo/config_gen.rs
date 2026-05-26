//! [`RuntimeProfile`] → Mihomo 完整 YAML 配置。
//!
//! 智能路由版本：4 组代理组（AUTO / AI / STREAM / FALLBACK）+ 动态规则 + 广告拦截 rule-providers。

use serde_yaml::{Mapping, Value};
use std::path::PathBuf;

use crate::error::AppError;
use crate::models::{RoutingMode, RuntimeProfile};

use super::constants::{
    AURESTREAM_NODE_SELECTOR, EXTERNAL_CONTROLLER, GEODATA, GROUP_AI, GROUP_AUTO, GROUP_FALLBACK,
    GROUP_STREAM, LATENCY_TEST_URL,
};

const PROXY_PROVIDER_KEY: &str = "AureStream_Sub";

/// 生成完整的 Mihomo YAML 配置。
///
/// - `subscription_path_relative_home`: **相对** Mihomo `-d`（工作目录）的路径，通常为 `subscriptions/<provider_id>.yaml`。
///   使用绝对路径在 Windows 上易与 Mihomo SAFE_PATH（用户目录规范化）不一致并报 fatal；相对路径与各平台一致解析。
/// - `profile`: 运行时配置（listen、mixed_port、routing_mode 等）
pub fn generate_full_config(
    subscription_path_relative_home: &str,
    profile: &RuntimeProfile,
) -> Result<String, AppError> {
    let mut root = Mapping::new();

    // 基础配置
    root.insert(
        Value::String("bind-address".into()),
        Value::String(profile.listen.clone()),
    );
    root.insert(
        Value::String("mixed-port".into()),
        Value::Number(profile.mixed_port.into()),
    );
    root.insert(Value::String("ipv6".into()), Value::Bool(false));

    let mode = match profile.policy.routing_mode {
        RoutingMode::RuleBased => "rule",
        RoutingMode::FullTunnel => "global",
        RoutingMode::Direct => "direct",
    };
    root.insert(
        Value::String("mode".into()),
        Value::String(mode.into()),
    );
    root.insert(
        Value::String("log-level".into()),
        Value::String("info".into()),
    );
    root.insert(Value::String("allow-lan".into()), Value::Bool(false));
    root.insert(
        Value::String("external-controller".into()),
        Value::String(EXTERNAL_CONTROLLER.into()),
    );
    root.insert(Value::String("secret".into()), Value::String(String::new()));

    // geox-url（GeoIP/GeoSite 规则数据库）
    let mut geox_url = Mapping::new();
    for entry in GEODATA {
        geox_url.insert(
            Value::String(entry.geox_key.to_string()),
            Value::String(entry.url.to_string()),
        );
    }
    root.insert(
        Value::String("geox-url".into()),
        Value::Mapping(geox_url),
    );

    // DNS 配置（fake-ip + 分流 nameserver-policy）
    root.insert(Value::String("dns".into()), build_dns_config(&profile.policy.smart_routing));

    // TUN 配置
    let mut tun = Mapping::new();
    tun.insert(Value::String("enable".into()), Value::Bool(profile.tun.enabled));
    tun.insert(Value::String("auto-route".into()), Value::Bool(profile.tun.enabled));
    tun.insert(Value::String("auto-detect-interface".into()), Value::Bool(profile.tun.enabled));
    tun.insert(Value::String("dns-hijack".into()), Value::Sequence(vec![
        Value::String("any:53".into()),
    ]));
    root.insert(Value::String("tun".into()), Value::Mapping(tun));

    // proxy-providers（file 类型，指向本地订阅文件）
    let mut hc = Mapping::new();
    hc.insert(Value::String("enable".into()), Value::Bool(true));
    hc.insert(Value::String("interval".into()), Value::Number(300.into()));
    hc.insert(
        Value::String("url".into()),
        Value::String(LATENCY_TEST_URL.into()),
    );

    let mut prov = Mapping::new();
    prov.insert(Value::String("type".into()), Value::String("file".into()));
    prov.insert(
        Value::String("path".into()),
        Value::String(subscription_path_relative_home.to_string()),
    );
    prov.insert(Value::String("interval".into()), Value::Number(3600.into()));
    prov.insert(Value::String("health-check".into()), Value::Mapping(hc));

    let mut providers = Mapping::new();
    providers.insert(
        Value::String(PROXY_PROVIDER_KEY.into()),
        Value::Mapping(prov),
    );
    root.insert(
        Value::String("proxy-providers".into()),
        Value::Mapping(providers),
    );

    // proxy-groups（4 组：AUTO / AI / STREAM / FALLBACK）
    root.insert(
        Value::String("proxy-groups".into()),
        build_proxy_groups(profile),
    );

    // rule-providers（广告拦截规则集）
    if profile.policy.smart_routing.enable_smart_route && profile.policy.smart_routing.enable_adblock {
        root.insert(
            Value::String("rule-providers".into()),
            build_adblock_rule_providers(),
        );
    }

    // rules
    let rules = build_rules(&profile.policy.smart_routing);
    root.insert(
        Value::String("rules".into()),
        Value::Sequence(rules.into_iter().map(Value::String).collect()),
    );

    serde_yaml::to_string(&Value::Mapping(root)).map_err(AppError::Yaml)
}

/// 构建 DNS 配置：fake-ip 模式 + CN/非 CN 分流 + 广告过滤 DNS 插入
fn build_dns_config(smart: &crate::models::SmartRoutingProfile) -> Value {
    let mut dns = Mapping::new();
    dns.insert(Value::String("enable".into()), Value::Bool(true));
    dns.insert(Value::String("enhanced-mode".into()), Value::String("fake-ip".into()));
    dns.insert(
        Value::String("fake-ip-range".into()),
        Value::String("198.18.0.1/16".into()),
    );

    // 默认 nameserver（国内 DoH）
    let mut nameservers = vec![
        Value::String("https://doh.pub/dns-query".into()),
        Value::String("https://dns.alidns.com/dns-query".into()),
    ];

    // fallback（国外 DoH，用于非 CN 域名）
    let mut fallbacks = vec![
        Value::String("https://1.1.1.1/dns-query".into()),
        Value::String("https://dns.google/dns-query".into()),
    ];

    // 如果开启了智能分流且开启了去广告，则在 nameserver 和 fallback 的首位插入 AdGuard 过滤 DNS
    if smart.enable_smart_route && smart.enable_adblock {
        nameservers.insert(0, Value::String("https://dns.adguard-dns.com/dns-query".into()));
        fallbacks.insert(0, Value::String("https://dns.adguard-dns.com/dns-query".into()));
    }

    dns.insert(
        Value::String("nameserver".into()),
        Value::Sequence(nameservers),
    );

    dns.insert(
        Value::String("fallback".into()),
        Value::Sequence(fallbacks),
    );

    // nameserver-policy：CN 域名用国内 DNS，其他用 fallback
    let mut ns_policy = Mapping::new();
    ns_policy.insert(
        Value::String("geosite:cn".into()),
        Value::String("https://doh.pub/dns-query".into()),
    );
    ns_policy.insert(
        Value::String("geosite:!cn".into()),
        Value::Sequence(vec![
            Value::String("https://1.1.1.1/dns-query".into()),
            Value::String("https://dns.google/dns-query".into()),
        ]),
    );
    dns.insert(
        Value::String("nameserver-policy".into()),
        Value::Mapping(ns_policy),
    );

    Value::Mapping(dns)
}

fn escape_regex(s: &str) -> String {
    let mut escaped = String::new();
    for c in s.chars() {
        if c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' {
            escaped.push(c);
        } else {
            escaped.push('\\');
            escaped.push(c);
        }
    }
    escaped
}

/// 构建 4 个代理组：AUTO（自动选优）、AI（AI 服务专用）、STREAM（流媒体专用）、FALLBACK（故障转移）
fn build_proxy_groups(profile: &RuntimeProfile) -> Value {
    let common_use = vec![Value::String(PROXY_PROVIDER_KEY.into())];

    let ai_regions = ["US", "SG", "JP", "TW", "KR", "GB", "DE", "FR"];
    let stream_regions = ["HK", "TW", "SG", "JP", "US"];

    let ai_nodes: Vec<&str> = profile.endpoints.iter()
        .filter(|ep| {
            if let Some(ref country) = ep.metadata.country {
                ai_regions.contains(&country.to_uppercase().as_str())
            } else {
                false
            }
        })
        .map(|ep| ep.name.as_str())
        .collect();

    let stream_nodes: Vec<&str> = profile.endpoints.iter()
        .filter(|ep| {
            if let Some(ref country) = ep.metadata.country {
                stream_regions.contains(&country.to_uppercase().as_str())
            } else {
                false
            }
        })
        .map(|ep| ep.name.as_str())
        .collect();

    let ai_filter = if ai_nodes.is_empty() {
        "^$".to_string()
    } else {
        let escaped: Vec<String> = ai_nodes.into_iter().map(escape_regex).collect();
        format!("^(?:{})$", escaped.join("|"))
    };

    let stream_filter = if stream_nodes.is_empty() {
        "^$".to_string()
    } else {
        let escaped: Vec<String> = stream_nodes.into_iter().map(escape_regex).collect();
        format!("^(?:{})$", escaped.join("|"))
    };

    // AUTO：url-test，自动选择延迟最低的节点
    let mut auto_group = Mapping::new();
    auto_group.insert(Value::String("name".into()), Value::String(GROUP_AUTO.into()));
    auto_group.insert(Value::String("type".into()), Value::String("url-test".into()));
    auto_group.insert(Value::String("use".into()), Value::Sequence(common_use.clone()));
    auto_group.insert(
        Value::String("url".into()),
        Value::String(LATENCY_TEST_URL.into()),
    );
    auto_group.insert(Value::String("interval".into()), Value::Number(300.into()));
    auto_group.insert(Value::String("tolerance".into()), Value::Number(50.into()));

    // AI：url-test，用于 AI 服务路由，使用 OpenAI 专用探针
    let mut ai_group = Mapping::new();
    ai_group.insert(Value::String("name".into()), Value::String(GROUP_AI.into()));
    ai_group.insert(Value::String("type".into()), Value::String("url-test".into()));
    ai_group.insert(Value::String("use".into()), Value::Sequence(common_use.clone()));
    ai_group.insert(
        Value::String("url".into()),
        Value::String("https://chat.openai.com/cdn-cgi/trace".into()),
    );
    ai_group.insert(Value::String("filter".into()), Value::String(ai_filter));
    ai_group.insert(Value::String("interval".into()), Value::Number(300.into()));
    ai_group.insert(Value::String("tolerance".into()), Value::Number(50.into()));

    // STREAM：url-test，用于流媒体服务路由，使用 Netflix 专用探针
    let mut stream_group = Mapping::new();
    stream_group.insert(Value::String("name".into()), Value::String(GROUP_STREAM.into()));
    stream_group.insert(Value::String("type".into()), Value::String("url-test".into()));
    stream_group.insert(Value::String("use".into()), Value::Sequence(common_use.clone()));
    stream_group.insert(
        Value::String("url".into()),
        Value::String("https://www.netflix.com/title/80018499".into()),
    );
    stream_group.insert(Value::String("filter".into()), Value::String(stream_filter));
    stream_group.insert(Value::String("interval".into()), Value::Number(300.into()));
    stream_group.insert(Value::String("tolerance".into()), Value::Number(50.into()));

    // FALLBACK：故障转移
    let mut fallback_group = Mapping::new();
    fallback_group.insert(Value::String("name".into()), Value::String(GROUP_FALLBACK.into()));
    fallback_group.insert(Value::String("type".into()), Value::String("fallback".into()));
    fallback_group.insert(Value::String("use".into()), Value::Sequence(common_use.clone()));
    fallback_group.insert(
        Value::String("url".into()),
        Value::String(LATENCY_TEST_URL.into()),
    );
    fallback_group.insert(Value::String("interval".into()), Value::Number(300.into()));

    // 顶层 Selector（保留兼容，前端可通过此组手动选择任意节点）
    let selector_proxies = vec![
        Value::String(GROUP_AUTO.into()),
        Value::String(GROUP_AI.into()),
        Value::String(GROUP_STREAM.into()),
        Value::String(GROUP_FALLBACK.into()),
    ];

    let mut selector = Mapping::new();
    selector.insert(
        Value::String("name".into()),
        Value::String(AURESTREAM_NODE_SELECTOR.into()),
    );
    selector.insert(Value::String("type".into()), Value::String("select".into()));
    selector.insert(
        Value::String("proxies".into()),
        Value::Sequence(selector_proxies),
    );
    selector.insert(
        Value::String("use".into()),
        Value::Sequence(common_use.clone()),
    );

    Value::Sequence(vec![
        Value::Mapping(selector),
        Value::Mapping(auto_group),
        Value::Mapping(ai_group),
        Value::Mapping(stream_group),
        Value::Mapping(fallback_group),
    ])
}

/// 构建广告拦截 rule-providers
fn build_adblock_rule_providers() -> Value {
    let mut providers = Mapping::new();

    let rulesets = [
        ("reject", "https://cdn.jsdelivr.net/gh/dler-io/Rules@main/Clash/Provider/Reject.yaml"),
        ("privacy", "https://cdn.jsdelivr.net/gh/dler-io/Rules@main/Clash/Provider/Privacy.yaml"),
        ("hijacking", "https://cdn.jsdelivr.net/gh/dler-io/Rules@main/Clash/Provider/Hijacking.yaml"),
    ];

    for (name, url) in &rulesets {
        let mut provider = Mapping::new();
        provider.insert(Value::String("type".into()), Value::String("http".into()));
        provider.insert(Value::String("behavior".into()), Value::String("domain".into()));
        provider.insert(Value::String("url".into()), Value::String(url.to_string()));
        provider.insert(Value::String("path".into()), Value::String(format!("./ruleset/{}.yaml", name)));
        provider.insert(Value::String("interval".into()), Value::Number(86400.into()));
        providers.insert(Value::String((*name).to_string()), Value::Mapping(provider));
    }

    Value::Mapping(providers)
}

/// 构建路由规则
fn build_rules(smart: &crate::models::SmartRoutingProfile) -> Vec<String> {
    let mut rules = Vec::new();

    // 基础直连规则
    rules.push("DOMAIN,localhost,DIRECT".into());
    rules.push("IP-CIDR,127.0.0.0/8,DIRECT,no-resolve".into());
    rules.push("GEOIP,private,DIRECT".into());

    // 只有在开启了智能分流器时，才启用高级分流路由规则
    if smart.enable_smart_route {
        // 广告拦截规则（优先级最高，直接 REJECT）
        if smart.enable_adblock {
            if !smart.adblock_rules.is_empty() {
                for rule in &smart.adblock_rules {
                    rules.push(rule.clone());
                }
            } else {
                rules.push("GEOSITE,category-ads-all,REJECT".into());
                rules.push("RULE-SET,reject,REJECT".into());
                rules.push("RULE-SET,privacy,REJECT".into());
                rules.push("RULE-SET,hijacking,REJECT".into());
            }
        }

        // 用户自定义扩展规则（高优先级）
        for rule in &smart.custom_rules {
            rules.push(rule.clone());
        }

        // AI 服务路由
        if smart.enable_ai_route {
            if !smart.ai_rules.is_empty() {
                for rule in &smart.ai_rules {
                    rules.push(rule.clone());
                }
            } else {
                // Geosite 规则
                rules.push(format!("GEOSITE,openai,{}", GROUP_AI));
                rules.push(format!("GEOSITE,anthropic,{}", GROUP_AI));
                rules.push(format!("GEOSITE,gemini,{}", GROUP_AI));
                rules.push(format!("GEOSITE,google-gemini,{}", GROUP_AI));
                rules.push(format!("GEOSITE,copilot,{}", GROUP_AI));

                // ChatGPT / OpenAI
                rules.push(format!("DOMAIN-SUFFIX,openai.com,{}", GROUP_AI));
                rules.push(format!("DOMAIN-SUFFIX,chatgpt.com,{}", GROUP_AI));
                rules.push(format!("DOMAIN-SUFFIX,oaistatic.com,{}", GROUP_AI));
                rules.push(format!("DOMAIN-SUFFIX,oaiusercontent.com,{}", GROUP_AI));

                // Claude / Anthropic
                rules.push(format!("DOMAIN-SUFFIX,anthropic.com,{}", GROUP_AI));
                rules.push(format!("DOMAIN-SUFFIX,claude.ai,{}", GROUP_AI));
                rules.push(format!("DOMAIN-SUFFIX,claudeusercontent.com,{}", GROUP_AI));

                // Gemini
                rules.push(format!("DOMAIN-SUFFIX,gemini.google,{}", GROUP_AI));
                rules.push(format!("DOMAIN-SUFFIX,gemini.google.com,{}", GROUP_AI));
                rules.push(format!("DOMAIN-SUFFIX,aistudio.google.com,{}", GROUP_AI));
                rules.push(format!("DOMAIN-SUFFIX,generativelanguage.googleapis.com,{}", GROUP_AI));
                rules.push(format!("DOMAIN-SUFFIX,ai.google.dev,{}", GROUP_AI));
                rules.push(format!("DOMAIN-SUFFIX,bard.google.com,{}", GROUP_AI));

                // Grok
                rules.push(format!("DOMAIN-SUFFIX,x.ai,{}", GROUP_AI));
                rules.push(format!("DOMAIN-SUFFIX,grok.com,{}", GROUP_AI));

                // Perplexity
                rules.push(format!("DOMAIN-SUFFIX,perplexity.ai,{}", GROUP_AI));

                // Midjourney
                rules.push(format!("DOMAIN-SUFFIX,midjourney.com,{}", GROUP_AI));

                // Cursor
                rules.push(format!("DOMAIN-SUFFIX,cursor.com,{}", GROUP_AI));
                rules.push(format!("DOMAIN-SUFFIX,cursor.sh,{}", GROUP_AI));

                // GitHub Copilot
                rules.push(format!("DOMAIN-SUFFIX,githubcopilot.com,{}", GROUP_AI));
                rules.push(format!("DOMAIN-SUFFIX,copilot.microsoft.com,{}", GROUP_AI));

                // Poe
                rules.push(format!("DOMAIN-SUFFIX,poe.com,{}", GROUP_AI));

                // Notion AI
                rules.push(format!("DOMAIN-SUFFIX,notion.so,{}", GROUP_AI));

                // Suno
                rules.push(format!("DOMAIN-SUFFIX,suno.com,{}", GROUP_AI));
                rules.push(format!("DOMAIN-SUFFIX,suno.ai,{}", GROUP_AI));

                // ElevenLabs
                rules.push(format!("DOMAIN-SUFFIX,elevenlabs.io,{}", GROUP_AI));

                // Stability AI
                rules.push(format!("DOMAIN-SUFFIX,stability.ai,{}", GROUP_AI));
            }
        }

        // 流媒体路由
        if smart.enable_streaming {
            if !smart.streaming_rules.is_empty() {
                for rule in &smart.streaming_rules {
                    rules.push(rule.clone());
                }
            } else {
                for svc in &["netflix", "youtube", "disney", "spotify", "bilibili"] {
                    rules.push(format!("GEOSITE,{},{}", svc, GROUP_STREAM));
                }
            }
        }

        // 国内直连
        rules.push("GEOIP,CN,DIRECT".into());
        rules.push("GEOSITE,cn,DIRECT".into());
    }

    // 默认走用户选择的组/节点（智能分流时作为兜底出口，关闭分流时作为全局代理出口）
    rules.push(format!("MATCH,{}", AURESTREAM_NODE_SELECTOR));

    rules
}

/// 将订阅文件复制到 `work_dir/subscriptions/<provider_id>.yaml`，并返回**相对 `-d`** 的路径字符串。
///
/// Mihomo 将 `proxy-providers.path` 限制在 home（`-d`）及 SAFE_PATHS 下；使用相对路径避免 Windows 上与绝对规范化路径不匹配。
pub async fn mirror_subscription_to_workdir(
    src: &std::path::Path,
    work_dir: &PathBuf,
    provider_id: &str,
) -> Result<String, AppError> {
    let mirrored = work_dir.join("subscriptions");
    tokio::fs::create_dir_all(&mirrored)
        .await
        .map_err(AppError::Io)?;

    let dest = mirrored.join(format!("{}.yaml", provider_id));
    tokio::fs::copy(src, &dest)
        .await
        .map_err(AppError::Io)?;

    tokio::fs::metadata(&dest).await.map_err(AppError::Io)?;

    Ok(format!("subscriptions/{provider_id}.yaml"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{Endpoint, RuntimeProfile};
    use crate::models::endpoint::{EndpointMetadata, Protocol};

    #[test]
    fn test_escape_regex() {
        assert_eq!(escape_regex("SG-01.premium+"), "SG-01\\.premium\\+");
        assert_eq!(escape_regex("US 02"), "US 02");
    }

    #[test]
    fn test_build_proxy_groups_filters() {
        let profile = RuntimeProfile {
            endpoints: vec![
                Endpoint {
                    id: "1".into(),
                    name: "美国-01".into(),
                    protocol: Protocol::Vmess,
                    server: "1.1.1.1".into(),
                    port: 443,
                    udp: false,
                    tls: false,
                    network: None,
                    auth: Default::default(),
                    transport: Default::default(),
                    metadata: EndpointMetadata {
                        country: Some("US".into()),
                        ..Default::default()
                    },
                    source_id: "test".into(),
                    unique_hash: "hash".into(),
                    raw: None,
                },
                Endpoint {
                    id: "2".into(),
                    name: "香港-02".into(),
                    protocol: Protocol::Vmess,
                    server: "1.1.1.2".into(),
                    port: 443,
                    udp: false,
                    tls: false,
                    network: None,
                    auth: Default::default(),
                    transport: Default::default(),
                    metadata: EndpointMetadata {
                        country: Some("HK".into()),
                        ..Default::default()
                    },
                    source_id: "test".into(),
                    unique_hash: "hash2".into(),
                    raw: None,
                },
            ],
            selected_node_id: None,
            policy: Default::default(),
            dns: Default::default(),
            tun: Default::default(),
            listen: "127.0.0.1".into(),
            mixed_port: 7890,
        };

        let groups = build_proxy_groups(&profile);
        let seq = groups.as_sequence().unwrap();

        // Find AI group and STREAM group
        let ai_group = seq.iter().find(|g| g.get("name").and_then(|v| v.as_str()) == Some("AI")).unwrap();
        let stream_group = seq.iter().find(|g| g.get("name").and_then(|v| v.as_str()) == Some("STREAM")).unwrap();

        // AI matches US node: "美国-01"
        assert_eq!(ai_group.get("filter").unwrap().as_str().unwrap(), "^(?:美国-01)$");
        // STREAM matches HK node: "香港-02" and US node: "美国-01"
        assert_eq!(stream_group.get("filter").unwrap().as_str().unwrap(), "^(?:美国-01|香港-02)$");
    }
}
