# Mobile Liquid Glass UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone mobile UI for AureStream using Apple Liquid Glass design language, completely independent from desktop components.

**Architecture:** All mobile code lives in `src/mobile/` with its own pages and components. Shares Zustand stores and API layer with desktop. Two new store fields (`streamMode`, `aiRoute`) added for new proxy modes. MobileApp replaces the mobile branch in App.tsx.

**Tech Stack:** React 19 + TypeScript + Tailwind CSS v4 + Zustand + Lucide icons + Tauri IPC

---

## Spec Coverage Checklist (pre-flight)

- [x] Color system (light + dark) — Task 1 (CSS custom properties)
- [x] Glass material layers — Task 1 (CSS utilities)
- [x] Typography — Task 1 (CSS)
- [x] Border radius system — Task 1 (CSS)
- [x] Animation specs — distributed across component tasks
- [x] LiquidConnectButton with outer ring — Task 7
- [x] ModeCapsuleBar (multi-select, hide when connected) — Task 9
- [x] NodeBottomSheet — Task 10
- [x] HomePage layout — Task 11
- [x] NodesPage — Task 12
- [x] SettingsPage + ThemePage — Task 13
- [x] GlassTabBar — Task 5
- [x] StatusHeader — Task 4
- [x] ProviderChip (name only) — Task 6
- [x] ConnectionInfo — Task 8
- [x] MeshGradientBackground — Task 3
- [x] No speed stats display — verified in HomePage task
- [x] ModeCapsuleBar hidden when connected — Task 9
- [x] Store modifications (streamMode, aiRoute) — Task 2
- [x] App.tsx modification — Task 15

---

### Task 1: Create directory structure and mobile.css

**Files:**
- Create: `src/mobile/styles/mobile.css`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p src/mobile/pages src/mobile/components src/mobile/styles
```

- [ ] **Step 2: Write mobile.css with all design tokens**

Write `src/mobile/styles/mobile.css`:

```css
/* ===== AureStream Mobile — Apple Liquid Glass Design System ===== */

:root {
  /* Light theme */
  --mg-base: #F2F4F8;
  --mg-text-primary: #1A1A2E;
  --mg-text-secondary: #6B7280;
  --mg-primary: #3B82F6;
  --mg-primary-deep: #6366F1;
  --mg-stream: #06B6D4;
  --mg-ai: #8B5CF6;
  --mg-adblock: #10B981;

  /* Glass tokens — light */
  --mg-glass-bg: rgba(255, 255, 255, 0.55);
  --mg-glass-border: rgba(255, 255, 255, 0.50);
  --mg-glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.04);
  --mg-glass-highlight: inset 0 1px 0 rgba(255, 255, 255, 0.7);

  /* Glass Deep (background layer) */
  --mg-glass-deep-bg: rgba(255, 255, 255, 0.25);
  --mg-glass-deep-blur: blur(40px);

  /* Glass Light (overlays, tab bar) */
  --mg-glass-light-bg: rgba(255, 255, 255, 0.65);
  --mg-glass-light-blur: blur(16px);

  /* Glass Medium (cards, capsules, button body) */
  --mg-glass-medium-bg: rgba(255, 255, 255, 0.45);
  --mg-glass-medium-blur: blur(28px);

  /* Glass Highlight (inner shine) */
  --mg-glass-highlight-bg: rgba(255, 255, 255, 0.85);
  --mg-glass-highlight-blur: blur(8px);

  /* Outer ring colors */
  --mg-ring-idle: transparent;
  --mg-ring-connecting-start: #3B82F6;
  --mg-ring-connecting-end: #6366F1;
  --mg-ring-connected-start: #3B82F6;
  --mg-ring-connected-mid: #06B6D4;
  --mg-ring-connected-end: #10B981;
}

.dark {
  --mg-base: #0A0A0F;
  --mg-text-primary: #F0F0F5;
  --mg-text-secondary: #8E8E93;
  --mg-primary: #60A5FA;
  --mg-primary-deep: #818CF8;
  --mg-stream: #22D3EE;
  --mg-ai: #A78BFA;
  --mg-adblock: #34D399;

  --mg-glass-bg: rgba(22, 22, 28, 0.55);
  --mg-glass-border: rgba(255, 255, 255, 0.07);
  --mg-glass-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  --mg-glass-highlight: inset 0 1px 0 rgba(255, 255, 255, 0.04);

  --mg-glass-deep-bg: rgba(22, 22, 28, 0.25);
  --mg-glass-light-bg: rgba(22, 22, 28, 0.65);
  --mg-glass-medium-bg: rgba(22, 22, 28, 0.45);
  --mg-glass-highlight-bg: rgba(22, 22, 28, 0.85);

  --mg-ring-idle: transparent;
  --mg-ring-connecting-start: #60A5FA;
  --mg-ring-connecting-end: #818CF8;
  --mg-ring-connected-start: #60A5FA;
  --mg-ring-connected-mid: #22D3EE;
  --mg-ring-connected-end: #34D399;
}

/* ===== Base reset for mobile ===== */
.mobile-app {
  background: var(--mg-base);
  color: var(--mg-text-primary);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Helvetica Neue", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* ===== Glass utility classes ===== */
.mg-glass-deep {
  background: var(--mg-glass-deep-bg);
  backdrop-filter: var(--mg-glass-deep-blur) saturate(160%);
  -webkit-backdrop-filter: var(--mg-glass-deep-blur) saturate(160%);
}

.mg-glass-medium {
  background: var(--mg-glass-medium-bg);
  backdrop-filter: var(--mg-glass-medium-blur) saturate(175%);
  -webkit-backdrop-filter: var(--mg-glass-medium-blur) saturate(175%);
  border: 1px solid var(--mg-glass-border);
  box-shadow: var(--mg-glass-shadow), var(--mg-glass-highlight);
}

.mg-glass-light {
  background: var(--mg-glass-light-bg);
  backdrop-filter: var(--mg-glass-light-blur) saturate(170%);
  -webkit-backdrop-filter: var(--mg-glass-light-blur) saturate(170%);
  border: 1px solid var(--mg-glass-border);
}

.mg-glass-card {
  background: var(--mg-glass-bg);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid var(--mg-glass-border);
  box-shadow: var(--mg-glass-shadow), var(--mg-glass-highlight);
  border-radius: 24px;
}

/* ===== Mesh Gradient Background ===== */
.mg-mesh-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
}

