# Mihomo Sidecar 与连接流程

## 行为概要

点击「连接」时，前端会：

1. 调用 `patch_mihomo_subscription`：读取当前订阅 YAML，写入 `external-controller: 127.0.0.1:9090` 并清空本地 `secret`（与 `tauri-plugin-mihomo` 默认控制器一致），保存到应用配置目录下的 `runtime/aureproxy-mihomo.yaml`。
2. 调用 `start_mihomo_kernel`：通过 Tauri Shell 启动 `bundle.externalBin` 中的 `mihomo` sidecar（参数 `-f` 为上述补丁文件，`-d` 为本地数据目录下的 `mihomo-work`），并轮询 `http://127.0.0.1:9090/version` 直至就绪。

断开连接时先尝试 `closeAllConnections`（插件 API），再调用 `stop_mihomo_kernel` 结束由本应用拉起的进程。

## 开发前准备

在 `src-tauri` 侧已声明 `externalBin: ["binaries/mihomo"]`。开发/打包前需将对应平台的可执行文件放到 `src-tauri/binaries/`，命名需符合 Tauri 规范（可用仓库内 `scripts/download-mihomo.sh` 下载）。

若 sidecar 缺失或 9090 端口被占用，连接会失败并在 Rust 侧返回明确错误信息。
