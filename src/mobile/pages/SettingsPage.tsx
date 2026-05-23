import { ChevronRight } from "lucide-react";

interface SettingsPageProps {
  onNavigateToTheme: () => void;
}

export function SettingsPage({ onNavigateToTheme }: SettingsPageProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto mg-scroll-none px-4 pt-3 pb-4 gap-3">
      <button
        type="button"
        onClick={onNavigateToTheme}
        className="mg-glass-card p-4 flex items-center justify-between active:scale-[0.98] transition-transform"
      >
        <span className="text-sm font-semibold text-[var(--mg-text-primary)]">外观</span>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[var(--mg-text-secondary)]">浅色</span>
          <ChevronRight className="w-4 h-4 text-[var(--mg-text-secondary)]" />
        </div>
      </button>

      <div className="mg-glass-card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--mg-text-primary)]">版本</span>
          <span className="text-[13px] text-[var(--mg-text-secondary)]">1.0.0</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--mg-text-primary)]">隐私政策</span>
          <ChevronRight className="w-4 h-4 text-[var(--mg-text-secondary)]" />
        </div>
      </div>
    </div>
  );
}
