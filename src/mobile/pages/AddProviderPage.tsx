import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useProxyStore } from "@/stores/appStore";
import { toast } from "sonner";
import type { Provider } from "@/types";

interface AddProviderPageProps {
  onBack: () => void;
}

const AUTO_UPDATE_OPTIONS = [
  { label: "不自动更新", value: "" },
  { label: "每 30 分钟", value: "30" },
  { label: "每 1 小时", value: "60" },
  { label: "每 2 小时", value: "120" },
  { label: "每 6 小时", value: "360" },
  { label: "每 12 小时", value: "720" },
  { label: "每 24 小时", value: "1440" },
];

export function AddProviderPage({ onBack }: AddProviderPageProps) {
  const { addProvider, deleteProvider, fetchAndSaveSubscription } = useProxyStore();

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [autoUpdateInterval, setAutoUpdateInterval] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; url?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { name?: string; url?: string } = {};

    if (!name.trim()) {
      newErrors.name = "请输入服务商名称";
    }

    if (!url.trim()) {
      newErrors.url = "请输入订阅链接";
    } else {
      try {
        new URL(url);
      } catch {
        newErrors.url = "请输入有效的订阅 URL 链接";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isLoading) return;

    setIsLoading(true);
    const id = crypto.randomUUID();
    const cleanName = name.trim();
    const cleanUrl = url.trim();
    const interval = autoUpdateInterval ? Number(autoUpdateInterval) : undefined;

    const newProvider: Provider = {
      id,
      name: cleanName,
      url: cleanUrl,
      autoUpdateInterval: interval,
      nodeCount: 0,
      lastUpdated: new Date().toISOString(),
    };

    try {
      // 1. 先保存服务商到本地数据库，避免 endpoints 外键错误
      await addProvider(newProvider);
      
      // 2. 尝试从远程订阅服务器拉取最新的节点配置
      const result = await fetchAndSaveSubscription(id);
      
      if (result.success) {
        toast.success(`订阅「${cleanName}」添加成功`);
        onBack();
      } else {
        // 3. 订阅文件下载或解析失败，自动回滚删除本地记录以防污染
        await deleteProvider(id);
        toast.error(`订阅「${cleanName}」添加失败`, {
          description: result.error || "订阅链接下载失败或无法正常解析",
        });
      }
    } catch (err) {
      // 4. 出现不可预测异常时也做回滚处理
      try { await deleteProvider(id); } catch {}
      toast.error("添加订阅发生未知错误");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Form scroll view */}
      <div className="flex-1 overflow-y-auto mg-scroll-none px-4 pt-3 pb-20">
        <form onSubmit={handleSubmit} className="mg-glass-card p-5 flex flex-col gap-5">
          {/* Name Field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="provider-name" className="text-xs font-bold text-[var(--mg-text-primary)] pl-0.5">
              服务商名称 <span className="text-rose-500">*</span>
            </label>
            <input
              id="provider-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：极速专线订阅"
              disabled={isLoading}
              className="w-full h-11 px-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-sm text-[var(--mg-text-primary)] outline-none focus:border-[var(--mg-primary)] focus:bg-transparent transition-all"
            />
            {errors.name && (
              <span className="text-[10px] font-semibold text-rose-500 pl-0.5 mt-0.5 block">
                {errors.name}
              </span>
            )}
          </div>

          {/* URL Field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="provider-url" className="text-xs font-bold text-[var(--mg-text-primary)] pl-0.5">
              订阅 URL 链接 <span className="text-rose-500">*</span>
            </label>
            <input
              id="provider-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/clash.yaml"
              disabled={isLoading}
              className="w-full h-11 px-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-sm text-[var(--mg-text-primary)] outline-none focus:border-[var(--mg-primary)] focus:bg-transparent transition-all"
            />
            {errors.url && (
              <span className="text-[10px] font-semibold text-rose-500 pl-0.5 mt-0.5 block">
                {errors.url}
              </span>
            )}
          </div>

          {/* Auto Update Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="provider-interval" className="text-xs font-bold text-[var(--mg-text-primary)] pl-0.5">
              定时自动更新
            </label>
            <div className="relative">
              <select
                id="provider-interval"
                value={autoUpdateInterval}
                onChange={(e) => setAutoUpdateInterval(e.target.value)}
                disabled={isLoading}
                className="w-full h-11 pl-4 pr-10 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-sm text-[var(--mg-text-primary)] outline-none focus:border-[var(--mg-primary)] focus:bg-transparent transition-all appearance-none cursor-pointer"
              >
                {AUTO_UPDATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--mg-text-secondary)]">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 4L6 8L10 4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 mt-2 rounded-2xl bg-gradient-to-r from-[var(--mg-primary)] to-[var(--mg-primary-deep)] text-white text-sm font-bold shadow-lg shadow-[var(--mg-primary)]/20 active:scale-98 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
            {isLoading ? "下载订阅配置中..." : "保存并下载配置"}
          </button>
        </form>
      </div>
    </div>
  );
}
