# MihomoProxy

一款基于 Mihomo 内核的代理软件，使用 Tauri + React + TypeScript + Tailwind CSS + Shadcn UI 构建。

## 功能特性

### 仪表盘
- 🖱️ **一键连接/断开**：大型圆形连接按钮，轻松控制代理状态
- 📦 **服务商选择**：下拉菜单快速切换不同订阅服务商
- 🌐 **节点选择**：选择具体节点，显示实时延迟
- ⚡ **一键测速**：测试所有节点延迟，用颜色区分（绿色<100ms，黄色<300ms，红色>300ms）
- 📊 **状态显示**：实时显示当前节点、延迟、流量统计

### 服务商管理
- ➕ **添加服务商**：输入名称和订阅链接
- ✏️ **编辑服务商**：修改服务商信息
- 🗑️ **删除服务商**：移除不需要的服务商
- 🔄 **更新订阅**：重新拉取最新节点

### 设置
- 🎨 **主题切换**：支持浅色/深色模式
- ⚙️ **代理配置**：自定义监听地址和端口
- 🚀 **启动选项**：开机自启动、自动连接

## 技术栈

- **桌面框架**: Tauri 2.0
- **前端框架**: React 18 + TypeScript + Vite
- **UI 组件库**: Shadcn UI
- **样式框架**: Tailwind CSS
- **状态管理**: Zustand
- **代理内核**: Mihomo (MetaCube-X/mihomo)

## 项目结构

```
mihomoproxy/
├── src/                      # React 前端源码
│   ├── components/           # React 组件
│   │   ├── ui/              # Shadcn UI 基础组件
│   │   ├── layout/          # 布局组件（侧边栏、主内容区）
│   │   ├── dashboard/       # 仪表盘组件
│   │   └── provider/        # 服务商管理组件
│   ├── pages/              # 页面组件
│   │   ├── Dashboard.tsx    # 仪表盘页面
│   │   ├── Providers.tsx    # 服务商管理页面
│   │   └── Settings.tsx     # 设置页面
│   ├── stores/             # Zustand 状态管理
│   │   └── appStore.ts     # 应用状态
│   ├── types/              # TypeScript 类型定义
│   │   └── index.ts
│   ├── lib/                # 工具函数和 API
│   │   ├── utils.ts
│   │   └── api.ts
│   └── App.tsx             # 主应用组件
├── src-tauri/              # Tauri 后端源码 (Rust)
│   ├── src/
│   │   ├── lib.rs         # 库入口
│   │   └── commands/      # Tauri 命令模块
│   │       ├── mod.rs
│   │       ├── proxy.rs   # 代理控制命令
│   │       └── provider.rs # 服务商管理命令
│   └── Cargo.toml         # Rust 依赖配置
├── tailwind.config.js     # Tailwind CSS 配置
├── vite.config.ts         # Vite 配置
├── tsconfig.json          # TypeScript 配置
└── package.json           # Node.js 依赖配置
```

## 开发环境准备

### 系统依赖

#### Ubuntu / Debian
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  libglib2.0-dev \
  libgtk-3-dev
```

#### macOS
需要安装 Xcode 和 Xcode Command Line Tools：
```bash
xcode-select --install
```

#### Windows
安装 Visual Studio Build Tools 和 WebView2 Runtime

### 安装 Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 安装 Node.js
推荐使用 Node.js 18+：
```bash
# 使用 nvm (推荐)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# 或直接下载安装
# https://nodejs.org/
```

## 开发

### 1. 克隆项目
```bash
git clone <repository-url>
cd mihomoproxy
```

### 2. 安装前端依赖
```bash
npm install
```

### 3. 开发模式运行
```bash
npm run tauri dev
```

这将启动 Vite 开发服务器和 Tauri 应用。

### 4. 生产构建
```bash
npm run tauri build
```

构建产物将位于 `src-tauri/target/release/` 目录下。

## 使用说明

### 添加服务商

1. 点击左侧导航栏的"服务商"
2. 点击"添加服务商"按钮
3. 填写服务商名称和订阅链接
4. （可选）填写分组名称
5. 点击"添加"

系统将自动拉取订阅并解析节点。

### 连接代理

1. 在仪表盘页面的服务商下拉框中选择服务商
2. 在节点下拉框中选择具体节点
3. （可选）点击"一键测速"测试所有节点延迟
4. 点击中央的连接按钮
5. 等待连接成功，状态卡片将显示实时信息

### 切换主题

点击左下角的太阳/月亮图标可在浅色/深色模式之间切换。

## 配置说明

### 代理设置

在"设置"页面可以配置：
- **监听地址**：默认 `127.0.0.1`（仅本地访问）
- **HTTP 端口**：默认 `7890`
- **SOCKS5 端口**：默认 `7891`

### 订阅格式支持

支持以下订阅格式：
- ✅ Clash 配置（YAML）
- ✅ 通用订阅链接（自动解析）

## 数据存储

配置文件位于：
- **Windows**: `%APPDATA%\MihomoProxy\config.json`
- **macOS**: `~/Library/Application Support/MihomoProxy/config.json`
- **Linux**: `~/.config/mihomoproxy/config.json`

## 常见问题

### Q: 应用无法启动？
A: 确保系统已安装所有必要的开发依赖。详见"开发环境准备"部分。

### Q: 订阅拉取失败？
A: 
- 检查订阅链接是否有效
- 确保网络连接正常
- 部分订阅可能需要代理才能访问

### Q: 节点延迟显示 "--"？
A: 点击"一键测速"按钮测试所有节点延迟。

### Q: 如何更新节点列表？
A: 在服务商管理页面点击对应服务商的"更新订阅"按钮。

## 开发指南

### 添加新的 Tauri 命令

1. 在 `src-tauri/src/commands/` 中创建新的命令模块
2. 在 `mod.rs` 中导出新模块
3. 在 `lib.rs` 中注册命令
4. 在前端 `src/lib/api.ts` 中添加对应的 TypeScript 包装函数

### 添加新的 UI 组件

1. 在 `src/components/` 下创建组件文件
2. 使用 Shadcn UI 组件库的基础组件
3. 在需要使用的地方导入

### 修改主题

主题配置位于：
- Tailwind CSS 配置：`tailwind.config.js`
- CSS 变量：`src/index.css`

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
