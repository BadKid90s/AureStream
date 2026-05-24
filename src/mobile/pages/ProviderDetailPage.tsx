import { useCallback, useState } from "react";
import { Copy, RefreshCw, Trash2, Calendar, HardDrive, ShieldAlert, Check, Loader2, Link } from "lucide-react";
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

function getDomain(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    return url.hostname;
  } catch {
    return "订阅链接";
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
      {/* Top Header Section */}
      <div className="flex items-center gap-3.5 px-1 py-1 shrink-0">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 flex items-center justify-center border border-blue-500/10 shadow-sm shrink-0">
          <HardDrive className="w-5.5 h-5.5 text-[var(--mg-primary)]" />
        </div>
        <div className="flex flex-col min-w-0">
          <h2 className="text-base font-extrabold text-[var(--mg-text-primary)] truncate">{provider.name}</h2>
          <p className="text-[10px] text-[var(--mg-text-secondary)] font-medium mt-0.5">配置订阅信息</p>
        </div>
      </div>

      {/* Overview Card (Traffic Widget Style) */}
      {total > 0 && (
        <div className="mg-glass-card p-5 rounded-[24px] flex flex-col gap-3.5">
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[var(--mg-text-secondary)] uppercase tracking-wider">剩余流量</span>
              <span className="text-2xl font-extrabold text-[var(--mg-text-primary)] mt-1">
                {remaining.toFixed(1)} <span className="text-xs font-semibold text-[var(--mg-text-secondary)] font-normal">GB</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-[var(--mg-text-secondary)] uppercase tracking-wider">使用进度</span>
              <span className="block text-sm font-extrabold text-[var(--mg-primary)] mt-1">
                {percent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Premium Progress Bar */}
          <div className="w-full h-3 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden relative border border-black/5 dark:border-white/5 p-[2px]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
              style={{ width: `${percent}%`, background: "var(--mg-smart-gradient)" }}
            />
          </div>

          <div className="flex justify-between text-[10px] font-bold text-[var(--mg-text-secondary)] mt-0.5 px-0.5">
            <span>已用: {used.toFixed(1)} GB</span>
            <span>总量: {total.toFixed(0)} GB</span>
          </div>
        </div>
      )}

      {/* Details List Group */}
      <div className="mg-glass-card p-1 px-4 rounded-[24px] flex flex-col">
        {/* Row 1: Copy Link */}
        <div
          onClick={handleCopyUrl}
          className="flex items-center justify-between py-3.5 cursor-pointer active:bg-black/5 dark:active:bg-white/5 transition-colors duration-150 border-b border-[var(--mg-divider)]"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-blue-500/10 dark:bg-blue-500/20 text-blue-500">
              <Link className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-[var(--mg-text-primary)]">订阅链接</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs text-[var(--mg-text-secondary)] font-mono truncate max-w-[150px]">
              {getDomain(provider.url)}
            </span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[var(--mg-text-secondary)] shrink-0" />
            )}
          </div>
        </div>

        {/* Row 2: Expiration */}
        <div className="flex items-center justify-between py-3.5 border-b border-[var(--mg-divider)]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-[var(--mg-text-primary)]">到期时间</span>
          </div>
          <span className="text-xs text-[var(--mg-text-secondary)] font-semibold">
            {formatDate(provider.expiresAt)}
          </span>
        </div>

        {/* Row 3: Node Count */}
        <div className="flex items-center justify-between py-3.5 border-b border-[var(--mg-divider)]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500">
              <HardDrive className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-[var(--mg-text-primary)]">节点数量</span>
          </div>
          <span className="text-xs text-[var(--mg-text-secondary)] font-semibold">
            {provider.nodeCount} 个节点
          </span>
        </div>

        {/* Row 4: Last Updated */}
        <div className="flex items-center justify-between py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-amber-500/10 dark:bg-amber-500/20 text-amber-500">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-[var(--mg-text-primary)]">最后更新</span>
          </div>
          <span className="text-xs text-[var(--mg-text-secondary)] font-semibold">
            {formatDate(provider.lastUpdated)}
          </span>
        </div>
      </div>

      {/* Actions Row */}
      <div className="mg-glass-card rounded-[24px] flex items-center min-h-[48px] overflow-hidden">
        {/* Update Action Row */}
        <button
          type="button"
          disabled={isRefreshing}
          onClick={handleRefresh}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 cursor-pointer active:bg-black/5 dark:active:bg-white/5 transition-colors duration-150 disabled:opacity-50 text-blue-500 dark:text-blue-400"
        >
          {isRefreshing ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          ) : (
            <RefreshCw className="w-4 h-4 shrink-0" />
          )}
          <span className="text-xs font-bold">
            {isRefreshing ? "正在更新..." : "更新订阅"}
          </span>
        </button>

        {/* Vertical Divider */}
        <div className="w-[1px] h-6 bg-[var(--mg-divider)] shrink-0" />

        {/* Delete Action Row */}
        <button
          type="button"
          onClick={handleDelete}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 cursor-pointer active:bg-black/5 dark:active:bg-white/5 transition-colors duration-150 text-rose-500 dark:text-rose-400"
        >
          <Trash2 className="w-4 h-4 shrink-0" />
          <span className="text-xs font-bold">删除订阅</span>
        </button>
      </div>
    </div>
  );
}

