# AureStream 技术设计文档（AI Route / 智能分流版）

> 项目定位：
>
> # AI 优化代理运行时平台（AI Optimized Proxy Runtime Platform）
>
> AureStream 不是 Clash GUI。
>
> AureStream 的核心是：
>
> # “智能策略层 + Runtime 编排系统”
>
> Mihomo / sing-box 仅作为：
>
> # 底层流量执行引擎

---

# 一、核心产品目标

AureStream 自动完成：

| 功能         | 描述                                   |
| ---------- | ------------------------------------ |
| 智能分流       | 自动识别网站并选择规则                          |
| AI Route   | 自动为 ChatGPT / Claude / Gemini 选择最优线路 |
| 流媒体        | 自动切换 Netflix / Disney+ 节点            |
| 广告拦截       | 自动屏蔽广告                               |
| 自动测速       | 自动选择低延迟节点                            |
| 自动故障转移     | 节点失效自动切换                             |
| Runtime 编排 | UI 与代理内核彻底解耦                         |

---

# 二、核心设计原则

| 原则                | 说明                    |
| ----------------- | --------------------- |
| UI 不感知内核          | UI 不直接操作 Mihomo       |
| 数据库是主数据           | SQLite 存储全部状态         |
| Runtime Generated | 所有配置动态生成              |
| Endpoint 抽象       | 所有节点统一模型              |
| Adapter 模式        | Mihomo / sing-box 可切换 |
| Smart Route First | “策略”高于“内核”            |
| AI Route Native   | AI 服务作为一级路由目标         |
| 事件驱动              | EventBus 解耦模块         |

---

# 三、最终系统架构

```text id="w0y4y9"
┌─────────────────────────────┐
│         React UI            │
│      Zustand + IPC          │
└─────────────┬───────────────┘
              │
┌─────────────▼───────────────┐
│            IPC              │
└─────────────┬───────────────┘
              │
┌─────────────▼───────────────┐
│       RuntimeManager        │
│ ┌─────────────────────────┐ │
│ │ StateMachine            │ │
│ │ SessionManager          │ │
│ │ CoreManager             │ │
│ │ ProxyManager            │ │
│ │ EventBus                │ │
│ └─────────────────────────┘ │
└─────────────┬───────────────┘
              │
┌─────────────▼───────────────┐
│      Smart Route Layer      │
│ ┌─────────────────────────┐ │
│ │ Rule Generator          │ │
│ │ AI Route Engine         │ │
│ │ Streaming Engine        │ │
│ │ AdBlock Engine          │ │
│ │ ProxyGroup Generator    │ │
│ │ Route Scorer            │ │
│ └─────────────────────────┘ │
└─────────────┬───────────────┘
              │
┌─────────────▼───────────────┐
│      Config Generator       │
│ RuntimeProfile → YAML       │
└─────────────┬───────────────┘
              │
      runtime.yaml
              │
┌─────────────▼───────────────┐
│      Mihomo / sing-box      │
│   DNS / TUN / Routing       │
└─────────────────────────────┘
```

---

# 四、目录结构（最终版）

