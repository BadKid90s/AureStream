import { ChevronRight } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { mobileToast } from "@/mobile/lib/mobileToast";

interface SettingsPageProps {
  onNavigateToTheme: () => void;
  onNavigateToLatencyConfig: () => void;
  onNavigateToAbout: () => void;
}

export function SettingsPage({
  onNavigateToTheme,
  onNavigateToLatencyConfig,
  onNavigateToAbout,
}: SettingsPageProps) {
  const theme = useAppStore((s) => s.theme);
  const resetAllSettings = useAppStore((s) => s.resetAllSettings);

  const themeLabel = theme === "light" ? "浅色" : theme === "dark" ? "深色" : "跟随系统";

  const handleReset = async () => {
    if (!window.confirm("确定要重置所有配置吗？这将清除所有服务商、节点和设置数据。")) return;
    try {
      await resetAllSettings();
      mobileToast("已重置所有配置");
    } catch {
      mobileToast("重置失败", "error");
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto mg-scroll-none px-4 pt-3 pb-4 gap-3">
      {/* 外观设置 */}
      <button
        type="button"
        onClick={onNavigateToTheme}
        className="mg-glass-card p-4 flex items-center justify-between active:scale-[0.98] transition-transform"
      >
        <span className="text-sm font-semibold text-[var(--mg-text-primary)]">外观</span>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[var(--mg-text-secondary)]">{themeLabel}</span>
          <ChevronRight className="w-4 h-4 text-[var(--mg-text-secondary)]" />
        </div>
      </button>

      {/* 功能设置 */}
      <div className="mg-glass-card rounded-[24px] flex flex-col overflow-hidden">
        <div className="px-4 pt-3.5 pb-2">
          <span className="text-[11px] font-bold text-[var(--mg-text-secondary)] uppercase tracking-wider">功能设置</span>
        </div>
        <button
          type="button"
          onClick={onNavigateToLatencyConfig}
          className="flex items-center justify-between px-4 py-3.5 active:bg-black/5 dark:active:bg-white/5 transition-colors"
        >
          <span className="text-sm font-semibold text-[var(--mg-text-primary)]">延迟测速配置</span>
          <ChevronRight className="w-4 h-4 text-[var(--mg-text-secondary)]" />
        </button>
      </div>

      {/* 关于 */}
      <div className="mg-glass-card rounded-[24px] flex flex-col overflow-hidden">
        <button
          type="button"
          onClick={onNavigateToAbout}
          className="flex items-center justify-between px-4 py-3.5 active:bg-black/5 dark:active:bg-white/5 transition-colors"
        >
          <span className="text-sm font-semibold text-[var(--mg-text-primary)]">关于</span>
          <ChevronRight className="w-4 h-4 text-[var(--mg-text-secondary)]" />
        </button>
      </div>

      {/* 重置 */}
      <button
        type="button"
        onClick={handleReset}
        className="mg-glass-card p-4 flex items-center justify-center active:scale-[0.98] transition-transform mt-4"
      >
        <span className="text-sm font-semibold text-rose-500 dark:text-rose-400">重置所有配置</span>
      </button>
    </div>
  );
}
