import { useState, useCallback, useRef, useEffect } from "react";
import { RefreshCw, Trash2, Loader2, ChevronRight, Activity, Info } from "lucide-react";
import { useProxyStore } from "@/stores/appStore";
import { toast } from "sonner";
import type { Provider, Node } from "@/types";
import { NodeRow } from "@/mobile/components/NodeRow";


function formatDate(dateStr?: string): string {
  if (!dateStr) return "永久有效";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "永久有效";
    return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }) + " 到期";
  } catch {
    return "永久有效";
  }
}

/* ============================================================
   ProviderSwipeCard – bidirectional swipe
   Left swipe  → Delete (right side, 80px)
   Right swipe → Update + Test Speed (left side, 140px)
   ============================================================ */

interface SwipeCardProps {
  provider: Provider;
  isActive: boolean;
  isRefreshing: boolean;
  forceClose: boolean;
  onRefresh: () => void;
  onDelete: () => void;
  onTestLatency: () => void;
  onSwipeOpen: () => void;
  onSwipeClose: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  providerNodes: Node[];
  currentNodeId?: string;
  onSelectNode: (nodeId: string) => void;
  isTesting: boolean;
  // Global swipe sync (unified for provider cards + node rows)
  globalActiveSwipeId: string | null;
  onGlobalSwipeOpen: (id: string) => void;
  onGlobalSwipeClose: (id: string) => void;
  onNodeTestLatency: () => void;
  onShowDetails: () => void;
}

