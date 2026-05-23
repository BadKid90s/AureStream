# AureStream Mobile UI — Apple Liquid Glass 设计规范

## 概述

基于 iOS 26 / visionOS 设计语言，为 AureStream 构建一套与 PC 端完全独立的移动端 UI。采用 Apple Liquid Glass 液态玻璃设计语言，高级感界面，极简布局，未来感网络控制中心风格。

## 架构决策

- **隔离方式**：`src/mobile/` 独立目录，共用 `src/stores/` 和 `src/lib/api.ts`
- **页面结构**：3 个底部 Tab（首页 / 节点管理 / 设置）+ 主题选择子页面
- **路由分叉**：`App.tsx` 中通过 `useIsMobile()` 判断，移动端渲染 `<MobileApp />`

---

## 一、色彩系统

### 浅色主题

| 用途 | 色值 | 说明 |
|------|------|------|
| 背景 Base | `#F2F4F8` | 暖灰白，带极微蓝倾向，衬托玻璃层次 |
| 文字 Primary | `#1A1A2E` | 深蓝黑，比纯黑更柔和 |
| 文字 Secondary | `#6B7280` | 中灰 |
| 主色 Primary | `#3B82F6` | 经典蓝 |
| 主色深 | `#6366F1` | 靛蓝，渐变用 |
| 流媒体 | `#06B6D4` | 青 |
| AI Route | `#8B5CF6` | 紫 |
| 去广告 | `#10B981` | 翠绿 |
| 玻璃卡片 | `rgba(255,255,255,0.55)` | |
| 玻璃边框 | `rgba(255,255,255,0.50)` | |
| 玻璃阴影 | `0 8px 32px rgba(0,0,0,0.04)` | |

### 深色主题

| 用途 | 色值 | 说明 |
|------|------|------|
| 背景 Base | `#0A0A0F` | 极深蓝黑，衬托玻璃高光 |
| 文字 Primary | `#F0F0F5` | 近白暖灰 |
| 文字 Secondary | `#8E8E93` | iOS systemGray |
| 主色 Primary | `#60A5FA` | 浅蓝 |
| 主色深 | `#818CF8` | 浅靛蓝 |
| 流媒体 | `#22D3EE` | 亮青 |
| AI Route | `#A78BFA` | 浅紫 |
| 去广告 | `#34D399` | 亮翠绿 |
| 玻璃卡片 | `rgba(22,22,28,0.55)` | |
| 玻璃边框 | `rgba(255,255,255,0.07)` | |
| 玻璃阴影 | `0 12px 40px rgba(0,0,0,0.5)` | |

### 色彩逻辑

蓝色系传达安全、信任、技术、稳定（参考 Tailscale、1.1.1.1、Arc Search）。深色模式下蓝色需提高亮度保持可读性，这是 Apple Dark Mode 的标准做法。辅色仅用于模式胶囊的微标和激活指示，面积小不喧宾夺主。背景不纯黑/纯白——带色相才能衬托 glass 层次。

---

## 二、玻璃材质层级

| 层级 | 模糊度 | 透明度 | 用途 |
|------|--------|--------|------|
| Glass Deep | `blur(40px)` | 0.25 | 主背景层、Mesh Gradient 叠加 |
| Glass Medium | `blur(28px)` | 0.45 | 卡片、胶囊、连接按钮壳体 |
| Glass Light | `blur(16px)` | 0.65 | 浮层、底部面板、Tab Bar |
| Glass Highlight | `blur(8px)` | 0.85 | 高亮叠加层、按钮内部高光 |

---

## 三、字体

- 中文：PingFang SC / 系统默认
- 数字：SF Mono / Tabular Nums（计时器、延迟数字）
- 字重：Light(300) / Regular(400) / Semibold(600) / Bold(700)

---

## 四、圆角系统

| 元素 | 圆角 |
|------|------|
| 连接按钮 | `rounded-full` |
| 卡片 | `24px` |
| 模式胶囊 | `20px` |
| Tab Bar | `32px` |
| 底部面板 | `28px`（顶部） |

---

## 五、页面结构与组件树

```
MobileApp
├── MeshGradientBackground          # 动态网格渐变背景层
├── StatusHeader                    # 顶部极简状态区
├── [路由页面]
│   ├── HomePage                    # Tab 1: 控制中心首页
│   │   ├── ProviderChip            #   服务商名小标签
│   │   ├── LiquidConnectButton     #   中央超大液态玻璃连接按钮
│   │   │   ├── OuterRing           #     外圈光环（连接状态指示）
│   │   │   ├── GlassSphere         #     玻璃球体
│   │   │   └── StatusLabel         #     状态文字
│   │   ├── ConnectionInfo          #   当前节点信息
│   │   └── ModeCapsuleBar          #   模式切换胶囊（连接后隐藏）
│   │       └── ModeCapsule[]
│   │
│   ├── NodesPage                   # Tab 2: 节点管理
│   │   ├── CurrentProviderCard     #   服务商信息卡片
│   │   ├── SortToggle              #   延迟/名称排序
│   │   └── NodeList
│   │       └── NodeRow[]
│   │
│   └── SettingsPage                # Tab 3: 设置
│       ├── ThemeRow → ThemePage    #   主题选择（二级页面）
│       └── AboutSection            #   版本、隐私政策
│
├── GlassTabBar                     # 悬浮式玻璃 Tab Bar
│
└── NodeBottomSheet                 # 全局底部节点面板
    ├── SheetHandle
    ├── SheetHeader
    └── SheetNodeList
```

---

## 六、核心页面详细设计

### 6.1 HomePage — 控制中心首页

