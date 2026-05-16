# AureProxy

基于 mihomo 内核的跨平台代理软件，使用 Tauri + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui 构建。

## 功能特性

### 仪表盘

- **黄金比例双栏布局**: 左栏 (61.8%) 操作区 + 右栏 (38.2%) 信息展示区，单视口无滚动
- **连接控制**: 大型圆形按钮，呼吸动画区分连接/未连接状态，同一 DOM 元素平滑过渡
- **代理模式**: 规则 / 全局 / 直连 三种模式，横向卡片选择
- **节点信息**: 胶囊式展示当前节点、服务器地址、类型、延迟
- **实时速率**: 上传/下载速度胶囊组件

### 右栏信息

- **订阅信息**: 供应商名称、总/已用/剩余流量、环形进度图、到期时间
- **网络信息**: IP、国家、城市、ASN、组织
- **用量信息**: 上传/下载/总计 + SVG Catmull-Rom 平滑波浪面积图

### 服务商管理

- 添加 / 编辑 / 删除服务商
- 启用 / 禁用订阅
- 设为当前订阅
- 更新订阅

### 通用

- 浅色 / 深色主题切换
- Glassmorphism 设计风格
- 节点选择对话框 (延迟显示、一键测速)

## 技术栈

| 技术                  | 用途      |
| --------------------- | --------- |
| Tauri 2.0             | 桌面框架  |
| React 19 + TypeScript | 前端      |
| Vite 7                | 构建工具  |
| Tailwind CSS v4       | 样式框架  |
| shadcn/ui (Radix)     | UI 组件库 |
| Zustand 5             | 状态管理  |
| mihomo                | 代理内核  |

## 开发

```bash
# 安装依赖
npm install

# 前端开发服务器
npm run dev

# Tauri 桌面开发
npm run dev:desktop

# 生产构建
npm run build
```

## 项目结构

```
src/
├── components/
│   ├── dashboard/            # 仪表盘组件
│   │   ├── ConnectButton.tsx
│   │   ├── LeftOperationPanel.tsx
│   │   ├── SubscriptionBlock.tsx
│   │   ├── NetworkBlock.tsx
│   │   ├── UsageBlock.tsx
│   │   ├── NodePickerDialog.tsx
│   │   └── TrafficUsageRing.tsx
│   ├── provider/             # 服务商管理
│   │   ├── ProviderCard.tsx
│   │   └── ProviderModal.tsx
│   ├── layout/               # 布局
│   │   └── PageShell.tsx
│   └── ui/                   # shadcn 基础组件
├── pages/
│   ├── Dashboard.tsx         # 首页
│   ├── Providers.tsx         # 服务商管理
│   └── Settings.tsx          # 设置
├── stores/
│   └── appStore.ts           # Zustand 全局状态
├── types/
│   └── index.ts
└── lib/
    └── utils.ts
```

## 数据存储

配置文件位于：

- **Windows**: `%APPDATA%\AureProxy\config.json`
- **macOS**: `~/Library/Application Support/AureProxy/config.json`
- **Linux**: `~/.config/aureproxy/config.json`

## 许可证

MIT License
