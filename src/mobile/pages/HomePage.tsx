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

      {/* Connection info — tap to open node selector */}
      {currentNode && (
        <button
          type="button"
          className="w-full max-w-xs"
          onClick={() => setSheetOpen(true)}
        >
          <ConnectionInfo
            nodeName={currentNode.name}
            delay={currentNode.delay}
          />
        </button>
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
