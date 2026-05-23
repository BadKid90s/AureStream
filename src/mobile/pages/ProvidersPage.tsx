import { useState, useCallback, useRef, useEffect } from "react";
import { Plus, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { useProxyStore } from "@/stores/appStore";
import { toast } from "sonner";
import type { Provider } from "@/types";

interface ProvidersPageProps {
  onAddProvider: () => void;
}

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

interface SwipeCardProps {
  provider: Provider;
  isActive: boolean;
  isRefreshing: boolean;
  forceClose: boolean;
  onSetActive: () => void;
  onRefresh: () => void;
  onDelete: () => void;
  onSwipeOpen: () => void;
  onSwipeClose: () => void;
}

function ProviderSwipeCard({
  provider,
  isActive,
  isRefreshing,
  forceClose,
  onSetActive,
  onRefresh,
  onDelete,
  onSwipeOpen,
  onSwipeClose,
}: SwipeCardProps) {
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
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = e.touches[0].clientX;
    let diffX = clientX - startX.current;

    if (isRevealed.current) {
      diffX -= 140;
    }

    if (diffX < 0) {
      setOffsetX(Math.max(-160, diffX));
    } else {
      setOffsetX(Math.min(0, diffX));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (offsetX < -70) {
      setOffsetX(-140);
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
      onSetActive();
    }
  };

  const total = provider.trafficTotalGB || 0;
  const used = provider.trafficUsedGB || 0;

  return (
    <div className="relative overflow-hidden rounded-[16px] select-none">
      {/* Background Revealed Actions */}
      <div className="absolute top-0 right-0 h-full w-[140px] flex z-0 rounded-[16px] overflow-hidden">
        <button
          type="button"
          disabled={isRefreshing}
          onClick={(e) => {
            e.stopPropagation();
            onRefresh();
          }}
          className="h-full w-[70px] bg-blue-500 text-white flex flex-col items-center justify-center gap-1 active:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {isRefreshing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span className="text-[10px] font-bold">更新</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="h-full w-[70px] bg-rose-500 text-white flex flex-col items-center justify-center gap-1 active:bg-rose-600 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-[10px] font-bold">删除</span>
        </button>
      </div>

      {/* Foreground Main Card Content */}
      <div
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`mg-glass-card px-4 py-2.5 flex items-center justify-between relative overflow-hidden z-10 cursor-pointer rounded-[16px] ${
          isActive
            ? "border-[var(--mg-primary)]/20 bg-[rgba(59,130,246,0.03)]"
            : ""
        }`}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)",
        }}
      >
        {/* Left Section: Info */}
        <div className="flex flex-col min-w-0 pr-4">
          <span className="text-[14px] font-bold text-[var(--mg-text-primary)] truncate">
            {provider.name}
          </span>
          <span className="text-[10px] text-[var(--mg-text-secondary)] mt-0.5 font-mono truncate">
            {provider.nodeCount}个节点 · {used.toFixed(1)}G/{total.toFixed(0)}G · {formatDate(provider.expiresAt)}
          </span>
        </div>

        {/* Right Section: Status Indicator */}
        <div className="flex items-center justify-end w-5 h-5 shrink-0">
          {isRefreshing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--mg-primary)]" />
          ) : isActive ? (
            <div className="w-2 h-2 rounded-full bg-[#FF8000] shadow-[0_0_6px_rgba(255,128,0,0.6)]" />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ProvidersPage({ onAddProvider }: ProvidersPageProps) {
  const {
    providers,
    deleteProvider,
    currentProvider,
    setCurrentSubscription,
    fetchAndSaveSubscription,
    refreshingIds,
  } = useProxyStore();

  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);

  const handleSetActive = useCallback(async (provider: Provider) => {
    if (currentProvider?.id === provider.id) return;
    try {
      await setCurrentSubscription(provider);
      toast.success(`已切换为订阅: ${provider.name}`);
    } catch (e) {
      toast.error("切换订阅失败");
    }
  }, [currentProvider, setCurrentSubscription]);

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
      setActiveSwipeId(null);
    } catch (e) {
      toast.error("删除订阅失败");
    }
  }, [deleteProvider]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4 flex-none">
        <h2 className="text-xl font-bold text-[var(--mg-text-primary)]">服务商管理</h2>
        <button
          type="button"
          onClick={onAddProvider}
          className="w-9 h-9 rounded-full bg-[var(--mg-glass-bg)] border border-[var(--mg-glass-border)] flex items-center justify-center text-[var(--mg-text-primary)] active:scale-90 transition-transform shadow-[var(--mg-glass-shadow)]"
          aria-label="添加服务商"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto mg-scroll-none px-4 pb-24 space-y-3">
        {providers.map((provider) => (
          <ProviderSwipeCard
            key={provider.id}
            provider={provider}
            isActive={currentProvider?.id === provider.id}
            isRefreshing={refreshingIds.has(provider.id)}
            forceClose={activeSwipeId !== null && activeSwipeId !== provider.id}
            onSetActive={() => handleSetActive(provider)}
            onRefresh={() => handleRefresh(provider.id, provider.name)}
            onDelete={() => handleDelete(provider.id, provider.name)}
            onSwipeOpen={() => setActiveSwipeId(provider.id)}
            onSwipeClose={() => {
              if (activeSwipeId === provider.id) {
                setActiveSwipeId(null);
              }
            }}
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
