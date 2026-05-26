# AureStream 技术设计文档（内核原生 + 数据库区域感知版）

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

| 原则                | 说明                                                         |
| ----------------- | ------------------------------------------------------------ |
| UI 不感知内核      | UI 不直接操作 Mihomo，通过统一 API 与状态机通信              |
| 数据库是主数据       | SQLite 存储全部节点状态与区域信息                            |
| Runtime Generated | 所有配置动态生成，不修改用户原始订阅                         |
| Endpoint 抽象       | 所有节点统一模型，屏蔽底层协议差异                           |
| 内核原生探测 (New)  | 避免复杂的后台探测线程，将探针与故障转移委托给内核组 `url-test` |
| 区域感知与匹配 (New)| 订阅解析时自动提取国家/地区，存入 DB，用于前端国旗展示与代理组动态匹配 |
| AI Route Native   | AI 服务作为一级路由目标                                      |
| 事件驱动            | EventBus 解耦模块                                            |

---

# 三、系统架构

```text
┌─────────────────────────────┐
│         React UI            │ (显示节点列表、国旗、一键连接)
│      Zustand + IPC          │
└─────────────┬───────────────┘
              │
┌─────────────▼───────────────┐
│            IPC              │ (get_nodes, build_runtime_config)
└─────────────┬───────────────┘
              │
┌─────────────▼───────────────┐
│       RuntimeManager        │
│ ┌─────────────────────────┐ │
│ │ StateMachine            │ │
│ │ SessionManager          │ │
│ │ CoreManager             │ │
│ │ EventBus                │ │
│ └─────────────────────────┘ │
└─────────────┬───────────────┘
              │
┌─────────────▼───────────────┐
│    Config Generator (New)   │ (从 SQLite 读取节点区域，动态组装策略组)
│   RuntimeProfile → YAML     │ (利用正则 filter 将特定地区节点分配给 AI/STREAM 组)
└─────────────┬───────────────┘
              │
      runtime.yaml (Mihomo 配置文件)
              │
┌─────────────▼───────────────┐
│      Mihomo / sing-box      │ (运行 url-test 进行服务可用性测试)
│   DNS / TUN / Routing       │ (对 OpenAI 探针与 Netflix 探针进行测试与智能故障转移)
└─────────────────────────────┘
```

---

# 四、目录结构

```text
src-tauri/src/
├── main.rs
├── lib.rs
├── error.rs
│
├── models/
│   ├── endpoint.rs         (统一 Endpoint 模型，包含 metadata.country)
│   ├── runtime.rs          (RuntimeProfile, SmartRoutingProfile)
│   ├── subscription.rs     (订阅模型)
│   ├── state.rs            (状态定义)
│   └── dto.rs              (传输对象，含 country, 用于前端展示国旗)
│
├── storage/
│   ├── database.rs         (数据库连接与初始化)
│   ├── endpoint_repo.rs    (节点增删改查)
│   └── subscription_repo.rs(订阅增删改查)
│
├── subscription/
│   ├── fetcher.rs          (订阅拉取)
│   ├── registry.rs         (格式与协议分发)
│   ├── normalizer.rs       (地区推测：解析节点名字推导国家代码如 US/SG，填入 country)
│   └── deduplicator.rs     (去重)
│
├── adapter/
│   ├── mod.rs
│   └── mihomo/
│       ├── adapter.rs          (内核适配)
│       ├── api_client.rs       (External Controller 交互)
│       └── config_gen.rs       (动态生成运行时 YAML，带区域 filter 与专有探针)
│
├── runtime/
│   ├── mod.rs
│   ├── state_machine.rs
│   ├── session_manager.rs
│   ├── core_manager.rs
│   └── mihomo_sidecar.rs   (Mihomo 进程管理)
│
└── ipc/
    ├── connection.rs       (启停代理)
    ├── node.rs             (获取节点，向前端传递 country)
    └── subscription.rs     (订阅管理)
```

---

# 五、核心数据模型

### Endpoint（统一节点模型）

```rust
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

### EndpointMetadata（核心）

```rust
pub struct EndpointMetadata {
    // 关键：订阅解析时通过 normalizer 自动识别的 ISO 国家/地区代码（如 "US", "SG", "JP"）
    pub country: Option<String>,
    pub city: Option<String>,
    pub provider: Option<String>,
    pub latency: Option<u32>,
    pub packet_loss: Option<f32>,
    pub score: Option<f32>,
    pub tags: Vec<String>,
}
```

---

# 六、节点区域识别与入库（国旗展示核心）

为了让前端能够正确显示国旗，并在生成配置时进行区域匹配，系统在节点入库时执行**区域规范化**：

### 1. 区域提取机制（Normalizer）
在 `src-tauri/src/subscription/normalizer.rs` 中维护常见区域的关键字和 Emoji 映射：
* 示例：检测到节点名称中包含 `新加坡`、`SG`、`🇸🇬`，则提取国家代码为 `"SG"`。
* 提取出的国家代码存入 `EndpointMetadata.country`。

### 2. 数据库存储
直接序列化至 `endpoints` 表的 `metadata_json` 字段中：
* 在 SQLite 数据库中无需修改核心 schema，充分利用 `metadata_json` 的半结构化特性。

### 3. IPC 传输（DTO）
通过 `ipc/node.rs` 返回给前端的 `Node` 传输对象中增加 `country` 字段，前端 React 拿到该字段后，直接渲染对应的国旗：
```typescript
export interface Node {
  id: string;
  name: string;
  providerId: string;
  type: string;
  server: string;
  port: number;
  delay?: number;
  country?: string; // ISO 国家/地区代码，用于在列表显示国旗
  enabled: boolean;
}
```

---

# 七、AI Route 系统（内核原生）

不再使用 Rust 后端对每个节点去发起 OpenAI 的 TCP/HTTP 探测，而是利用**区域匹配配置生成** + **内核专用探针组**来实现。

### 1. 区域过滤（生成侧）
* AI 服务的推荐区域为：`US`, `SG`, `JP`, `TW`, `KR` 等。
* 在配置生成器 `config_gen.rs` 中，从数据库获取当前订阅下的所有节点。
* 过滤出 `country` 字段在上述推荐区域的节点。
* 构建一个匹配这些节点名字的精确正则表达式。例如匹配节点 "SG-01" 和 "US-02"：
  `filter: "^(SG-01|US-02)$"`

### 2. 内核专用探针（执行侧）
在 Mihomo 配置中生成 `AI` 优选组，使用 `url-test` 类型，并将测试地址设为 OpenAI 的探针：
```yaml
proxy-groups:
  - name: AI
    type: url-test
    use:
      - AureStream_Sub
    # 由 Config Generator 动态生成的正则表达式，只测试支持 AI 区域的节点
    filter: "^(SG-01|US-02|JP-01)$"
    # OpenAI 探针地址：如果节点被 OpenAI 封锁，握手或请求会失败，内核会自动剔除该节点
    url: "https://chat.openai.com/cdn-cgi/trace"
    interval: 300
    tolerance: 50
