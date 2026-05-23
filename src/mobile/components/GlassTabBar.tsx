import { Home, Radio, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

interface GlassTabBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const tabs: Tab[] = [
  { id: "home", label: "首页", icon: Home },
  { id: "nodes", label: "节点", icon: Radio },
  { id: "settings", label: "设置", icon: Settings },
];

export function GlassTabBar({ currentPage, onNavigate }: GlassTabBarProps) {
  const activeIndex = tabs.findIndex((t) => t.id === currentPage);

  return (
    <div className="mg-tab-bar">
      <nav className="mg-tab-bar-inner relative">
        <div
          className="mg-tab-indicator"
          style={{
            width: `calc((100% - 12px) / 3)`,
            left: `calc(6px + ${activeIndex === -1 ? 0 : activeIndex} * (100% - 12px) / 3)`,
          }}
        />

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentPage === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className={cn(
                "relative flex-1 h-full rounded-full flex flex-col items-center justify-center gap-0.5 transition-colors duration-300 z-10",
                isActive
                  ? "text-[var(--mg-primary)]"
                  : "text-[var(--mg-text-secondary)]"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-transform duration-300",
                  isActive && "scale-110"
                )}
                strokeWidth={2}
              />
              <span className="text-[10px] font-semibold tracking-wider">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
