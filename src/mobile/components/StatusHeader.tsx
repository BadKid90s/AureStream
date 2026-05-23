import { Zap } from "lucide-react";

interface StatusHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function StatusHeader({ title, showBack, onBack }: StatusHeaderProps) {
  return (
    <header className="mg-status-header shrink-0">
      <div className="flex items-center gap-2">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--mg-text-secondary)] active:scale-95 transition-transform"
            aria-label="返回"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3L5 8L10 13" />
            </svg>
          </button>
        ) : (
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--mg-primary)] to-[var(--mg-primary-deep)] flex items-center justify-center shadow-md">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-[var(--mg-primary)] to-[var(--mg-primary-deep)] bg-clip-text text-transparent">
          AureStream
        </span>
      </div>

      {title && (
        <span className="text-[13px] font-semibold text-[var(--mg-text-secondary)]">
          {title}
        </span>
      )}

      <div className="w-8" />
    </header>
  );
}