function ProviderSwipeCard({
  provider,
  isActive,
  isRefreshing,
  forceClose,
  onRefresh,
  onDelete,
  onTestLatency,
  onSwipeOpen,
  onSwipeClose,
  isExpanded,
  onToggleExpand,
  providerNodes,
  currentNodeId,
  onSelectNode,
  isTesting,
  globalActiveSwipeId,
  onGlobalSwipeOpen,
  onGlobalSwipeClose,
  onNodeTestLatency,
  onShowDetails,
}: SwipeCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  // "left" = left-swiped (delete visible), "right" = right-swiped (update/test visible)
  const revealedDir = useRef<"left" | "right" | null>(null);

  useEffect(() => {
    if (forceClose && offsetX !== 0) {
      setOffsetX(0);
      revealedDir.current = null;
    }
  }, [forceClose, offsetX]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
    onSwipeOpen();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = e.touches[0].clientX;
    let diffX = clientX - startX.current;

    // If already revealed, offset the base position
    if (revealedDir.current === "left") {
      diffX -= 80;
    } else if (revealedDir.current === "right") {
      diffX += 140;
    }

    // Clamp: left swipe max -100, right swipe max +160
    setOffsetX(Math.max(-100, Math.min(160, diffX)));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (offsetX < -40) {
      // Lock left-swiped (delete)
      setOffsetX(-80);
      revealedDir.current = "left";
      onSwipeOpen();
    } else if (offsetX > 70) {
      // Lock right-swiped (update + test)
      setOffsetX(140);
      revealedDir.current = "right";
      onSwipeOpen();
    } else {
      // Snap back
      setOffsetX(0);
      revealedDir.current = null;
      onSwipeClose();
    }
  };

  const handleClick = () => {
    if (revealedDir.current) {
      setOffsetX(0);
      revealedDir.current = null;
      onSwipeClose();
    } else {
      onToggleExpand();
    }
  };

  const total = provider.trafficTotalGB || 0;
  const used = provider.trafficUsedGB || 0;

  return (
    <div className={`mg-glass-card rounded-[16px] overflow-hidden select-none transition-all duration-300 ${
      isActive
        ? "border-[var(--mg-primary)]/20 bg-[rgba(59,130,246,0.03)]"
        : ""
    }`}>
      {/* Swipeable Row Container */}
      <div className="relative overflow-hidden h-[68px]">
        {/* Left background: Update + Test Speed (revealed on right-swipe) */}
        <div
          className="absolute top-0 left-0 h-full w-[140px] flex z-0"
          style={{ display: offsetX <= 0 ? "none" : "flex" }}
        >
          <button
            type="button"
            disabled={isRefreshing}
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
              // Auto-close swipe after clicking update
              setOffsetX(0);
              revealedDir.current = null;
              onSwipeClose();
            }}
            className="h-full w-[70px] bg-blue-500 text-white flex items-center justify-center active:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isRefreshing ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
            ) : (
              <RefreshCw className="w-4.5 h-4.5" />
            )}
          </button>
          <button
            type="button"
            disabled={isTesting}
            onClick={(e) => {
              e.stopPropagation();
              onTestLatency();
              // Auto-close swipe after clicking test speed
              setOffsetX(0);
              revealedDir.current = null;
              onSwipeClose();
            }}
            className="h-full w-[70px] bg-teal-500 text-white flex items-center justify-center active:bg-teal-600 transition-colors disabled:opacity-50"
          >
            {isTesting ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
            ) : (
              <Activity className="w-4.5 h-4.5" />
            )}
          </button>
        </div>

        {/* Right background: Delete (revealed on left-swipe) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-0 right-0 h-full w-[80px] bg-rose-500 text-white flex items-center justify-center active:bg-rose-600 transition-colors z-0"
          style={{ display: offsetX >= 0 ? "none" : "flex" }}
        >
          <Trash2 className="w-4.5 h-4.5" />
        </button>

        {/* Foreground Main Card Content */}
        <div
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`px-4 h-full flex items-center justify-between relative overflow-hidden z-10 cursor-pointer bg-[var(--mg-glass-bg)] rounded-[16px] ${
            isActive ? "border-[var(--mg-primary)]/40 bg-[rgba(59,130,246,0.06)]" : ""
          }`}
          style={{
            transform: `translateX(${offsetX}px)`,
            transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)",
          }}
        >
          {/* Left Section: Expand Chevron & Info */}
          <div className="flex items-center gap-2 min-w-0 pr-4 flex-1 h-full">
            <div className="p-1.5 flex items-center justify-center shrink-0">
              <ChevronRight className={`mg-chevron-icon w-4 h-4 text-[var(--mg-text-secondary)] ${isExpanded ? "expanded" : ""}`} />
            </div>

            <div className="flex flex-col min-w-0 flex-1 justify-center h-full">
              <span className="font-bold text-[var(--mg-text-primary)] text-[14px] truncate">
                {provider.name}
              </span>
              <span className="text-[10px] text-[var(--mg-text-secondary)] mt-0.5 font-mono truncate">
                {provider.nodeCount}个节点 · {used.toFixed(1)}G/{total.toFixed(0)}G · {formatDate(provider.expiresAt)}
              </span>
            </div>
          </div>

          {/* Right Section: Refresh & Details Info icons */}
          <div className="flex items-center gap-1 shrink-0 z-20">
            <button
              type="button"
              disabled={isRefreshing}
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              className="p-1.5 flex items-center justify-center text-[var(--mg-text-secondary)] hover:text-[var(--mg-text-primary)] active:scale-90 transition-all disabled:opacity-50"
              aria-label="刷新订阅"
            >
              {isRefreshing ? (
                <Loader2 className="w-[18px] h-[18px] animate-spin" />
              ) : (
                <RefreshCw className="w-[18px] h-[18px]" />
              )}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShowDetails();
              }}
              className="p-1.5 flex items-center justify-center text-[var(--mg-text-secondary)] hover:text-[var(--mg-text-primary)] active:scale-90 transition-all"
              aria-label="查看详情"
            >
              <Info className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Nodes List */}
      {isExpanded && (
        <div className="border-t border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] max-h-[260px] overflow-y-auto mg-scroll-none">
          {providerNodes.map((node) => (
            <SwipeableNodeRow
              key={node.id}
              node={node}
              isSelected={node.id === currentNodeId}
              onSelect={onSelectNode}
              onTestLatency={onNodeTestLatency}
              isTesting={isTesting}
              forceClose={globalActiveSwipeId !== null && globalActiveSwipeId !== `node-${node.id}`}
              onSwipeOpen={() => onGlobalSwipeOpen(`node-${node.id}`)}
              onSwipeClose={() => onGlobalSwipeClose(`node-${node.id}`)}
            />
          ))}
          {providerNodes.length === 0 && (
            <div className="py-4 text-center text-xs text-[var(--mg-text-secondary)]">
              暂无可用节点
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SwipeableNodeRow – right-swipe only
   Right swipe → Update + Test Speed (left side, 140px)
   ============================================================ */

interface SwipeableNodeRowProps {
  node: Node;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onTestLatency: () => void;
  isTesting: boolean;
  forceClose: boolean;
  onSwipeOpen: () => void;
  onSwipeClose: () => void;
}

function SwipeableNodeRow({
  node,
  isSelected,
  onSelect,
  onTestLatency,
  isTesting,
  forceClose,
  onSwipeOpen,
  onSwipeClose,
}: SwipeableNodeRowProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const isRevealed = useRef(false);

  useEffect(() => {
    if (forceClose && offsetX !== 0) {
      setOffsetX(0);
      isRevealed.current = false;
    }
  }, [forceClose, offsetX]);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
    onSwipeOpen();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.stopPropagation();
    const clientX = e.touches[0].clientX;
    let diffX = clientX - startX.current;

    if (isRevealed.current) {
      diffX += 70;
    }

    // Only allow right-swipe (positive offset), max 70px for single button
    setOffsetX(Math.max(0, Math.min(90, diffX)));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (offsetX > 35) {
      setOffsetX(70);
      isRevealed.current = true;
      onSwipeOpen();
    } else {
      setOffsetX(0);
      isRevealed.current = false;
      onSwipeClose();
    }
  };

  const handleClick = () => {
    if (isRevealed.current) {
      setOffsetX(0);
      isRevealed.current = false;
      onSwipeClose();
    } else {
      onSelect(node.id);
    }
  };

  return (
    <div className="relative overflow-hidden select-none">
      {/* Left background: Test Speed only */}
      <div
        className="absolute top-0 left-0 h-full w-[70px] flex z-0"
        style={{ display: offsetX <= 0 ? "none" : "flex" }}
      >
        <button
          type="button"
          disabled={isTesting}
          onClick={(e) => {
            e.stopPropagation();
            onTestLatency();
            // Auto-close swipe after clicking test speed
            setOffsetX(0);
            isRevealed.current = false;
            onSwipeClose();
          }}
          className="h-full w-[70px] bg-teal-500 text-white flex flex-col items-center justify-center gap-1 active:bg-teal-600 transition-colors disabled:opacity-50"
        >
          {isTesting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Activity className="w-3.5 h-3.5" />
          )}
          <span className="text-[9px] font-bold">测速</span>
        </button>
      </div>

      {/* Foreground NodeRow */}
      <div
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative z-10 bg-[var(--mg-glass-bg)]"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)",
        }}
      >
        <NodeRow
          node={node}
          isSelected={isSelected}
          onSelect={() => {/* handled by parent onClick */}}
        />
      </div>
    </div>
  );
}

