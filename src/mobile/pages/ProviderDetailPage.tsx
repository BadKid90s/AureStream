import { useCallback, useState } from "react";
import { Copy, RefreshCw, Trash2, Calendar, HardDrive, ShieldAlert, Check, Loader2 } from "lucide-react";
import { useProxyStore } from "@/stores/appStore";
import { toast } from "sonner";
import type { Provider } from "@/types";

interface ProviderDetailPageProps {
  provider: Provider;
  onBack: () => void;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "永久有效";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "永久有效";
    return d.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "永久有效";
  }
}

export function ProviderDetailPage({ provider, onBack }: ProviderDetailPageProps) {
  const { deleteProvider, fetchAndSaveSubscription, refreshingIds } = useProxyStore();
  const [copied, setCopied] = useState(false);

  const isRefreshing = refreshingIds.has(provider.id);

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(provider.url).then(() => {
      setCopied(true);
      toast.success("订阅链接已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error("复制失败");
    });
  }, [provider.url]);

  const handleRefresh = useCallback(async () => {
    try {
      const result = await fetchAndSaveSubscription(provider.id);
      if (result.success) {
        toast.success(`「${provider.name}」订阅已成功更新`);
      } else {
        toast.error(`「${provider.name}」订阅更新失败`, {
          description: result.error || "网络请求错误，请稍后再试",
        });
      }
    } catch (e) {
      toast.error("订阅更新发生异常");
    }
  }, [provider.id, provider.name, fetchAndSaveSubscription]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm(`确定删除服务商「${provider.name}」吗？相关的本地配置文件也将被移除。`)) {
      return;
    }
    try {
      await deleteProvider(provider.id);
      toast.success(`「${provider.name}」订阅已成功删除`);
      onBack();
    } catch (e) {
      toast.error("删除订阅失败");
    }
  }, [provider.id, provider.name, deleteProvider, onBack]);

  const total = provider.trafficTotalGB || 0;
  const used = provider.trafficUsedGB || 0;
  const remaining = Math.max(0, total - used);
  const percent = total > 0 ? Math.min(100, (used / total) * 100) : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto mg-scroll-none px-4 pt-3 pb-8 gap-4">
      {/* Overview Card */}
      <div className="mg-glass-card p-5 rounded-[24px] flex flex-col gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-[var(--mg-text-secondary)] uppercase tracking-wider">订阅名称</span>
          <span className="text-xl font-extrabold text-[var(--mg-text-primary)] mt-1 truncate">
            {provider.name}
          </span>
        </div>

        {total > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex justify-between text-xs font-bold text-[var(--mg-text-secondary)]">
              <span>已用流量: {used.toFixed(1)} GB</span>
              <span>剩余流量: {remaining.toFixed(1)} GB / {total.toFixed(0)} GB</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden relative">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Details List Card */}
      <div className="mg-glass-card p-5 rounded-[24px] flex flex-col gap-4.5">
        {/* URL Link Row */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-[var(--mg-text-secondary)]">订阅链接</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex-1 text-xs text-[var(--mg-text-primary)] font-mono break-all line-clamp-2 bg-black/5 dark:bg-white/5 p-2.5 rounded-xl border border-black/5 dark:border-white/5">
              {provider.url}
            </span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 active:scale-95 transition-transform"
              aria-label="复制链接"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-[var(--mg-text-secondary)]" />}
            </button>
          </div>
        </div>

        {/* Expiration Date Row */}
        <div className="flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-3">
          <div className="flex items-center gap-2 text-xs text-[var(--mg-text-secondary)] font-bold">
            <Calendar className="w-4 h-4" />
            <span>到期时间</span>
          </div>
          <span className="text-xs text-[var(--mg-text-primary)] font-semibold">
            {formatDate(provider.expiresAt)}
          </span>
        </div>

        {/* Node Count Row */}
        <div className="flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-3">
          <div className="flex items-center gap-2 text-xs text-[var(--mg-text-secondary)] font-bold">
            <HardDrive className="w-4 h-4" />
            <span>节点数量</span>
          </div>
          <span className="text-xs text-[var(--mg-text-primary)] font-semibold">
            {provider.nodeCount} 个节点
          </span>
        </div>

        {/* Last Updated Row */}
        <div className="flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-3">
          <div className="flex items-center gap-2 text-xs text-[var(--mg-text-secondary)] font-bold">
            <ShieldAlert className="w-4 h-4" />
            <span>最后更新时间</span>
          </div>
          <span className="text-xs text-[var(--mg-text-primary)] font-semibold">
            {formatDate(provider.lastUpdated)}
          </span>
        </div>
      </div>

      {/* Actions Section */}
      <div className="flex flex-col gap-3 mt-2">
        <button
          type="button"
          disabled={isRefreshing}
          onClick={handleRefresh}
          className="w-full h-12 rounded-2xl bg-blue-500 active:bg-blue-600 text-white font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm"
        >
          {isRefreshing ? (
            <Loader2 className="w-4.5 h-4.5 animate-spin" />
          ) : (
            <RefreshCw className="w-4.5 h-4.5" />
          )}
          <span>立即更新订阅</span>
        </button>

        <button
          type="button"
          onClick={handleDelete}
          className="w-full h-12 rounded-2xl bg-rose-500 active:bg-rose-600 text-white font-bold flex items-center justify-center gap-2 transition-colors text-sm"
        >
          <Trash2 className="w-4.5 h-4.5" />
          <span>删除订阅</span>
        </button>
      </div>
    </div>
  );
}