.mg-mesh-layer {
  position: absolute;
  inset: 0;
  opacity: 0.4;
}

.dark .mg-mesh-layer {
  opacity: 0.25;
}

.mg-mesh-gradient-1 {
  background: radial-gradient(ellipse at 30% 40%, rgba(59, 130, 246, 0.12) 0%, transparent 55%);
}

.mg-mesh-gradient-2 {
  background: radial-gradient(ellipse at 70% 60%, rgba(99, 102, 241, 0.10) 0%, transparent 55%);
}

.mg-mesh-gradient-3 {
  background: radial-gradient(ellipse at 50% 80%, rgba(6, 182, 212, 0.06) 0%, transparent 50%);
}

/* ===== Outer ring animation ===== */
@keyframes ring-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes ring-pulse-connected {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

.mg-ring-spin {
  animation: ring-rotate 1.5s linear infinite;
}

.mg-ring-glow {
  animation: ring-pulse-connected 2s ease-in-out infinite;
}

/* ===== Mode capsule animations ===== */
@keyframes capsule-in {
  from { opacity: 0; transform: translateY(8px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes capsule-out {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to { opacity: 0; transform: translateY(8px) scale(0.95); }
}

/* ===== Bottom sheet transition ===== */
@keyframes sheet-slide-in {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes sheet-slide-out {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}

@keyframes sheet-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes sheet-fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* ===== Page enter animation ===== */
@keyframes page-enter {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== Connect button breathing (ring glow) ===== */
@keyframes connect-glow-idle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.5; }
}

@keyframes connect-glow-active {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* ===== Tab bar float ===== */
.mg-tab-bar {
  position: fixed;
  bottom: 20px;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
}

.mg-tab-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: 280px;
  height: 64px;
  padding: 6px;
  border-radius: 32px;
  background: var(--mg-glass-bg);
  backdrop-filter: blur(36px) saturate(190%);
  -webkit-backdrop-filter: blur(36px) saturate(190%);
  border: 1px solid var(--mg-glass-border);
  box-shadow: var(--mg-glass-shadow), var(--mg-glass-highlight);
}

.mg-tab-indicator {
  position: absolute;
  top: 6px;
  height: 52px;
  border-radius: 26px;
  background: var(--mg-primary);
  opacity: 0.12;
  transition: left 0.4s cubic-bezier(0.25, 1, 0.5, 1), width 0.4s cubic-bezier(0.25, 1, 0.5, 1);
}

.dark .mg-tab-indicator {
  opacity: 0.18;
}

/* ===== Bottom sheet overlay ===== */
.mg-sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* ===== Bottom sheet panel ===== */
.mg-sheet-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 70;
  max-height: 60vh;
  border-radius: 28px 28px 0 0;
  background: var(--mg-glass-light-bg);
  backdrop-filter: blur(32px) saturate(180%);
  -webkit-backdrop-filter: blur(32px) saturate(180%);
  border: 1px solid var(--mg-glass-border);
  box-shadow: 0 -15px 50px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dark .mg-sheet-panel {
  box-shadow: 0 -15px 50px rgba(0, 0, 0, 0.5);
}

.mg-sheet-handle {
  width: 36px;
  height: 5px;
  border-radius: 999px;
  background: rgba(128, 128, 128, 0.3);
  margin: 12px auto 16px;
  flex-shrink: 0;
}

/* ===== Mode capsule ===== */
.mg-capsule {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 20px;
  border: 1px solid transparent;
  background: transparent;
  transition: background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  min-width: 64px;
}

.mg-capsule:active {
  transform: scale(0.96);
}

.mg-capsule-on {
  border-color: var(--mg-glass-border);
  box-shadow: var(--mg-glass-shadow);
}

/* ===== Scrollbar hide ===== */
.mg-scroll-none {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.mg-scroll-none::-webkit-scrollbar {
  display: none;
}

/* ===== Status header ===== */
.mg-status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background: rgba(242, 244, 248, 0.4);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border-bottom: 1px solid rgba(59, 130, 246, 0.06);
}

.dark .mg-status-header {
  background: rgba(10, 10, 15, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

/* ===== Provider chip ===== */
.mg-provider-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  background: var(--mg-glass-medium-bg);
  backdrop-filter: var(--mg-glass-medium-blur) saturate(175%);
  -webkit-backdrop-filter: var(--mg-glass-medium-blur) saturate(175%);
  border: 1px solid var(--mg-glass-border);
  color: var(--mg-text-primary);
}

/* ===== Connection info card ===== */
.mg-connection-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border-radius: 24px;
  background: var(--mg-glass-bg);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid var(--mg-glass-border);
  box-shadow: var(--mg-glass-shadow);
}

/* ===== Node row ===== */
.mg-node-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--mg-glass-border);
  transition: background-color 0.15s ease;
  cursor: pointer;
}

.mg-node-row:active {
  background: rgba(59, 130, 246, 0.06);
}

/* ===== Signal dot ===== */
.mg-signal-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.mg-signal-excellent { background: #10B981; }
.mg-signal-good { background: #F59E0B; }
.mg-signal-poor { background: #EF4444; }
.mg-signal-unknown { background: #9CA3AF; }

/* ===== Theme page ===== */
.mg-theme-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 20px;
  border: 2px solid transparent;
  background: var(--mg-glass-bg);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  transition: border-color 0.3s ease;
  cursor: pointer;
}
.mg-theme-option-selected {
  border-color: var(--mg-primary);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/mobile/styles/mobile.css
git commit -m "feat: add mobile Liquid Glass CSS design system"
```

---

### Task 2: Add streamMode and aiRoute to appStore

**Files:**
- Modify: `src/stores/appStore.ts`

- [ ] **Step 1: Add new fields to the AppStore interface**

In `src/stores/appStore.ts`, add `streamMode` and `aiRoute` to the `AppStore` interface (after the `smartAdBlock` line):

```typescript
  smartRoute: boolean;
  smartAdBlock: boolean;
  streamMode: boolean;
  aiRoute: boolean;
```

And add the setters after `setSmartAdBlock`:

```typescript
  setSmartAdBlock: (value: boolean) => Promise<void>;
  setStreamMode: (value: boolean) => Promise<void>;
  setAiRoute: (value: boolean) => Promise<void>;
```

- [ ] **Step 2: Add default values in the store initializer**

After `smartAdBlock: false,`:

```typescript
      streamMode: false,
      aiRoute: false,
```

- [ ] **Step 3: Add field loading in loadSettings**

After `smartAdBlock: settings.smartAdBlock ?? false,`:

```typescript
        streamMode: (settings as any).streamMode ?? false,
        aiRoute: (settings as any).aiRoute ?? false,
```

- [ ] **Step 4: Add setter implementations**

After the `setSmartAdBlock` implementation:

```typescript
  setStreamMode: async (value) => {
    set({ streamMode: value });
    savePersistedSettings({ streamMode: value } as any).catch(console.error);
  },

  setAiRoute: async (value) => {
    set({ aiRoute: value });
    savePersistedSettings({ aiRoute: value } as any).catch(console.error);
  },
```

- [ ] **Step 5: Commit**

```bash
git add src/stores/appStore.ts
git commit -m "feat: add streamMode and aiRoute fields to appStore"
```

---

### Task 3: Create MeshGradientBackground

**Files:**
- Create: `src/mobile/components/MeshGradientBackground.tsx`

- [ ] **Step 1: Write the component**

```typescript
export function MeshGradientBackground() {
  return (
    <div className="mg-mesh-bg" aria-hidden="true">
      <div className="mg-mesh-layer">
        <div className="mg-mesh-gradient-1" style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 30% 40%, rgba(59,130,246,0.12) 0%, transparent 55%)"
        }} />
        <div className="mg-mesh-gradient-2" style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 70% 60%, rgba(99,102,241,0.10) 0%, transparent 55%)"
        }} />
        <div className="mg-mesh-gradient-3" style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 50% 80%, rgba(6,182,212,0.06) 0%, transparent 50%)"
        }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/mobile/components/MeshGradientBackground.tsx
