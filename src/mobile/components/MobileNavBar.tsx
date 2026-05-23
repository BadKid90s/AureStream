import type { ReactNode } from "react";

interface MobileNavBarProps {
  title: string;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
}

export function MobileNavBar({ title, leftAction, rightAction }: MobileNavBarProps) {
  return (
    <div className="flex-none flex items-center justify-between px-5 pt-12 pb-3 relative">
      {/* Left */}
      <div className="w-9 h-9 flex items-center justify-center">
        {leftAction ?? null}
      </div>

      {/* Center title */}
      <span className="absolute left-1/2 -translate-x-1/2 text-[17px] font-bold text-[var(--mg-text-primary)] tracking-tight pointer-events-none select-none">
        {title}
      </span>

      {/* Right */}
      <div className="w-9 h-9 flex items-center justify-center">
        {rightAction ?? null}
      </div>
    </div>
  );
}