```

* **智能故障转移**：由 Mihomo 内核在后台自动检测，一旦首选节点不可用，秒级自动切换到其他优选节点，对上层应用完全透明。

---

# 八、流媒体系统（内核原生）

流媒体解锁也采用相同的机制。

### 1. 区域过滤与正则生成
* 推荐流媒体解锁区域：`HK`, `TW`, `SG`, `JP`, `US` 等。
* 配置生成器过滤出 `country` 在该列表中的节点，生成精确正则：`filter: "^(HK-01|TW-02|SG-01)$"`。

### 2. 内核专用探针
在 Mihomo 配置中生成 `STREAM` 优选组，测试地址设为 Netflix 的视频详情探针：
```yaml
proxy-groups:
  - name: STREAM
    type: url-test
    use:
      - AureStream_Sub
    filter: "^(HK-01|TW-02|SG-01)$"
    # Netflix 探针地址：如果该节点未解锁 Netflix 导致 403/451，内核将自动识别并排除
    url: "https://www.netflix.com/title/80018499"
    interval: 300
    tolerance: 50
```

---

# 九、广告拦截系统

直接使用内核支持的 GeoSite 拦截规则，零额外开销。
```yaml
rules:
  - GEOSITE,category-ads-all,REJECT
```

---

# 十、智能分流系统

通过规则段编排，将不同的网络请求导向正确的代理组：
```yaml
rules:
  - DOMAIN,localhost,DIRECT
  - IP-CIDR,127.0.0.0/8,DIRECT,no-resolve
  - GEOIP,private,DIRECT
  
  # 1. 广告拦截
  - GEOSITE,category-ads-all,REJECT
  
  # 2. AI 流量路由到 AI 优选组
  - GEOSITE,openai,AI
  - GEOSITE,anthropic,AI
  - DOMAIN-SUFFIX,gemini.google.com,AI
  
  # 3. 流媒体流量路由到流媒体组
  - GEOSITE,netflix,STREAM
  - GEOSITE,disney,STREAM
  - GEOSITE,youtube,STREAM
  
  # 4. 国内直连
  - GEOSITE,cn,DIRECT
  - GEOIP,CN,DIRECT
  
  # 5. 默认走自动优选组（AUTO 为全节点 url-test 延迟选优）
  - MATCH,AUTO
```

---

# 十一、Config Generator（核心实现）

配置生成器根据 `RuntimeProfile` 和数据库节点数据，动态生成最终的运行时配置文件 `aurestream-mihomo.yaml`。

### 1. 输入数据获取
Tauri 命令 `build_runtime_config` 接收到请求后：
1. 通过 `RuntimeManager` 获取数据库连接。
2. 从 SQLite 查询当前订阅的全部节点 `Endpoint`。
3. 将包含国家代码（`country`）的节点列表装入 `RuntimeProfile.endpoints` 中。

### 2. 动态 YAML 生成
`config_gen.rs` 在生成配置时：
* 遍历 `profile.endpoints`，根据 `country` 属性提取出 AI 区域节点名称和流媒体区域节点名称。
* 动态渲染 `AI` 组和 `STREAM` 组的 `filter` 正则。
* 组装 DNS（Fake-IP 模式）、TUN 模式、分流规则以及对应的代理组配置，写入最终文件。

---

# 十二、最终用户体验与优势

### 用户侧
1. **国旗展示**：节点列表中自动显示每个节点所在国家/地区的国旗，一目了然。
2. **零配置智能冲浪**：只需导入订阅一键连接，即可同时完美享受去广告、Netflix 流媒体解锁和 ChatGPT 稳定访问，完全无需手动切换节点。

### 开发侧（系统优势）
1. **架构极简**：剔除了复杂的后台探测代码、多线程同步和庞大的 SQLite 读写。
2. **高稳定性**：利用了 Mihomo/sing-box 内核经过多年打磨的底层网络探针，避开了 Rust 应用层探测可能遇到的系统代理环回、套接字泄漏和超时等问题。
3. **零延迟故障切换**：内核在连接失败时能够以毫秒级实现无缝故障切换，用户体验极佳。
