# MihomoProxy - VPN 代理软件

## 1. 项目概述

**项目名称：** MihomoProxy  
**项目类型：** 跨平台桌面应用  
**核心功能：** 基于 mihomo 内核的代理软件，支持订阅管理、节点选择、延迟测速等功能  
**目标用户：** 需要网络代理的用户

**技术栈：**
- 桌面框架：Tauri 2.0
- 前端框架：React 18 + TypeScript + Vite
- UI 组件库：Shadcn UI
- 样式框架：Tailwind CSS
- 状态管理：Zustand
- 代理内核：mihomo（MetaCube-X/mihomo）

## 2. UI/UX 规范

### 2.1 布局结构

**整体布局：**
- 采用左侧导航栏 + 右侧主内容区的经典布局
- 左侧导航栏宽度：240px
- 主内容区自适应剩余空间
- 响应式设计，支持不同窗口尺寸

**导航栏结构：**
```
┌────────────────────┐
│  Logo              │
│  ──────────────── │
│  🏠 仪表盘          │
│  📦 服务商          │
│  ⚙️ 设置           │
│                    │
│  ──────────────── │
│  🌙/☀️ 主题切换     │
└────────────────────┘
```

### 2.2 视觉设计

**颜色规范：**

| 用途 | 浅色主题 | 深色主题 |
|------|---------|---------|
| 主色 | #3B82F6 (蓝色) | #3B82F6 |
| 次要色 | #64748B (灰蓝) | #94A3B8 |
| 强调色 | #10B981 (绿色) | #34D399 |
| 背景色 | #FFFFFF | #0F172A |
| 卡片背景 | #F8FAFC | #1E293B |
| 文字主色 | #1E293B | #F8FAFC |
| 文字次要 | #64748B | #94A3B8 |
| 边框色 | #E2E8F0 | #334155 |
| 成功色 | #10B981 | #34D399 |
| 警告色 | #F59E0B | #FBBF24 |
| 错误色 | #EF4444 | #F87171 |

**延迟指示颜色：**
- 优秀 (<100ms)：#10B981 (绿色)
- 良好 (100-300ms)：#F59E0B (黄色)
- 较差 (>300ms)：#EF4444 (红色)

**字体规范：**
- 主字体：system-ui, -apple-system, sans-serif
- 代码字体：ui-monospace, monospace
- 标题大小：h1: 24px, h2: 20px, h3: 16px
- 正文大小：14px
- 小字：12px

**间距规范：**
- 基础单位：4px
- 小间距：8px
- 中间距：16px
- 大间距：24px
- 超大间距：32px

**圆角规范：**
- 小圆角：6px（按钮、输入框）
- 中圆角：8px（卡片）
- 大圆角：12px（模态框）

**阴影规范：**
- 卡片阴影：0 1px 3px rgba(0,0,0,0.1)
- 悬浮阴影：0 4px 6px rgba(0,0,0,0.1)
- 模态阴影：0 10px 25px rgba(0,0,0,0.15)

### 2.3 组件规范

**按钮样式：**
- 主按钮：蓝色背景，白色文字
- 次要按钮：透明背景，蓝色边框
- 危险按钮：红色背景，白色文字
- 悬浮效果：背景色加深 10%

**输入框样式：**
- 边框：1px solid 边框色
- 焦点状态：2px solid 主色
- 圆角：6px
- 内边距：8px 12px

**卡片样式：**
- 背景色：卡片背景色
- 边框：1px solid 边框色
- 圆角：8px
- 内边距：16px
- 阴影：卡片阴影

**下拉菜单样式：**
- 宽度：100%
- 最大高度：300px
- 滚动条：当选项超过最大高度时显示

## 3. 功能规范

### 3.1 仪表盘页面（首页）

**核心功能：**
1. **连接控制**
   - 大型圆形连接按钮（直径 120px）
   - 点击切换连接状态
   - 连接状态：未连接（灰色）、已连接（绿色）、连接中（蓝色旋转）

2. **服务商选择**
   - 下拉选择框
   - 显示所有已添加的服务商
   - 显示格式："服务商名称 (节点数)"
   - 支持按分组筛选

3. **节点选择**
   - 下拉选择框
   - 显示格式："节点名称 | 延迟: XXms"
   - 延迟使用颜色指示（绿/黄/红）
   - 未测速显示 "--"
   - 支持搜索功能

4. **一键测速**
   - 测速按钮
   - 点击后测试所有节点延迟
   - 显示测速进度
   - 测速完成后更新延迟显示

5. **状态显示**
   - 当前节点名称
   - 连接状态
   - 延迟时间（实时）
   - 流量统计：上传速度 ↓ / 下载速度 ↑