```text id="mrz5q0"
src-tauri/src/
├── main.rs
├── lib.rs
├── error.rs
│
├── models/
│   ├── endpoint.rs
│   ├── runtime.rs
│   ├── routing.rs
│   ├── ai_route.rs
│   ├── subscription.rs
│   ├── state.rs
│   └── event.rs
│
├── storage/
│   ├── database.rs
│   ├── endpoint_repo.rs
│   ├── subscription_repo.rs
│   ├── routing_repo.rs
│   └── app_state_repo.rs
│
├── subscription/
│   ├── fetcher.rs
│   ├── registry.rs
│   ├── cache.rs
│   │
│   ├── format/
│   │   ├── clash.rs
│   │   ├── v2ray.rs
│   │   ├── singbox.rs
│   │   └── surge.rs
│   │
│   └── protocol/
│       ├── vmess.rs
│       ├── vless.rs
│       ├── trojan.rs
│       ├── shadowsocks.rs
│       ├── tuic.rs
│       └── hysteria2.rs
│
├── smart_route/
│   ├── mod.rs
│   │
│   ├── rules/
│   │   ├── rule_generator.rs
│   │   ├── geoip.rs
│   │   ├── geosite.rs
│   │   └── adblock.rs
│   │
│   ├── ai/
│   │   ├── ai_route_engine.rs
│   │   ├── ai_detector.rs
│   │   ├── ai_domains.rs
│   │   ├── ai_region_policy.rs
│   │   └── ai_score.rs
│   │
│   ├── streaming/
│   │   ├── netflix.rs
│   │   ├── disney.rs
│   │   ├── youtube.rs
│   │   └── streaming_detector.rs
│   │
│   ├── groups/
│   │   ├── proxy_group_generator.rs
│   │   ├── auto_group.rs
│   │   ├── ai_group.rs
│   │   └── streaming_group.rs
│   │
│   └── scorer/
│       ├── latency.rs
│       ├── availability.rs
│       ├── packet_loss.rs
│       └── smart_score.rs
│
├── adapter/
│   ├── mod.rs
│   │
│   ├── mihomo/
│   │   ├── adapter.rs
│   │   ├── api_client.rs
│   │   ├── config_generator.rs
│   │   └── rule_provider.rs
│   │
│   └── singbox/
│       └── (future)
│
├── runtime/
│   ├── mod.rs
│   ├── state_machine.rs
│   ├── session_manager.rs
│   ├── core_manager.rs
│   ├── proxy_manager.rs
│   └── event_bus.rs
│
├── network/
│   ├── system_proxy/
│   ├── tun/
│   ├── dns/
│   └── routing/
│
├── ipc/
│   ├── connection_commands.rs
│   ├── subscription_commands.rs
│   ├── ai_route_commands.rs
│   ├── settings_commands.rs
│   └── tray_commands.rs
│
└── util/
    ├── hash.rs
    ├── port.rs
    └── geo.rs
```

---

# 五、核心数据模型

---

# Endpoint（统一节点模型）

```rust id="gf16kr"
pub struct Endpoint {
    pub id: String,

    pub name: String,

    pub protocol: Protocol,

    pub server: String,

    pub port: u16,

    pub auth: AuthInfo,

    pub transport: TransportInfo,

    pub metadata: EndpointMetadata,

    pub source_id: String,

    pub unique_hash: String,
}
```

---

# EndpointMetadata（核心）

```rust id="2dby7h"
pub struct EndpointMetadata {
    pub country: Option<String>,

    pub city: Option<String>,

    pub provider: Option<String>,

    pub latency: Option<u32>,

    pub packet_loss: Option<f32>,

    pub score: Option<f32>,

    pub tags: Vec<String>,

    pub ai_support: AiSupport,

    pub streaming_support: StreamingSupport,
}
```

---

# AI 支持能力

```rust id="jlwm13"
pub struct AiSupport {
    pub openai: bool,

    pub claude: bool,

    pub gemini: bool,

    pub grok: bool,

    pub perplexity: bool,
}
```

---

# 流媒体支持

```rust id="e48p4v"
pub struct StreamingSupport {
    pub netflix: bool,

    pub disney: bool,

    pub youtube_premium: bool,
}
```

---

# 六、AI Route 系统（核心）

---

# AI Route 是什么

AI 服务：

| 服务         | 推荐区域         |
| ---------- | ------------ |
| OpenAI     | SG / JP / US |
| Claude     | US / JP      |
| Gemini     | US           |
| Grok       | US           |
| Perplexity | SG           |

AureStream 自动：

```text id="nd6q98"
识别 AI 服务
↓
自动选择支持该 AI 的节点
↓
自动选择最低延迟节点
↓
自动切换
```

---

# AI Route 架构

```text id="0n69cb"
AI Domain
    ↓
AI Rule
    ↓
AI Proxy Group
    ↓
AI Route Engine
    ↓
Best AI Node
```

---

# 七、AI Detector（最重要）

负责检测：

```text id="6r0vay"
某节点是否支持：
- OpenAI
- Claude
- Gemini
```

---

# 技术方案

通过该节点访问：

```text id="gjmllh"
https://chat.openai.com
https://claude.ai
https://gemini.google.com
```

判断：

```text id="kg29ws"
200
403
region blocked
```

---

# 结果写入：

```rust id="wbx4p0"
EndpointMetadata.ai_support
```

---

# 八、智能分流系统

---

# Rule Generator

自动生成：

```yaml id="ffjzgn"
rules:
  - GEOSITE,category-ads-all,REJECT
  - GEOSITE,openai,AI
  - GEOSITE,anthropic,AI
  - GEOSITE,netflix,STREAM
  - GEOSITE,cn,DIRECT
  - MATCH,AUTO
```

---

# 九、广告拦截系统

---

# 方案

直接使用：

```text id="rj7g8f"
geosite:category-ads-all
```

