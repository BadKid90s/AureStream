# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AureProxy is a cross-platform desktop proxy client built on the mihomo kernel. It uses Tauri 2.0 (Rust backend) + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui (Radix). The UI uses a glassmorphism design language with light/dark theme support.

## Commands

```bash
# Install dependencies (uses npm, not pnpm)
npm install

# Frontend dev server only (Vite, http://localhost:5173)
npm run dev

# Desktop dev (Tauri shell + Vite)
npm run dev:desktop

# Production build (typecheck + Vite build)
npm run build

# Vite build only (skip typecheck, for quick iteration)
npm run build:web

# TypeScript typecheck (frontend src only)
npm run typecheck

# TypeScript typecheck for vite.config.ts
npm run typecheck:node

# Tauri CLI passthrough
npm run tauri

# Build desktop installer (Rust + frontend)
npm run tauri:build
```

There are no tests configured in this project currently.

## Architecture

### Frontend (`src/`)

- **`@/` alias** maps to `./src/` (configured in vite.config.ts and tsconfig.json)
- **Routing**: Manual state-based routing in `App.tsx` via `currentPage` state (dashboard / providers / settings) — no React Router
- **State management**: Two Zustand stores in `src/stores/appStore.ts`, both using `persist` middleware:
  - `useAppStore` — theme (light/dark)
  - `useProxyStore` — providers, nodes, connection state, speeds, latency
- **Seed data**: `src/data/seed.ts` provides demo providers/nodes. `src/hooks/useSeedProxyStore.ts` auto-injects them into an empty store in dev mode only
- **Layout**: `Sidebar` (narrow rail) + `MainContent` (page container). Dashboard uses `overflow-hidden` single-viewport layout; other pages scroll
- **Styling**: Tailwind CSS v4 with `@theme` custom properties in `src/index.css`. Custom glass utilities: `glass`, `glass-strong`, `glass-light`, `glass-rail`, `glass-hover`. Colors defined as CSS custom properties with separate `.dark` overrides

### Backend (`src-tauri/`)

- **Tauri 2.0** with Rust. Entry point: `src-tauri/src/lib.rs`
- **State management**: Two `Mutex`-based state structs managed by Tauri:
  - `ProxyState` (`commands/proxy.rs`) — proxy config and running status
  - `ProviderState` (`commands/provider.rs`) — providers and nodes lists
- **Commands**: All Tauri commands are in `src-tauri/src/commands/` (mod.rs, proxy.rs, provider.rs). Frontend calls them via `invoke()` from `@tauri-apps/api/core` through the wrapper in `src/lib/api.ts`
- **Dependencies**: reqwest (HTTP), tokio (async), serde/serde_json (serialization)

### Frontend-Backend Bridge

`src/lib/api.ts` wraps all Tauri `invoke` calls. TypeScript interfaces in `src/types/index.ts` define the frontend data model. The Rust structs in `src-tauri/src/commands/mod.rs` define the backend model — these are independent but parallel definitions (not auto-synced).

## Key Conventions

- Components use `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge) for conditional classes
- shadcn/ui components are in `src/components/ui/` — these are Radix-based, not from a registry
- All UI text is in Chinese (zh-CN)
- The proxy connection flow currently uses mock data (random IPs, simulated delays) — no real mihomo kernel integration yet
- Dashboard uses a golden ratio (61.8% / 38.2%) two-column layout