git commit -m "feat: add MeshGradientBackground component"
```

---

### Task 4: Create StatusHeader

**Files:**
- Create: `src/mobile/components/StatusHeader.tsx`

- [ ] **Step 1: Write the component**

```typescript
import { Zap } from "lucide-react";

interface StatusHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function StatusHeader({ title, showBack, onBack }: StatusHeaderProps) {
  return (
    <header className="mg-status-header shrink-0">
      <div className="flex items-center gap-2">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-full text-mg-text-secondary active:scale-95 transition-transform"
            aria-label="返回"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3L5 8L10 13" />
            </svg>
          </button>
        ) : (
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--mg-primary)] to-[var(--mg-primary-deep)] flex items-center justify-center shadow-md">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-[var(--mg-primary)] to-[var(--mg-primary-deep)] bg-clip-text text-transparent">
          AureStream
        </span>
      </div>

      {title && (
        <span className="text-[13px] font-semibold text-[var(--mg-text-secondary)]">
          {title}
        </span>
      )}

      {/* Spacer for symmetry */}
      <div className="w-8" />
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/mobile/components/StatusHeader.tsx
git commit -m "feat: add StatusHeader component"
```

---

### Task 5: Create GlassTabBar

**Files:**
- Create: `src/mobile/components/GlassTabBar.tsx`

- [ ] **Step 1: Write the component**

```typescript
import { Home, Radio, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

interface GlassTabBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const tabs: Tab[] = [
  { id: "home", label: "首页", icon: Home },
  { id: "nodes", label: "节点", icon: Radio },
  { id: "settings", label: "设置", icon: Settings },
];

export function GlassTabBar({ currentPage, onNavigate }: GlassTabBarProps) {
  const activeIndex = tabs.findIndex((t) => t.id === currentPage);

  return (
    <div className="mg-tab-bar">
      <nav className="mg-tab-bar-inner relative">
        {/* Sliding indicator */}
        <div
          className="mg-tab-indicator"
          style={{
            width: `calc((100% - 12px) / 3)`,
            left: `calc(6px + ${activeIndex === -1 ? 0 : activeIndex} * (100% - 12px) / 3)`,
          }}
        />

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentPage === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className={cn(
                "relative flex-1 h-full rounded-full flex flex-col items-center justify-center gap-0.5 transition-colors duration-300 z-10",
                isActive
                  ? "text-[var(--mg-primary)]"
                  : "text-[var(--mg-text-secondary)]"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-transform duration-300",
                  isActive && "scale-110"
                )}
                strokeWidth={2}
              />
              <span className="text-[10px] font-semibold tracking-wider">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/mobile/components/GlassTabBar.tsx
git commit -m "feat: add GlassTabBar component"
```

---

### Task 6: Create ProviderChip

**Files:**
- Create: `src/mobile/components/ProviderChip.tsx`

- [ ] **Step 1: Write the component**

```typescript
import { Package } from "lucide-react";

interface ProviderChipProps {
  name: string;
}

export function ProviderChip({ name }: ProviderChipProps) {
  return (
    <div className="mg-provider-chip">
      <Package className="w-3.5 h-3.5 text-[var(--mg-primary)]" />
      <span>{name}</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/mobile/components/ProviderChip.tsx
git commit -m "feat: add ProviderChip component"
```

---

### Task 7: Create LiquidConnectButton

**Files:**
- Create: `src/mobile/components/LiquidConnectButton.tsx`

This is the centerpiece component — a 180px glass sphere with outer ring indicator.

- [ ] **Step 1: Write the component**

```typescript
import { Power, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiquidConnectButtonProps {
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export function LiquidConnectButton({
  isConnected,
  isConnecting,
  isDisconnecting,
  disabled,
  onToggle,
}: LiquidConnectButtonProps) {
  const busy = isConnecting || isDisconnecting;
  const active = isConnected && !isDisconnecting;

  const statusText = isDisconnecting
    ? "断开中"
    : isConnecting
      ? "连接中"
      : isConnected
        ? "已连接"
        : "未连接";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled && !isConnected}
      className={cn(
        "relative flex-shrink-0 flex flex-col items-center justify-center rounded-full",
        "w-[180px] h-[180px]",
        "cursor-pointer select-none outline-none focus:outline-none",
        "transition-all duration-700 ease-in-out",
        "backdrop-blur-2xl border",
        active
          ? "border-cyan-500/30 bg-transparent"
          : "border-slate-200/40 dark:border-white/[0.08] bg-transparent",
        busy && "border-primary/20",
      )}
    >
      {/* Outer ring */}
      {active && (
        <svg
          className="absolute inset-0 w-full h-full mg-ring-glow pointer-events-none"
          viewBox="0 0 200 200"
          style={{ margin: -8 }}
        >
          <defs>
            <linearGradient id="ring-connected" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--mg-ring-connected-start)" />
              <stop offset="50%" stopColor="var(--mg-ring-connected-mid)" />
              <stop offset="100%" stopColor="var(--mg-ring-connected-end)" />
            </linearGradient>
          </defs>
          <circle
            cx="100" cy="100" r="94"
            fill="none"
            stroke="url(#ring-connected)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="20 4"
          />
        </svg>
      )}

      {busy && (
        <svg
          className="absolute inset-0 w-full h-full mg-ring-spin pointer-events-none"
          viewBox="0 0 200 200"
          style={{ margin: -8 }}
        >
          <defs>
            <linearGradient id="ring-connecting" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--mg-ring-connecting-start)" />
              <stop offset="100%" stopColor="var(--mg-ring-connecting-end)" />
            </linearGradient>
          </defs>
          <circle
            cx="100" cy="100" r="94"
            fill="none"
            stroke="url(#ring-connecting)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="60 40"
          />
        </svg>
      )}

      {/* Glass sphere body */}
      <div
        className={cn(
          "flex h-[70%] w-[70%] flex-col items-center justify-center gap-2 rounded-full transition-all duration-700 ease-in-out",
          active
            ? "bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 shadow-[inset_0_2px_4px_rgba(255,255,255,0.45),0_10px_25px_rgba(59,130,246,0.45)] text-white"
            : busy
              ? "bg-gradient-to-tr from-indigo-600/70 via-blue-500/70 to-cyan-400/70 text-white/90"
              : "bg-gradient-to-b from-white to-slate-50/95 dark:from-zinc-800/85 dark:to-zinc-900/95 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_2px_3px_rgba(255,255,255,1)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)] border border-slate-200/50 dark:border-zinc-700/35",
        )}
      >
        {busy ? (
          <Loader2 className="h-10 w-10 animate-spin text-white/80" strokeWidth={2} />
        ) : (
          <Power
            className={cn(
              "h-10 w-10 transition-all duration-700",
              active
                ? "scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.7)] text-white"
                : "text-slate-400 dark:text-zinc-500 group-hover:text-[var(--mg-primary)] group-hover:scale-110",
            )}
            strokeWidth={2}
          />
        )}
        <span
          className={cn(
            "text-[13px] font-bold tracking-widest transition-colors duration-700",
            active
              ? "text-white/95"
              : "text-slate-500 dark:text-zinc-400 group-hover:text-[var(--mg-primary)]",
          )}
        >
          {statusText}
        </span>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/mobile/components/LiquidConnectButton.tsx
git commit -m "feat: add LiquidConnectButton component with outer ring"
```

---

### Task 8: Create ConnectionInfo

**Files:**
- Create: `src/mobile/components/ConnectionInfo.tsx`

- [ ] **Step 1: Write the component**

```typescript
import { getLatencyLevel } from "@/types";

interface ConnectionInfoProps {
  nodeName?: string;
  nodeServer?: string;
  delay?: number;
}

function parseNodeLabels(nodeName?: string): { flag: string; primary: string; secondary: string } {
  if (!nodeName) return { flag: "🌐", primary: "未选择节点", secondary: "" };
  const parts = nodeName.split(/·|•/).map((p) => p.trim()).filter(Boolean);
  const primary = parts[0] ?? nodeName;
  const secondary = parts.slice(1, 3).join(" · ") || "";
  const flagMap: Record<string, string> = {
    中国: "🇨🇳", 香港: "🇭🇰", 台湾: "🇹🇼", 日本: "🇯🇵", 东京: "🇯🇵",
    新加坡: "🇸🇬", 美国: "🇺🇸", 英国: "🇬🇧", 韩国: "🇰🇷", 德国: "🇩🇪", 法国: "🇫🇷",
  };
  const flag = flagMap[primary] ?? "🌐";
  return { flag, primary, secondary };
}

export function ConnectionInfo({ nodeName, nodeServer, delay }: ConnectionInfoProps) {
  const { flag, primary, secondary } = parseNodeLabels(nodeName);
  const level = getLatencyLevel(delay);

  const dotColor =
    level === "excellent" ? "mg-signal-excellent" :
    level === "good" ? "mg-signal-good" :
    level === "poor" ? "mg-signal-poor" :
    "mg-signal-unknown";

  return (
    <div className="mg-connection-info">
      <span className="text-xl">{flag}</span>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-[var(--mg-text-primary)] truncate">
          {primary}
        </span>
        {secondary && (
          <span className="text-[11px] text-[var(--mg-text-secondary)] truncate">
            {secondary}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 ml-auto">
        <div className={`mg-signal-dot ${dotColor}`} />
        <span className="text-xs font-mono font-medium text-[var(--mg-text-secondary)]">
          {delay != null ? `${delay}ms` : "--"}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/mobile/components/ConnectionInfo.tsx
git commit -m "feat: add ConnectionInfo component"
```

---

### Task 9: Create ModeCapsuleBar

**Files:**
- Create: `src/mobile/components/ModeCapsuleBar.tsx`

- [ ] **Step 1: Write the component**

```typescript
import { Compass, Film, Bot, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface Mode {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  activeColor: string;
}

const modes: Mode[] = [
  { id: "smart", label: "智能", icon: Compass, activeColor: "var(--mg-primary)" },
  { id: "stream", label: "流媒体", icon: Film, activeColor: "var(--mg-stream)" },
  { id: "ai", label: "AI", icon: Bot, activeColor: "var(--mg-ai)" },
  { id: "adblock", label: "去广告", icon: Shield, activeColor: "var(--mg-adblock)" },
];

interface ModeCapsuleBarProps {
  activeModes: Record<string, boolean>;
  onToggle: (id: string) => void;
  visible: boolean;
  disabled: boolean;
}

export function ModeCapsuleBar({ activeModes, onToggle, visible, disabled }: ModeCapsuleBarProps) {
  return (
    <div
      className={cn(
        "flex justify-center gap-2 px-4 transition-all duration-300 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
      )}
      style={{ height: visible ? "auto" : 0, overflow: "hidden" }}
    >
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isOn = activeModes[mode.id] ?? false;

        return (
          <button
            key={mode.id}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(mode.id)}
            className={cn(
              "mg-capsule",
              isOn && "mg-capsule-on",
            )}
            style={isOn ? {
              backgroundColor: `${mode.activeColor}14`,
              borderColor: `${mode.activeColor}40`,
            } : undefined}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300",
                isOn
                  ? "text-white shadow-sm"
                  : "bg-black/5 dark:bg-white/5 text-[var(--mg-text-secondary)]",
              )}
              style={isOn ? {
                background: `linear-gradient(to top right, ${mode.activeColor}, ${mode.activeColor}CC)`,
                boxShadow: `0 2px 8px ${mode.activeColor}40`,
              } : undefined}
            >
              <Icon className="w-4 h-4" strokeWidth={2} />
            </div>
            <span className={cn(
              "text-[11px] font-semibold transition-colors duration-300",
              isOn ? "text-[var(--mg-text-primary)]" : "text-[var(--mg-text-secondary)]",
            )}>
              {mode.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/mobile/components/ModeCapsuleBar.tsx
git commit -m "feat: add ModeCapsuleBar component"
```

---

### Task 10: Create NodeBottomSheet + NodeRow

**Files:**
- Create: `src/mobile/components/NodeBottomSheet.tsx`
- Create: `src/mobile/components/NodeRow.tsx`

- [ ] **Step 1: Write NodeRow component**

`src/mobile/components/NodeRow.tsx`:

```typescript
import { Check } from "lucide-react";
import { getLatencyLevel } from "@/types";
import type { Node } from "@/types";

function parseFlag(nodeName: string): string {
  const flagMap: Record<string, string> = {
    中国: "🇨🇳", 香港: "🇭🇰", 台湾: "🇹🇼", 日本: "🇯🇵", 东京: "🇯🇵",
    新加坡: "🇸🇬", 美国: "🇺🇸", 英国: "🇬🇧", 韩国: "🇰🇷", 德国: "🇩🇪", 法国: "🇫🇷",
  };
  const primary = nodeName.split(/·|•/)[0]?.trim() ?? "";
  return flagMap[primary] ?? "🌐";
}

interface NodeRowProps {
  node: Node;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function NodeRow({ node, isSelected, onSelect }: NodeRowProps) {
  const level = getLatencyLevel(node.delay);
  const dotColor =
    level === "excellent" ? "mg-signal-excellent" :
    level === "good" ? "mg-signal-good" :
    level === "poor" ? "mg-signal-poor" :
    "mg-signal-unknown";

  return (
    <button
      type="button"
      className="mg-node-row w-full text-left"
      onClick={() => onSelect(node.id)}
    >
      <span className="text-lg flex-shrink-0">{parseFlag(node.name)}</span>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-semibold text-[var(--mg-text-primary)] truncate">
          {node.name}
        </span>
        <span className="text-[11px] text-[var(--mg-text-secondary)] truncate">
          {node.server}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className={`mg-signal-dot ${dotColor}`} />
        <span className="text-xs font-mono text-[var(--mg-text-secondary)] w-10 text-right">
          {node.delayError ? "超时" : node.delay != null ? `${node.delay}ms` : "--"}
        </span>
        {isSelected && (
          <Check className="w-4 h-4 text-[var(--mg-primary)]" strokeWidth={2.5} />
        )}
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Write NodeBottomSheet component**

`src/mobile/components/NodeBottomSheet.tsx`:

```typescript
import { useMemo } from "react";
import { ArrowDown01, ArrowDownAZ, RefreshCw } from "lucide-react";
import { NodeRow } from "./NodeRow";
import type { Node } from "@/types";

interface NodeBottomSheetProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  currentNodeId?: string;
  sortBy: "name" | "delay";
  onSortChange: (sort: "name" | "delay") => void;
  onSelect: (id: string) => void;
  onTestLatency: () => void;
  isTesting: boolean;
}

export function NodeBottomSheet({
  open,
  onClose,
  nodes,
  currentNodeId,
  sortBy,
  onSortChange,
  onSelect,
  onTestLatency,
  isTesting,
}: NodeBottomSheetProps) {
  const sorted = useMemo(() => {
    const arr = [...nodes];
    if (sortBy === "name") {
      arr.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
    } else {
      arr.sort((a, b) => {
        const da = a.delayError ? Infinity : (a.delay ?? Infinity);
        const db = b.delayError ? Infinity : (b.delay ?? Infinity);
        if (da === Infinity && db === Infinity) return a.name.localeCompare(b.name, "zh-Hans-CN");
        return da - db;
      });
    }
    return arr;
  }, [nodes, sortBy]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="mg-sheet-overlay"
        onClick={onClose}
        style={{ animation: "sheet-fade-in 0.25s ease-out" }}
      />

      {/* Panel */}
      <div
        className="mg-sheet-panel"
        style={{ animation: "sheet-slide-in 0.35s cubic-bezier(0.32, 0.72, 0, 1)" }}
      >
        <div className="mg-sheet-handle" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <h3 className="text-base font-bold text-[var(--mg-text-primary)]">选择节点</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSortChange("delay")}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                sortBy === "delay"
                  ? "bg-[var(--mg-primary)] text-white"
                  : "text-[var(--mg-text-secondary)]"
              }`}
            >
              <ArrowDown01 className="w-3.5 h-3.5 inline mr-1" />
              延迟
            </button>
            <button
              type="button"
              onClick={() => onSortChange("name")}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                sortBy === "name"
                  ? "bg-[var(--mg-primary)] text-white"
                  : "text-[var(--mg-text-secondary)]"
              }`}
            >
              <ArrowDownAZ className="w-3.5 h-3.5 inline mr-1" />
              名称
            </button>
          </div>
        </div>

        {/* Node list */}
        <div className="flex-1 overflow-y-auto mg-scroll-none">
          {sorted.map((node) => (
            <NodeRow
              key={node.id}
              node={node}
              isSelected={node.id === currentNodeId}
              onSelect={onSelect}
            />
          ))}
        </div>

        {/* Test latency button */}
        <div className="p-4">
          <button
            type="button"
            onClick={onTestLatency}
            disabled={isTesting}
            className="w-full py-3 rounded-2xl bg-[var(--mg-glass-bg)] backdrop-blur-xl border border-[var(--mg-glass-border)] text-sm font-semibold text-[var(--mg-text-primary)] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isTesting ? "animate-spin" : ""}`} />
            {isTesting ? "测试中..." : "测试全部延迟"}
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/mobile/components/NodeRow.tsx src/mobile/components/NodeBottomSheet.tsx
git commit -m "feat: add NodeBottomSheet and NodeRow components"
```

---

### Task 11: Create HomePage

**Files:**
- Create: `src/mobile/pages/HomePage.tsx`

- [ ] **Step 1: Write the HomePage**

`src/mobile/pages/HomePage.tsx`:

```typescript
import { useState, useEffect, useRef, useCallback } from "react";
import { LiquidConnectButton } from "@/mobile/components/LiquidConnectButton";
import { ModeCapsuleBar } from "@/mobile/components/ModeCapsuleBar";
import { ConnectionInfo } from "@/mobile/components/ConnectionInfo";
import { ProviderChip } from "@/mobile/components/ProviderChip";
import { NodeBottomSheet } from "@/mobile/components/NodeBottomSheet";
import { useProxyStore, useAppStore } from "@/stores/appStore";
import { toast } from "sonner";
import { logErrorDetail, userFacingMessage } from "@/lib/userErrors";

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function HomePage() {
  const {
    currentProvider,
    currentNode,
    isConnected,
    isConnecting,
    isDisconnecting,
    connectedAt,
    connect,
    disconnect,
    nodes,
    applyNodeSelection,
    testLatency,
    isTestingLatency,
  } = useProxyStore();

  const {
    smartRoute,
    smartAdBlock,
    streamMode,
    aiRoute,
    setSmartRoute,
    setSmartAdBlock,
    setStreamMode,
    setAiRoute,
  } = useAppStore();

  const [nowTick, setNowTick] = useState(() => Date.now());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetSort, setSheetSort] = useState<"name" | "delay">("delay");

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedSec =
    isConnected && connectedAt
      ? Math.max(0, Math.floor((nowTick - connectedAt) / 1000))
      : 0;

  const canConnect = Boolean(currentProvider);
  const busy = isConnecting || isDisconnecting;

  const handleConnectionToggle = useCallback(async () => {
    if (isConnected) {
      if (busy) return;
      try { await disconnect(); } catch (e) {
        logErrorDetail("HomePage.disconnect", e);
        toast.error(userFacingMessage("disconnect"));
      }
      return;
    }
    if (!canConnect || isConnecting) return;
    try { await connect(); } catch (e) {
      logErrorDetail("HomePage.connect", e);
      toast.error(userFacingMessage("connect"));
    }
  }, [isConnected, busy, canConnect, isConnecting, connect, disconnect]);

  const activeNodes = currentProvider
    ? nodes.filter((n) => n.providerId === currentProvider.id && n.enabled)
    : [];

  const modeActive: Record<string, boolean> = {
    smart: smartRoute,
    stream: streamMode,
    ai: aiRoute,
    adblock: smartAdBlock,
  };

  const handleModeToggle = useCallback((id: string) => {
    switch (id) {
      case "smart": setSmartRoute(!smartRoute); break;
      case "stream": setStreamMode(!streamMode); break;
      case "ai": setAiRoute(!aiRoute); break;
      case "adblock": setSmartAdBlock(!smartAdBlock); break;
    }
  }, [smartRoute, streamMode, aiRoute, smartAdBlock, setSmartRoute, setStreamMode, setAiRoute, setSmartAdBlock]);

  const handleSelectNode = useCallback(async (id: string) => {
    const node = activeNodes.find((n) => n.id === id);
    if (node) {
      try { await applyNodeSelection(node); } catch (e) {
        toast.error("切换节点失败");
      }
    }
    setSheetOpen(false);
  }, [activeNodes, applyNodeSelection]);

  return (
    <div className="flex flex-col items-center flex-1 min-h-0 overflow-y-auto mg-scroll-none pt-6 pb-4 gap-4">
      {/* Provider chip */}
      {currentProvider && (
        <ProviderChip name={currentProvider.name} />
      )}

      {/* Timer */}
      <div className="flex flex-col items-center">
        <span className={`select-none font-extrabold tabular-nums tracking-tight text-2xl transition-colors duration-500 ${
          isConnected && !isDisconnecting
            ? "text-[var(--mg-text-primary)]"
            : "text-[var(--mg-text-secondary)]/30"
        }`}>
          {isConnected && !isDisconnecting ? formatDuration(elapsedSec) : "00:00:00"}
        </span>
      </div>

      {/* Liquid connect button */}
      <LiquidConnectButton
        isConnected={isConnected}
        isConnecting={isConnecting}
        isDisconnecting={isDisconnecting}
        disabled={!canConnect}
        onToggle={handleConnectionToggle}
      />

      {/* Connection info */}
      {currentNode && (
        <ConnectionInfo
          nodeName={currentNode.name}
          nodeServer={currentNode.server}
          delay={currentNode.delay}
        />
      )}

      {/* Mode capsules (hidden when connected) */}
      <ModeCapsuleBar
        activeModes={modeActive}
        onToggle={handleModeToggle}
        visible={!isConnected}
        disabled={isConnected}
      />

      {/* Node bottom sheet */}
      <NodeBottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        nodes={activeNodes}
        currentNodeId={currentNode?.id}
        sortBy={sheetSort}
        onSortChange={setSheetSort}
        onSelect={handleSelectNode}
        onTestLatency={() => testLatency()}
        isTesting={isTestingLatency}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/mobile/pages/HomePage.tsx
git commit -m "feat: add HomePage with Liquid Glass control center"
```

---

### Task 12: Create NodesPage

**Files:**
- Create: `src/mobile/pages/NodesPage.tsx`

- [ ] **Step 1: Write the component**

`src/mobile/pages/NodesPage.tsx`:

```typescript
import { useState, useMemo } from "react";
import { RefreshCw, ArrowDown01, ArrowDownAZ } from "lucide-react";
import { NodeRow } from "@/mobile/components/NodeRow";
import { useProxyStore } from "@/stores/appStore";
import { toast } from "sonner";

export function NodesPage() {
  const {
    currentProvider,
    currentNode,
    nodes,
    applyNodeSelection,
    testLatency,
    isTestingLatency,
  } = useProxyStore();

  const [sortBy, setSortBy] = useState<"name" | "delay">("delay");

  const activeNodes = useMemo(() => {
    if (!currentProvider) return [];
    return nodes.filter((n) => n.providerId === currentProvider.id && n.enabled);
  }, [nodes, currentProvider]);

  const sorted = useMemo(() => {
    const arr = [...activeNodes];
    if (sortBy === "name") {
      arr.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
    } else {
      arr.sort((a, b) => {
        const da = a.delayError ? Infinity : (a.delay ?? Infinity);
        const db = b.delayError ? Infinity : (b.delay ?? Infinity);
        if (da === Infinity && db === Infinity) return a.name.localeCompare(b.name, "zh-Hans-CN");
        return da - db;
      });
    }
    return arr;
  }, [activeNodes, sortBy]);

  const handleSelect = async (id: string) => {
    const node = activeNodes.find((n) => n.id === id);
    if (node) {
      try { await applyNodeSelection(node); } catch {
        toast.error("切换节点失败");
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Provider card */}
      {currentProvider && (
        <div className="mg-glass-card mx-4 mt-4 p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--mg-text-primary)]">
              {currentProvider.name}
            </h3>
            <p className="text-[11px] text-[var(--mg-text-secondary)] mt-0.5">
              节点数 {currentProvider.nodeCount}
              {currentProvider.expiresAt &&
                ` · 到期 ${new Date(currentProvider.expiresAt).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })}`}
            </p>
          </div>
        </div>
      )}

      {/* Sort toggle */}
      <div className="flex items-center justify-end gap-1 px-4 py-3">
        <button
          type="button"
          onClick={() => setSortBy("delay")}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
            sortBy === "delay"
              ? "bg-[var(--mg-primary)] text-white"
              : "text-[var(--mg-text-secondary)]"
          }`}
        >
          <ArrowDown01 className="w-3.5 h-3.5 inline mr-1" />
          延迟
        </button>
        <button
          type="button"
          onClick={() => setSortBy("name")}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
            sortBy === "name"
              ? "bg-[var(--mg-primary)] text-white"
              : "text-[var(--mg-text-secondary)]"
          }`}
        >
          <ArrowDownAZ className="w-3.5 h-3.5 inline mr-1" />
          名称
        </button>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto mg-scroll-none px-2">
        {sorted.map((node) => (
          <NodeRow
            key={node.id}
            node={node}
            isSelected={node.id === currentNode?.id}
            onSelect={handleSelect}
          />
        ))}
        {sorted.length === 0 && (
          <p className="text-center text-sm text-[var(--mg-text-secondary)] mt-12">
            暂无可用节点
          </p>
        )}
      </div>

      {/* Test latency FAB */}
      <div className="p-4">
        <button
          type="button"
          onClick={() => testLatency()}
          disabled={isTestingLatency}
          className="w-full py-3 rounded-2xl bg-[var(--mg-glass-bg)] backdrop-blur-xl border border-[var(--mg-glass-border)] text-sm font-semibold text-[var(--mg-text-primary)] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isTestingLatency ? "animate-spin" : ""}`} />
          {isTestingLatency ? "测试中..." : "测试全部延迟"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/mobile/pages/NodesPage.tsx
git commit -m "feat: add NodesPage component"
```

---

### Task 13: Create SettingsPage + ThemePage

**Files:**
- Create: `src/mobile/pages/SettingsPage.tsx`
- Create: `src/mobile/pages/ThemePage.tsx`

- [ ] **Step 1: Write SettingsPage**

`src/mobile/pages/SettingsPage.tsx`:

```typescript
import { ChevronRight } from "lucide-react";

interface SettingsPageProps {
  onNavigateToTheme: () => void;
}

export function SettingsPage({ onNavigateToTheme }: SettingsPageProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto mg-scroll-none px-4 pt-4 pb-4 gap-3">
      {/* Theme */}
      <button
        type="button"
        onClick={onNavigateToTheme}
        className="mg-glass-card p-4 flex items-center justify-between active:scale-[0.98] transition-transform"
      >
        <span className="text-sm font-semibold text-[var(--mg-text-primary)]">外观</span>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[var(--mg-text-secondary)]">浅色</span>
          <ChevronRight className="w-4 h-4 text-[var(--mg-text-secondary)]" />
        </div>
      </button>

      {/* About */}
      <div className="mg-glass-card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--mg-text-primary)]">版本</span>
          <span className="text-[13px] text-[var(--mg-text-secondary)]">1.0.0</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--mg-text-primary)]">隐私政策</span>
          <ChevronRight className="w-4 h-4 text-[var(--mg-text-secondary)]" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write ThemePage**

`src/mobile/pages/ThemePage.tsx`:

```typescript
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useAppStore } from "@/stores/appStore";

interface ThemePageProps {
  onBack: () => void;
}

const options = [
  { id: "light" as const, label: "浅色", icon: Sun },
  { id: "dark" as const, label: "深色", icon: Moon },
  { id: "system" as const, label: "跟随系统", icon: Monitor },
];

export function ThemePage({ onBack }: ThemePageProps) {
  const { theme, setTheme } = useAppStore();

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto mg-scroll-none px-4 pt-4 pb-4 gap-3">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            className={`mg-theme-option ${isSelected ? "mg-theme-option-selected" : ""}`}
          >
            <Icon className={`w-5 h-5 ${isSelected ? "text-[var(--mg-primary)]" : "text-[var(--mg-text-secondary)]"}`} />
            <span className={`text-sm font-semibold flex-1 text-left ${
              isSelected ? "text-[var(--mg-primary)]" : "text-[var(--mg-text-primary)]"
            }`}>
              {opt.label}
            </span>
            {isSelected && <Check className="w-4 h-4 text-[var(--mg-primary)]" strokeWidth={2.5} />}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/mobile/pages/SettingsPage.tsx src/mobile/pages/ThemePage.tsx
git commit -m "feat: add SettingsPage and ThemePage components"
```

---

### Task 14: Create MobileApp root component

**Files:**
- Create: `src/mobile/MobileApp.tsx`

- [ ] **Step 1: Write MobileApp**

`src/mobile/MobileApp.tsx`:

```typescript
import { useState, useCallback } from "react";
import { GlassTabBar } from "@/mobile/components/GlassTabBar";
import { StatusHeader } from "@/mobile/components/StatusHeader";
import { MeshGradientBackground } from "@/mobile/components/MeshGradientBackground";
import { HomePage } from "@/mobile/pages/HomePage";
import { NodesPage } from "@/mobile/pages/NodesPage";
import { SettingsPage } from "@/mobile/pages/SettingsPage";
import { ThemePage } from "@/mobile/pages/ThemePage";

type Page = "home" | "nodes" | "settings" | "theme";

export function MobileApp() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [themePageVisible, setThemePageVisible] = useState(false);

  const isSubPage = themePageVisible;

  const handleNavigate = useCallback((page: string) => {
    setThemePageVisible(false);
    setCurrentPage(page as Page);
  }, []);

  const handleOpenTheme = useCallback(() => {
    setThemePageVisible(true);
  }, []);

  const handleBackFromTheme = useCallback(() => {
    setThemePageVisible(false);
  }, []);

  const getHeaderTitle = () => {
    if (themePageVisible) return "外观";
    switch (currentPage) {
      case "home": return undefined;
      case "nodes": return "节点管理";
      case "settings": return "设置";
      default: return undefined;
    }
  };

  const renderPage = () => {
    if (themePageVisible) {
      return <ThemePage onBack={handleBackFromTheme} />;
    }
    switch (currentPage) {
      case "home": return <HomePage />;
      case "nodes": return <NodesPage />;
      case "settings": return <SettingsPage onNavigateToTheme={handleOpenTheme} />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="mobile-app relative flex flex-col h-dvh w-full overflow-hidden">
      <MeshGradientBackground />

      <StatusHeader
        title={getHeaderTitle()}
        showBack={isSubPage}
        onBack={handleBackFromTheme}
      />

      <div className="flex-1 min-h-0 flex flex-col" style={{ animation: "page-enter 0.25s ease-out" }}>
        {renderPage()}
      </div>

      {!isSubPage && (
        <GlassTabBar
          currentPage={currentPage}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/mobile/MobileApp.tsx
git commit -m "feat: add MobileApp root component with routing"
```

---

### Task 15: Modify App.tsx to use MobileApp

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace mobile branch in App.tsx**

In `src/App.tsx`, remove the import of `MobileLayout`, `MobileDashboard` and replace the mobile rendering:

Remove these imports:
```typescript
import { MobileLayout } from "@/components/layout/MobileLayout";
import { MobileDashboard } from "@/pages/MobileDashboard";
```

Add this import:
```typescript
import { MobileApp } from "@/mobile/MobileApp";
```

Replace the `renderPage` function's mobile dashboard case, and the mobile return block. The entire mobile branch (lines 123-148 approximately) should become:

```typescript
  if (isMobile) {
    return (
      <>
        <MobileApp />
        <Toaster richColors />
        <LoadingScreen visible={isInitializing} />
      </>
    );
  }
```

Note: The `renderPage` function inside App.tsx will no longer be called in the mobile path, but we keep it for desktop. Clean up the mobile cases from `renderPage` since they're now unreachable:

```typescript
  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onOpenProviders={openProviders} />;
      case "providers":
        return <Providers />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard onOpenProviders={openProviders} />;
    }
  };
```

And remove the `openProviders` callback since MobileApp handles its own navigation:

Remove:
```typescript
  const openProviders = () => setCurrentPage("providers");
```

Wait — this is still used by the desktop Dashboard. Keep it for the desktop path.

Let me verify: the `openProviders` is only used in the `renderPage` → `Dashboard` prop, and Desktop Dashboard needs it. So we keep it.

The actual edit is:
1. Remove imports: `MobileLayout`, `MobileDashboard`
2. Add import: `MobileApp`
3. Replace `if (isMobile)` block entirely with the simplified version above
4. Remove mobile-specific cases from `renderPage`

- [ ] **Step 2: Apply the actual edits**

Edit 1 — Remove old imports, add new one:

In `src/App.tsx`, line 12-14:
```typescript
// Remove:
import { useIsMobile } from "@/hooks/useIsMobile";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { MobileDashboard } from "@/pages/MobileDashboard";

// Replace with:
import { useIsMobile } from "@/hooks/useIsMobile";
import { MobileApp } from "@/mobile/MobileApp";
```

Edit 2 — Replace `renderPage` to remove mobile cases:

```typescript
  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onOpenProviders={openProviders} />;
      case "providers":
        return <Providers />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard onOpenProviders={openProviders} />;
    }
  };
```

Edit 3 — Replace the mobile return block:

```typescript
  if (isMobile) {
    return (
      <>
        <MobileApp />
        <Toaster richColors />
        <LoadingScreen visible={isInitializing} />
      </>
    );
  }
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire MobileApp into App.tsx mobile branch"
```

---

### Task 16: Import mobile.css and verify build

**Files:**
- Modify: `src/mobile/MobileApp.tsx` (add CSS import)

- [ ] **Step 1: Add CSS import**

At the top of `src/mobile/MobileApp.tsx`, add:

```typescript
import "@/mobile/styles/mobile.css";
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: No type errors.

- [ ] **Step 3: Run dev server to verify mobile view**

```bash
npm run dev
```

Open browser at narrow viewport (<768px) and verify:
- MobileApp renders
- Tab bar navigation works
- Connect button visible
- Theme toggle works

- [ ] **Step 4: Commit**

```bash
git add src/mobile/MobileApp.tsx
git commit -m "feat: import mobile CSS, finalize MobileApp integration"
```

---

## Verification

After all tasks are complete:

1. `npm run typecheck` — zero errors
2. `npm run dev` — desktop view (wider than 768px) renders original desktop UI unchanged
3. Resize browser to <768px — MobileApp renders with all three tabs
4. Theme toggle: light ↔ dark ↔ system works correctly
5. Mode capsules: visible when disconnected, hidden when connected
6. Connect button: outer ring appears when connected, rotates when connecting
7. Node bottom sheet: opens, sorts, selects nodes
8. Theme sub-page: back navigation works, selection persists

---

## Self-Review

**Spec coverage:** All sections covered — color system (Task 1), glass layers (Task 1), typography (Task 1), radius (Task 1), animations (spread across tasks), LiquidConnectButton (Task 7), ModeCapsuleBar (Task 9), NodeBottomSheet (Task 10), all pages (Tasks 11-13), GlassTabBar (Task 5), StatusHeader (Task 4), ProviderChip (Task 6), ConnectionInfo (Task 8), MeshGradientBackground (Task 3), store mods (Task 2), App.tsx wiring (Task 15).

**Placeholder scan:** No TBD, TODO, or vague instructions. All code is concrete.

**Type consistency:** `streamMode`/`aiRoute` defined in Task 2 store and referenced in Task 11 HomePage. `ModeCapsuleBar` props match call site. `NodeBottomSheet` props match call site. All component interfaces consistent.
