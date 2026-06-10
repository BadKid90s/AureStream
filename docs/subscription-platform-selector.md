# 订阅平台选择器

## 目标

改造订阅管理页面，支持从不同平台获取订阅：
- **AureStream 官方平台** — 内置官方订阅服务
- **自定义平台** — 第三方服务商（OAuth 登录后自动拉取）
- **手动填写 URL** — 保留现有功能

## 页面设计

订阅管理页顶部增加平台选择下拉框，选中不同平台展示不同面板：

```
SubscriptionPage
┌────────────────────────────────────────────┐
│  [ AureStream平台 v ]  ← 下拉选择器        │
│  ─────────────────────────────────────     │
│                                            │
│  选中 AureStream 平台时：                   │
│  ┌────────────────────────────────────┐   │
│  │  登录后自动获取订阅                 │   │
│  │  [ 登录 AureStream ]               │   │
│  │  ✓ 已登录 · 3条订阅   [刷新]       │   │
│  └────────────────────────────────────┘   │
│                                            │
│  选中自定义平台时：                         │
│  ┌────────────────────────────────────┐   │
│  │  登录 XXX 平台后自动获取            │   │
│  │  [ 登录 ]                          │   │
│  │  ✓ 已连接 · 5条订阅   [刷新]      │   │
│  └────────────────────────────────────┘   │
│                                            │
│  选中手动填写时：                           │
│  ┌────────────────────────────────────┐   │
│  │  URL: [______________] [添加]      │   │
│  └────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

## 架构

```
SubscriptionPage
    │
    ▼
PlatformSelector (下拉选择器)
    │
    ├──> AureStreamPlatform (内置)
    ├──> CustomPlatform (插件)
    └──> ManualPlatform (手动URL)
    │
    ▼
insertSubscription(url, name)  ← 共用导入函数
    │
    ▼
SQLite subscriptions 表
```

## 插件接口

每个平台实现 `SubscriptionPlatform` 接口：

```typescript
interface SubscriptionPlatform {
  id: string                    // 唯一标识
  name: string                  // 显示名称
  description: string
  authMethod: "oauth" | "none"
  getAuthorizationUrl(redirectUri: string): Promise<string>
  handleAuthCallback(url: string): Promise<PlatformCredential>
  fetchSubscriptions(cred: PlatformCredential): Promise<PlatformSubscription[]>
  refreshCredential?(cred: PlatformCredential): Promise<PlatformCredential>
  getAccountInfo?(cred: PlatformCredential): Promise<AccountInfo>
}
```

## OAuth 回调流程

1. 平台生成授权 URL → 系统浏览器打开
2. 用户登录 → 服务器重定向到 `aurestream://oauth/callback?code=X&platform=Y`
3. Rust deep link 处理器解析 → emit 事件到前端
4. 前端回调 → platform.handleAuthCallback(url) → 拿到 token
5. token 存入 tauri-plugin-store
6. platform.fetchSubscriptions(token) → 导入

## 实现步骤

1. `src/types/platform.ts` — 接口定义
2. `src/platforms/platform-registry.ts` — 注册表
3. `src/platforms/builtin/aurestream.ts` — 官方平台
4. `src/platforms/builtin/manual.ts` — 手动平台
5. `src/action/platform-auth.ts` — credential 存取
6. `src-tauri/src/app/setup.rs` — OAuth deep link
7. `src/contexts/PlatformContext.tsx` — 状态管理
8. `src/components/subscription/PlatformSelector.tsx` — UI
9. `src/pages/SubscriptionPage.tsx` — 接入
10. `src/main.tsx` — 包裹 Provider
