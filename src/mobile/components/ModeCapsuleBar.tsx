import { Compass, Film, Bot, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface Mode {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  activeColor: string;
}

const modes: Mode[] = [
  { id: "smart", label: "智能", icon: Compass, activeColor: "var(--mg-primary)" },
  { id: "stream", label: "流媒体", icon: Film, activeColor: "var(--mg-stream)" },
  { id: "ai", label: "AI", icon: Bot, activeColor: "var(--mg-ai)" },
  { id: "adblock", label: "去广告", icon: Shield, activeColor: "var(--mg-adblock)" },
];

interface ModeCapsuleBarProps {
  activeModes: Record<string, boolean>;
  onToggle: (id: string) => void;
  visible: boolean;
  disabled: boolean;
}

export function ModeCapsuleBar({ activeModes, onToggle, visible, disabled }: ModeCapsuleBarProps) {
  return (
    <div
      className={cn(
        "flex justify-center gap-2 px-4 transition-all duration-300 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
      )}
      style={{ height: visible ? "auto" : 0, overflow: "hidden" }}
    >
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isOn = activeModes[mode.id] ?? false;

        return (
          <button
            key={mode.id}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(mode.id)}
            className={cn(
              "mg-capsule",
              isOn && "mg-capsule-on",
            )}
            style={isOn ? {
              backgroundColor: `${mode.activeColor}14`,
              borderColor: `${mode.activeColor}40`,
            } : undefined}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300",
                isOn
                  ? "text-white shadow-sm"
                  : "bg-black/5 dark:bg-white/5 text-[var(--mg-text-secondary)]",
              )}
              style={isOn ? {
                background: `linear-gradient(to top right, ${mode.activeColor}, ${mode.activeColor}CC)`,
                boxShadow: `0 2px 8px ${mode.activeColor}40`,
              } : undefined}
            >
              <Icon className="w-4 h-4" strokeWidth={2} />
            </div>
            <span className={cn(
              "text-[11px] font-semibold transition-colors duration-300",
              isOn ? "text-[var(--mg-text-primary)]" : "text-[var(--mg-text-secondary)]",
            )}>
              {mode.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