**布局示例：**
```
┌────────────────────────────────────────────┐
│                                            │
│           ┌──────────────┐                 │
│           │              │                 │
│           │   连接按钮     │                 │
│           │              │                 │
│           └──────────────┘                 │
│                                            │
│     ┌────────────────────────────┐         │
│     │ 选择服务商          ▼      │         │
│     └────────────────────────────┘         │
│                                            │
│     ┌────────────────────────────┐         │
│     │ 选择节点            ▼      │         │
│     └────────────────────────────┘         │
│                                            │
│          [🔄 一键测速]                     │
│                                            │
│     ┌────────────────────────────┐         │
│     │ 当前节点: 美国节点 1        │         │
│     │ 延迟: 45ms                 │         │
│     │ 上传: 1.2 MB/s             │         │
│     │ 下载: 5.6 MB/s             │         │
│     └────────────────────────────┘         │
│                                            │
└────────────────────────────────────────────┘
```

### 3.2 服务商管理页面

**核心功能：**
1. **添加服务商**
   - 点击"添加服务商"按钮
   - 弹出模态框
   - 输入字段：
     - 服务商名称（必填）
     - 订阅链接（必填，支持 URL）
     - 分组（可选）
   - 自动验证链接格式
   - 保存后自动拉取节点

2. **服务商列表**
   - 卡片式列表展示
   - 每个卡片显示：
     - 服务商名称
     - 节点数量
     - 最后更新时间
     - 状态指示（在线/离线）
   - 操作按钮：编辑、删除、更新

3. **编辑服务商**
   - 点击编辑按钮
   - 弹出模态框
   - 修改服务商信息
   - 保存更新

4. **删除服务商**
   - 点击删除按钮
   - 确认提示
   - 删除后清空相关节点

5. **更新订阅**
   - 点击更新按钮
   - 重新拉取订阅内容
   - 更新节点列表
   - 更新时间戳

**服务商卡片示例：**
```
┌─────────────────────────────────────┐
│ 服务商名称           [编辑] [删除]   │
│ ─────────────────────────────────── │
│ 📦 节点数: 25                       │
│ 🕐 更新时间: 2024-01-15 14:30      │
│ 🔄 最后测速: 2024-01-15 14:25      │
│                                     │
│          [更新订阅]                 │
└─────────────────────────────────────┘
```

### 3.3 设置页面

**功能模块：**
1. **主题设置**
   - 明/暗主题切换
   - 保存用户偏好

2. **启动设置**
   - 开机自启动选项
   - 启动时自动连接选项

3. **代理设置**
   - 监听地址（默认 127.0.0.1）
   - HTTP 端口（默认 7890）
   - SOCKS5 端口（默认 7891）

4. **关于**
   - 应用版本
   - 内核版本
   - GitHub 链接

## 4. 技术实现规范

### 4.1 前端架构

**目录结构：**
```
src/
├── components/          # React 组件
│   ├── ui/             # Shadcn UI 组件
│   ├── layout/         # 布局组件
│   │   ├── Sidebar.tsx
│   │   └── MainContent.tsx
│   ├── dashboard/      # 仪表盘组件
│   │   ├── ConnectButton.tsx
│   │   ├── ProviderSelect.tsx
│   │   ├── NodeSelect.tsx
│   │   └── StatusCard.tsx
│   └── provider/       # 服务商管理组件
│       ├── ProviderCard.tsx
│       └── ProviderModal.tsx
├── pages/              # 页面组件
│   ├── Dashboard.tsx
│   ├── Providers.tsx
│   └── Settings.tsx
├── hooks/              # 自定义 Hooks
│   ├── useTheme.ts
│   ├── useProviders.ts
│   └── useProxy.ts
├── stores/             # Zustand 状态管理
│   ├── appStore.ts
│   └── proxyStore.ts
├── lib/                # 工具函数
│   ├── utils.ts
│   └── api.ts
├── types/              # TypeScript 类型定义
│   └── index.ts
└── App.tsx
```

**状态管理（Zustand）：**
```typescript
interface AppStore {
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
}

interface ProxyStore {
  isConnected: boolean
  currentProvider?: Provider
  currentNode?: Node
  providers: Provider[]
  nodes: Node[]
  
  // Actions
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  setCurrentProvider: (provider: Provider) => void
  setCurrentNode: (node: Node) => void
  addProvider: (provider: Provider) => void
  updateProvider: (id: string, updates: Partial<Provider>) => void
  deleteProvider: (id: string) => void
  refreshNodes: (providerId: string) => Promise<void>
  testLatency: () => Promise<void>
}
```

### 4.2 后端架构（Tauri/Rust）

**模块结构：**
```
src-tauri/
├── src/
│   ├── main.rs         # 入口文件
│   ├── lib.rs          # 库入口
│   ├── commands/       # Tauri 命令
│   │   ├── mod.rs
│   │   ├── proxy.rs    # 代理控制命令
│   │   ├── provider.rs # 订阅管理命令
│   │   └── config.rs   # 配置管理命令
│   ├── core/           # 核心逻辑
│   │   ├── mod.rs
│   │   ├── mihomo.rs   # mihomo 内核封装
│   │   ├── subscription.rs # 订阅解析
│   │   └── latency.rs  # 延迟测试
│   └── utils/          # 工具函数
│       ├── mod.rs
│       └── http.rs     # HTTP 客户端
├── Cargo.toml
└── tauri.conf.json
```

