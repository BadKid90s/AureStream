import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useAppStore } from "@/stores/appStore";

const options = [
  { id: "light" as const, label: "浅色", icon: Sun },
  { id: "dark" as const, label: "深色", icon: Moon },
  { id: "system" as const, label: "跟随系统", icon: Monitor },
];

export function ThemePage() {
  const { theme, setTheme } = useAppStore();

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto mg-scroll-none px-4 pt-3 pb-4 gap-3">

      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            className={`mg-theme-option ${isSelected ? "mg-theme-option-selected" : ""}`}
          >
            <Icon className={`w-5 h-5 ${isSelected ? "text-[var(--mg-primary)]" : "text-[var(--mg-text-secondary)]"}`} />
            <span className={`text-sm font-semibold flex-1 text-left ${
              isSelected ? "text-[var(--mg-primary)]" : "text-[var(--mg-primary)]"
            }`}>
              {opt.label}
            </span>
            {isSelected && <Check className="w-4 h-4 text-[var(--mg-primary)]" strokeWidth={2.5} />}
          </button>
        );
      })}
    </div>
  );
}
