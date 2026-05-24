import { ChevronRight, Palette, Activity, Info, Trash2 } from "lucide-react";
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
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-violet-500/10 dark:bg-violet-500/20 text-violet-500">
            <Palette className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold text-[var(--mg-text-primary)]">外观</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[var(--mg-text-secondary)]">{themeLabel}</span>
          <ChevronRight className="w-4 h-4 text-[var(--mg-text-secondary)]" />
        </div>
      </button>

      {/* 延迟测速配置 */}
      <button
        type="button"
        onClick={onNavigateToLatencyConfig}
        className="mg-glass-card px-4 py-3.5 flex items-center justify-between active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-blue-500/10 dark:bg-blue-500/20 text-blue-500">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold text-[var(--mg-text-primary)]">延迟测速配置</span>
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--mg-text-secondary)]" />
      </button>

      {/* 关于 */}
      <button
        type="button"
        onClick={onNavigateToAbout}
        className="mg-glass-card px-4 py-3.5 flex items-center justify-between active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500">
            <Info className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold text-[var(--mg-text-primary)]">关于</span>
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--mg-text-secondary)]" />
      </button>

      {/* 重置 */}
      <button
        type="button"
        onClick={handleReset}
        className="mg-glass-card px-4 py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform mt-4"
      >
        <Trash2 className="w-4 h-4 text-rose-500 dark:text-rose-400" />
        <span className="text-sm font-semibold text-rose-500 dark:text-rose-400">重置所有配置</span>
      </button>
    </div>
  );
}