**核心 Tauri 命令：**
```rust
#[tauri::command]
async fn start_proxy(config_path: String) -> Result<(), String>

#[tauri::command]
async fn stop_proxy() -> Result<(), String>

#[tauri::command]
async fn get_status() -> Result<ProxyStatus, String>

#[tauri::command]
async fn fetch_subscription(url: String) -> Result<Subscription, String>

#[tauri::command]
async fn test_node_latency(url: String) -> Result<u32, String>

#[tauri::command]
async fn save_config(config: AppConfig) -> Result<(), String>

#[tauri::command]
async fn load_config() -> Result<AppConfig, String>
```

### 4.3 数据存储

**配置文件位置：**
- Windows: `%APPDATA%\MihomoProxy\config.json`
- macOS: `~/Library/Application Support/MihomoProxy/config.json`
- Linux: `~/.config/mihomoproxy/config.json`

**配置结构：**
```json
{
  "theme": "light",
  "providers": [
    {
      "id": "uuid",
      "name": "服务商名称",
      "url": "https://example.com/clash.yaml",
      "group": "默认",
      "enabled": true,
      "lastUpdated": "2024-01-15T14:30:00Z"
    }
  ],
  "proxy": {
    "listen": "127.0.0.1",
    "httpPort": 7890,
    "socks5Port": 7891
  },
  "startup": {
    "autoStart": false,
    "autoConnect": false
  }
}
```

### 4.4 API 接口

**订阅获取接口：**
```typescript
interface SubscriptionAPI {
  fetch(url: string): Promise<SubscriptionData>
  parse(data: string): Promise<Node[]>
}

interface Node {
  id: string
  name: string
  type: 'http' | 'socks5' | 'vmess' | 'trojan' | 'ss'
  server: string
  port: number
  cipher?: string
  password?: string
  uuid?: string
  network?: 'tcp' | 'udp'
  // ... 其他配置
}
```

**延迟测试接口：**
```typescript
interface LatencyAPI {
  test(url: string, timeout?: number): Promise<number>
  testBatch(urls: string[]): Promise<Map<string, number>>
}
```

## 5. 用户交互流程

### 5.1 首次使用流程
```
1. 用户打开应用
   ↓
2. 显示仪表盘（未连接状态）
   ↓
3. 用户点击"服务商"菜单
   ↓
4. 点击"添加服务商"
   ↓
5. 输入服务商名称和订阅链接
   ↓
6. 点击保存
   ↓
7. 系统自动拉取订阅并解析节点
   ↓
8. 返回仪表盘，选择服务商和节点
   ↓
9. 点击连接按钮
   ↓
10. 代理启动成功，开始使用
```

### 5.2 日常使用流程
```
1. 打开应用
   ↓
2. 仪表盘显示上次连接状态
   ↓
3. （可选）切换服务商/节点
   ↓
4. （可选）点击测速
   ↓
5. 点击连接按钮
   ↓
6. 开始使用代理
```

## 6. 错误处理

### 6.1 网络错误
- **订阅拉取失败**：显示错误提示，提供重试按钮
- **节点连接失败**：显示错误信息，尝试自动切换到下一个可用节点

### 6.2 代理错误
- **内核启动失败**：显示错误日志，提示检查配置
- **端口被占用**：提示修改端口配置

### 6.3 数据错误
- **配置解析失败**：使用默认配置，显示警告
- **订阅格式错误**：提示用户检查订阅链接

## 7. 性能要求

- 应用启动时间：< 3秒
- 页面切换响应：< 100ms
- 延迟测试响应：< 500ms
- 内存占用：< 150MB（空闲状态）
- CPU 占用：< 5%（空闲状态）

## 8. 兼容性要求

- **操作系统支持**：
  - Windows 10/11
  - macOS 11+
  - Linux (Ubuntu 20.04+, Fedora 36+)

- **架构支持**：
  - x86_64
  - arm64 (Apple Silicon)

## 9. 开发计划

### Phase 1：基础框架搭建
- [x] 项目初始化（Tauri + React + TypeScript）
- [ ] 配置 Tailwind CSS 和 Shadcn UI
- [ ] 实现主题切换功能
- [ ] 实现基本布局（侧边栏 + 主内容区）

### Phase 2：UI 组件开发
- [ ] 实现仪表盘页面 UI
- [ ] 实现服务商管理页面 UI
- [ ] 实现设置页面 UI
- [ ] 组件交互逻辑

### Phase 3：功能实现
- [ ] 服务商管理（CRUD）
- [ ] 订阅拉取和解析
- [ ] 节点选择和切换
- [ ] 延迟测试功能
- [ ] 代理连接控制

### Phase 4：集成和测试
- [ ] mihomo 内核集成
- [ ] 系统集成测试
- [ ] 跨平台测试
- [ ] 性能优化

## 10. 参考资料

- [Tauri 2.0 文档](https://v2.tauri.app/)
- [React 官方文档](https://react.dev/)
- [Shadcn UI 文档](https://ui.shadcn.com/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [mihomo 内核](https://github.com/MetaCubeX/mihomo)
- [Clash 配置格式](https://wiki.metacubex.one/)

---

**文档版本：** 1.0  
**创建日期：** 2024-01-15  
**最后更新：** 2024-01-15