布局从上到下：
1. **StatusHeader**（48px）：AureStream 标志 + 时间/WiFi 图标，极简无标题
2. **ProviderChip**：仅显示服务商名称，轻量小标签
3. **LiquidConnectButton**（~180px）：液态玻璃球体 + 外圈光环，视觉焦点
4. **ConnectionInfo**：当前节点名称 + 位置 + 延迟
5. **ModeCapsuleBar**：4 个模式胶囊横向排列，连接后整个 Bar 隐藏

大面积留白，让连接按钮成为唯一焦点。不显示上下行速度。

### 6.2 LiquidConnectButton — 连接按钮

球体直径 180px，多层视觉结构：
- 第 1 层 — 玻璃壳体：半透明 + `backdrop-blur(24px)` + 微弱边框
- 第 2 层 — 内部高光：顶部 inset box-shadow 模拟玻璃折射
- 第 3 层 — 图标 + 状态文字
- 外圈 — 光环 ring，球体外缘 6px 间距，宽度 3-4px

| 状态 | 外圈光环 | 球体 | 图标/文字 |
|------|---------|------|----------|
| 未连接 | 无光环 | 暖灰白透明玻璃 | Power(灰) / "未连接" |
| 连接中 | 蓝紫渐变环，旋转 | 玻璃 + Loader 旋转 | Loader / "连接中" |
| 已连接 | 蓝→青→翠绿三色实心环，微光 | 高亮玻璃 | Power(白发光) / "已连接" |
| 断开中 | 光环渐隐+旋转 | 暗化 | Loader / "断开中" |

### 6.3 ModeCapsuleBar — 模式切换胶囊

4 个胶囊横向排列，多选模式：
- **智能模式 / 流媒体 / AI Route / 去广告**
- 激活态：对应辅色填充 + 白色图标文字 + 微光阴影
- 未激活态：透明玻璃背景 + 灰色文字
- 切换动画：spring 弹性，背景色 0.3s
- 连接后：`opacity 0 + translateY(8px)`，0.3s ease-out 隐藏

Store 字段映射：
| 模式 | Store 字段 | 说明 |
|------|-----------|------|
| 智能模式 | `smartRoute` | 国内外流量自动分流 |
| 流媒体 | `streamMode`（新增） | 强制全局代理 + 流媒体优化 |
| AI Route | `aiRoute`（新增） | AI 服务专用路由 |
| 去广告 | `smartAdBlock` | 广告拦截 |

### 6.4 NodeBottomSheet — 底部节点面板

- 覆盖屏幕 60% 高度，顶部圆角 28px
- 拖拽手柄 + 标题 + 排序 toggle + 节点列表
- 每行：国旗 emoji + 名称 + 信号圆点（绿<100ms / 黄<300ms / 红>300ms）
- 当前选中节点显示主色勾选
- 底部「测试全部延迟」按钮
- 展开/收起：iOS 标准弹簧曲线

### 6.5 NodesPage — 节点管理

CurrentProviderCard（名称 + 节点数 + 到期日）+ SortToggle + NodeList + FAB 测试延迟按钮。

### 6.6 SettingsPage — 设置

简化为两个区块：
- **外观**：点击进入主题选择子页面（浅色 / 深色 / 跟随系统，三选一）
- **关于**：版本号、隐私政策

无自动连接、开机连接开关（移动端不需要）。

---

## 七、动画规范

| 场景 | 动画 | 时长 | 缓动 |
|------|------|------|------|
| 连接按钮点击 | scale(0.95)→scale(1.02)→scale(1) | 300ms | spring |
| 球体变色（连/断） | 渐变过渡 | 400ms | ease |
| 光环出现 | 旋转 + 渐显 | 600ms | ease-out |
| 光环消失 | 渐隐 + 停转 | 400ms | ease-in |
| 模式胶囊切换 | 背景色过渡 | 300ms | ease |
| 模式胶囊隐藏 | opacity+translateY | 300ms | ease-out |
| 底部面板打开 | 上滑 | 350ms | cubic-bezier(0.32,0.72,0,1) |
| 底部面板关闭 | 下滑 | 250ms | ease-in |
| Tab 滑动指示器 | 位移 | 400ms | cubic-bezier(0.25,1,0.5,1) |
| Tab 图标缩放 | scale(1.1) | 300ms | spring |
| 页面进入 | opacity+translateY(4px) | 250ms | ease-out |

---

## 八、文件清单

### 新增文件（`src/mobile/`）

```
src/mobile/
├── MobileApp.tsx
├── pages/
│   ├── HomePage.tsx
│   ├── NodesPage.tsx
│   ├── SettingsPage.tsx
│   └── ThemePage.tsx
├── components/
│   ├── LiquidConnectButton.tsx
│   ├── ModeCapsuleBar.tsx
│   ├── GlassTabBar.tsx
│   ├── StatusHeader.tsx
│   ├── NodeBottomSheet.tsx
│   ├── MeshGradientBackground.tsx
│   ├── ConnectionInfo.tsx
│   ├── ProviderChip.tsx
│   └── NodeRow.tsx
└── styles/
    └── mobile.css
```

### 修改的现有文件

| 文件 | 改动内容 |
|------|---------|
| `src/App.tsx` | 移动分支改为渲染 `<MobileApp />` |
| `src/stores/appStore.ts` | 新增 `streamMode`、`aiRoute` 字段及 setter |

---

## 九、约束与边界

- 不修改 PC 端组件和样式
- 不修改 `src/lib/api.ts` 接口层
- Store 新增字段需保持向后兼容（PC 端忽略新字段）
- 移动端 CSS 写在 `src/mobile/styles/mobile.css`，不污染全局样式
- 参考项目：Apple 控制中心、Arc Search、Tailscale、1.1.1.1
- 禁止风格：安卓风、赛博朋克、复杂仪表盘、游戏 UI、霓虹灯、信息堆叠
