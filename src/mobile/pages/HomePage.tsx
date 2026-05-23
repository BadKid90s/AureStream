import { useState, useEffect, useCallback } from "react";
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

function formatSpeedParts(bytesPerSecond: number): { value: string; unit: string } {
  const kb = bytesPerSecond / 1024;
  if (kb < 1024) {
    return { value: kb.toFixed(1), unit: "KB/s" };
  }
  const mb = kb / 1024;
  return { value: mb.toFixed(1), unit: "MB/s" };
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
    uploadSpeed,
    downloadSpeed,
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
  }, [activeNodes, applyNodeSelection]);

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* Top — status bar safe area + prominent state & timer */}
      <div className="flex-none flex flex-col items-center pt-14 pb-4">
        {currentProvider && (
          <div className="pb-3">
            <ProviderChip name={currentProvider.name} />
          </div>
        )}

        <div className="flex flex-col items-center">
          {/* Main Status Header */}
          <span className={`text-[28px] font-extrabold tracking-tight transition-all duration-500 ${
            isDisconnecting
              ? "text-orange-500 animate-pulse"
              : isConnecting
                ? "text-blue-500 animate-pulse"
                : isConnected
                  ? "bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 bg-clip-text text-transparent"
                  : "text-[var(--mg-text-primary)]"
          }`}>
            {isDisconnecting ? "正在断开..." : isConnecting ? "正在安全连接..." : isConnected ? "已建立安全保护" : "未开启代理服务"}
          </span>

          {/* Subtitle / Connection Timer */}
          <div className="mt-2.5 h-8 flex items-center justify-center">
            {isConnected && !isDisconnecting ? (
              <span className="select-none font-extrabold tabular-nums tracking-tighter text-[22px] text-[var(--mg-text-primary)] flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                {formatDuration(elapsedSec)}
              </span>
            ) : (
              <span className="text-xs text-[var(--mg-text-secondary)] font-medium">
                请选择节点并点击连接开启服务
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center — connect button anchored in the visual sweet spot */}
      <div className="flex-1 flex items-center justify-center -mt-2">
        <LiquidConnectButton
          isConnected={isConnected}
          isConnecting={isConnecting}
          isDisconnecting={isDisconnecting}
          disabled={!canConnect}
          onToggle={handleConnectionToggle}
        />
      </div>

      {/* Bottom — mode bar + node selector, generous space above home indicator */}
      <div className="flex-none flex flex-col items-center pb-32 pt-2 gap-6">
        <div className="h-[96px] flex items-center justify-center">
          {!isConnected ? (
            <ModeCapsuleBar
              activeModes={modeActive}
              onToggle={handleModeToggle}
              visible={!isConnected}
              disabled={isConnected}
            />
          ) : (
            (() => {
              const dl = formatSpeedParts(downloadSpeed);
              const ul = formatSpeedParts(uploadSpeed);
              return (
                <div 
                  className="w-[200px] h-[38px] flex items-center justify-center rounded-full bg-[var(--mg-glass-bg)] border border-[var(--mg-glass-border)] shadow-[var(--mg-glass-shadow)] backdrop-blur-xl"
                  style={{ animation: "page-enter 0.3s ease-out" }}
                >
                  {/* Speed displays with fixed widths for columns, values, and units to prevent any pixel jittering */}
                  <div className="flex items-center justify-center gap-2.5 font-mono text-[11px] font-bold text-[var(--mg-text-secondary)] whitespace-nowrap">
                    <div className="flex items-center w-[78px] justify-start whitespace-nowrap">
                      <span className="text-emerald-500 text-xs select-none mr-1">↓</span>
                      <span className="w-[36px] text-right tabular-nums mr-0.5">{dl.value}</span>
                      <span className="w-[28px] text-left text-[10px] opacity-85">{dl.unit}</span>
                    </div>
                    <div className="h-3 w-px bg-slate-200 dark:bg-zinc-800/80 shrink-0" />
                    <div className="flex items-center w-[78px] justify-start whitespace-nowrap">
                      <span className="text-[var(--mg-primary)] text-xs select-none mr-1">↑</span>
                      <span className="w-[36px] text-right tabular-nums mr-0.5">{ul.value}</span>
                      <span className="w-[28px] text-left text-[10px] opacity-85">{ul.unit}</span>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {currentNode && (
          <button
            type="button"
            className="w-full max-w-[340px]"
            onClick={() => setSheetOpen(true)}
          >
            <ConnectionInfo
              nodeName={currentNode.name}
              delay={currentNode.delay}
            />
          </button>
        )}
      </div>

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