---

# 生成：

```yaml id="qg13u6"
- GEOSITE,category-ads-all,REJECT
```

---

# 十、流媒体系统

---

# Streaming Detector

检测：

```text id="0q0zk4"
Netflix
Disney+
YouTube Premium
```

---

# 自动生成：

```yaml id="tt7jmn"
proxy-groups:
  - STREAM
```

---

# 规则：

```yaml id="xjpvga"
- GEOSITE,netflix,STREAM
```

---

# 十一、节点评分系统（Smart Score）

---

# 评分维度

| 指标     | 权重  |
| ------ | --- |
| 延迟     | 40% |
| 丢包     | 25% |
| AI 可用性 | 20% |
| 流媒体支持  | 15% |

---

# 评分公式

```rust id="0u6d0x"
score =
    latency_score * 0.4 +
    packet_loss_score * 0.25 +
    ai_support_score * 0.2 +
    streaming_score * 0.15;
```

---

# 十二、代理组自动生成

---

# 输入

```text id="x3dz6k"
Endpoint[]
```

---

# 输出

```yaml id="rqk5vn"
proxy-groups:
  - AUTO
  - AI
  - STREAM
  - FALLBACK
```

---

# AUTO

普通自动代理。

---

# AI

AI 服务专用。

---

# STREAM

流媒体专用。

---

# FALLBACK

故障转移。

---

# 十三、Config Generator（核心）

---

# 输入

```rust id="2dkh84"
RuntimeProfile
```

---

# 输出

```text id="skxld5"
runtime.yaml
```

---

# 自动生成：

```yaml id="jlwm07"
dns:
rules:
proxy-groups:
proxies:
tun:
rule-providers:
```

---

# 十四、RuntimeProfile（最终版）

```rust id="jlwm31"
pub struct RuntimeProfile {
    pub endpoints: Vec<Endpoint>,

    pub routing: SmartRoutingProfile,

    pub dns: DnsProfile,

    pub tun: TunProfile,
}
```

---

# SmartRoutingProfile

```rust id="jlwm38"
pub struct SmartRoutingProfile {
    pub enable_ai_route: bool,

    pub enable_streaming: bool,

    pub enable_adblock: bool,

    pub auto_select_best_node: bool,
}
```

---

# 十五、事件总线

```rust id="jlwm46"
pub enum AppEvent {
    ConnectionStateChanged(ConnectionState),

    TrafficUpdated {
        upload: u64,
        download: u64,
    },

    AiRouteChanged {
        service: String,
        node_id: String,
    },

    StreamingUnlocked {
        service: String,
        node_id: String,
    },
}
```

---

# 十六、数据库设计（新增）

---

# endpoint 表新增

```sql id="jlwm55"
ALTER TABLE endpoints
ADD COLUMN ai_support_json TEXT;

ALTER TABLE endpoints
ADD COLUMN streaming_support_json TEXT;

ALTER TABLE endpoints
ADD COLUMN score REAL;
```

---

# 十七、真正推荐的 Mihomo 配置

---

# DNS

```yaml id="jlwm63"
dns:
  enable: true
  enhanced-mode: fake-ip
```

---

# TUN

```yaml id="jlwm71"
tun:
  enable: true
  auto-route: true
```

---

# AI Route

```yaml id="jlwm79"
proxy-groups:
  - name: AI
    type: url-test
```

---

# AI Rules

```yaml id="jlwm87"
rules:
  - GEOSITE,openai,AI
  - GEOSITE,anthropic,AI
  - GEOSITE,gemini,AI
```

---


# 十八、真正的产品核心

AureStream 最终不是：

```text id="jlwm95"
Clash GUI
```

而是：

# “AI 网络优化平台”

真正价值在于：

| 能力               | 价值        |
| ---------------- | --------- |
| AI Route         | AI 自动最佳线路 |
| Smart Route      | 自动分流      |
| Streaming        | 自动流媒体解锁   |
| Runtime          | 多内核统一     |
| Endpoint         | 统一抽象      |
| Config Generator | 动态策略系统    |

---

# 二十、最终用户体验

用户只需要：

```text id="jlwm103"
导入订阅
```

AureStream 自动：

```text id="jlwm111"
识别 AI 节点
↓
识别 Netflix 节点
↓
自动测速
↓
自动评分
↓
自动生成规则
↓
自动切换最优线路
```

用户：

```text id="jlwm119"
完全不需要懂 Clash / Mihomo
```

这才是 AureStream 的真正方向。
