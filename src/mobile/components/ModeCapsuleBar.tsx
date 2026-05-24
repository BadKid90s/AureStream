import { Compass, Film, Bot, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface Mode {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const modes: Mode[] = [
  { id: "smart", label: "智能", icon: Compass },
  { id: "stream", label: "流媒体", icon: Film },
  { id: "ai", label: "AI", icon: Bot },
  { id: "adblock", label: "去广告", icon: Shield },
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
        "flex justify-center gap-2 px-4 transition-all duration-350 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
      )}
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
              isOn ? "shadow-sm" : "mg-capsule-inactive",
            )}
            style={isOn ? {
              backgroundColor: `rgba(var(--mg-${mode.id}-rgb), 0.12)`,
              borderColor: `rgba(var(--mg-${mode.id}-rgb), 0.35)`,
              boxShadow: `0 6px 18px -4px rgba(var(--mg-${mode.id}-rgb), 0.22)`,
            } : undefined}
          >
            <div
              className={cn(
                "w-9 h-9 rounded-[14px] flex items-center justify-center transition-all duration-300",
                isOn
                  ? "text-white"
                  : "bg-black/[0.04] dark:bg-white/[0.04] text-[var(--mg-text-secondary)]",
              )}
              style={isOn ? {
                background: `var(--mg-${mode.id}-gradient)`,
                boxShadow: `0 4px 10px rgba(var(--mg-${mode.id}-rgb), 0.35)`,
              } : undefined}
            >
              <Icon
                className={cn(
                  "w-4 h-4 transition-transform duration-300",
                  isOn ? "scale-110" : "scale-100"
                )}
              />
            </div>
            <span className={cn(
              "text-[11px] font-semibold tracking-wide transition-colors duration-300 select-none",
              isOn ? "text-[var(--mg-text-primary)] font-bold" : "text-[var(--mg-text-secondary)]",
            )}>
              {mode.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

