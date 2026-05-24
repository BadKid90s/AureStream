import { HardDrive, Globe, ExternalLink } from "lucide-react";

const APP_VERSION = "0.1.2";

export function AboutPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto mg-scroll-none px-4 pt-3 pb-8 gap-4">
      {/* App Icon & Name */}
      <div className="mg-glass-card p-6 rounded-[24px] flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
          <HardDrive className="w-8 h-8 text-white" />
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-base font-extrabold text-[var(--mg-text-primary)]">AureStream</span>
          <span className="text-[11px] text-[var(--mg-text-secondary)] font-semibold">v{APP_VERSION}</span>
        </div>
      </div>

      {/* Info List */}
      <div className="mg-glass-card p-1 px-4 rounded-[24px] flex flex-col">
        <div className="flex items-center justify-between py-3.5 border-b border-[var(--mg-divider)]">
          <span className="text-xs font-bold text-[var(--mg-text-primary)]">内核版本</span>
          <span className="text-xs text-[var(--mg-text-secondary)] font-semibold">Mihomo</span>
        </div>
        <div className="flex items-center justify-between py-3.5 border-b border-[var(--mg-divider)]">
          <span className="text-xs font-bold text-[var(--mg-text-primary)]">技术栈</span>
          <span className="text-xs text-[var(--mg-text-secondary)] font-semibold">Tauri 2.0 + React 19</span>
        </div>
        <div className="flex items-center justify-between py-3.5 border-b border-[var(--mg-divider)]">
          <span className="text-xs font-bold text-[var(--mg-text-primary)]">开源协议</span>
          <span className="text-xs text-[var(--mg-text-secondary)] font-semibold">MIT</span>
        </div>
        <div className="flex items-center justify-between py-3.5">
          <span className="text-xs font-bold text-[var(--mg-text-primary)]">开发者</span>
          <span className="text-xs text-[var(--mg-text-secondary)] font-semibold">BadKid90s</span>
        </div>
      </div>

      {/* Links */}
      <div className="mg-glass-card p-4 rounded-[24px] flex flex-col gap-3">
        <button
          type="button"
          onClick={() => window.open("https://github.com/BadKid90s/AureStream", "_blank")}
          className="flex items-center gap-3 py-1 active:opacity-70 transition-opacity"
        >
          <ExternalLink className="w-4 h-4 text-[var(--mg-text-primary)]" />
          <span className="text-xs font-semibold text-[var(--mg-text-primary)]">GitHub 仓库</span>
        </button>
        <div className="h-[1px] bg-[var(--mg-divider)]" />
        <button
          type="button"
          onClick={() => window.open("https://github.com/BadKid90s/AureStream/issues", "_blank")}
          className="flex items-center gap-3 py-1 active:opacity-70 transition-opacity"
        >
          <Globe className="w-4 h-4 text-[var(--mg-text-primary)]" />
          <span className="text-xs font-semibold text-[var(--mg-text-primary)]">反馈与建议</span>
        </button>
      </div>
    </div>
  );
}