/* ============================================================
   ProvidersPage – main page component
   ============================================================ */

interface ProvidersPageProps {
  onShowDetails: (provider: Provider) => void;
}

export function ProvidersPage({ onShowDetails }: ProvidersPageProps) {
  const {
    providers,
    deleteProvider,
    currentProvider,
    setCurrentSubscription,
    fetchAndSaveSubscription,
    refreshingIds,
    nodes,
    currentNode,
    applyNodeSelection,
    testLatency,
    isTestingLatency,
  } = useProxyStore();

  const [globalActiveSwipeId, setGlobalActiveSwipeId] = useState<string | null>(null);
  const [expandedProviderId, setExpandedProviderId] = useState<string | null>(null);

  const handleRefresh = useCallback(async (id: string, name: string) => {
    try {
      const result = await fetchAndSaveSubscription(id);
      if (result.success) {
        toast.success(`「${name}」订阅已成功更新`);
      } else {
        toast.error(`「${name}」订阅更新失败`, {
          description: result.error || "网络请求错误，请稍后再试",
        });
      }
    } catch (e) {
      toast.error("订阅更新发生异常");
    }
  }, [fetchAndSaveSubscription]);

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!window.confirm(`确定删除服务商「${name}」吗？相关的本地配置文件也将被移除。`)) {
      return;
    }
    try {
      await deleteProvider(id);
      toast.success(`「${name}」订阅已成功删除`);
      setGlobalActiveSwipeId(null);
    } catch (e) {
      toast.error("删除订阅失败");
    }
  }, [deleteProvider]);

  const handleSelectNode = useCallback(async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      try {
        const provider = providers.find((p) => p.id === node.providerId);
        if (provider && currentProvider?.id !== provider.id) {
          await setCurrentSubscription(provider);
        }
        await applyNodeSelection(node);
        toast.success(`已选择节点: ${node.name}`);
      } catch (e) {
        toast.error("选择节点失败");
      }
    }
  }, [nodes, providers, currentProvider, setCurrentSubscription, applyNodeSelection]);

  const getSortedNodes = useCallback((providerId: string) => {
    const arr = nodes.filter((n) => n.providerId === providerId && n.enabled);
    arr.sort((a, b) => {
      const da = a.delayError ? Infinity : (a.delay ?? Infinity);
      const db = b.delayError ? Infinity : (b.delay ?? Infinity);
      if (da === Infinity && db === Infinity) return a.name.localeCompare(b.name, "zh-Hans-CN");
      return da - db;
    });
    return arr;
  }, [nodes]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* List Container */}
      <div className="flex-1 overflow-y-auto mg-scroll-none px-4 pt-3 pb-24 space-y-3">
        {providers.map((provider) => (
          <ProviderSwipeCard
            key={provider.id}
            provider={provider}
            isActive={currentProvider?.id === provider.id}
            isRefreshing={refreshingIds.has(provider.id)}
            forceClose={globalActiveSwipeId !== null && globalActiveSwipeId !== `provider-${provider.id}`}
            onRefresh={() => handleRefresh(provider.id, provider.name)}
            onDelete={() => handleDelete(provider.id, provider.name)}
            onTestLatency={() => testLatency()}
            onSwipeOpen={() => setGlobalActiveSwipeId(`provider-${provider.id}`)}
            onSwipeClose={() => {
              if (globalActiveSwipeId === `provider-${provider.id}`) {
                setGlobalActiveSwipeId(null);
              }
            }}
            isExpanded={expandedProviderId === provider.id}
            onToggleExpand={() => {
              setExpandedProviderId((prev) => (prev === provider.id ? null : provider.id));
            }}
            providerNodes={getSortedNodes(provider.id)}
            currentNodeId={currentNode?.id}
            onSelectNode={handleSelectNode}
            isTesting={isTestingLatency}
            globalActiveSwipeId={globalActiveSwipeId}
            onGlobalSwipeOpen={(id) => setGlobalActiveSwipeId(id)}
            onGlobalSwipeClose={(id) => {
              if (globalActiveSwipeId === id) {
                setGlobalActiveSwipeId(null);
              }
            }}
            onNodeTestLatency={() => testLatency()}
            onShowDetails={() => onShowDetails(provider)}
          />
        ))}

        {providers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3.5">
            <span className="text-3xl select-none">📦</span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[var(--mg-text-primary)]">暂无服务商订阅</span>
              <span className="text-[11px] text-[var(--mg-text-secondary)] mt-1">请点击右上角按钮添加订阅开始使用</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
