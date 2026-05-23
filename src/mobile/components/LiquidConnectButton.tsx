import { Power, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiquidConnectButtonProps {
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export function LiquidConnectButton({
  isConnected,
  isConnecting,
  isDisconnecting,
  disabled,
  onToggle,
}: LiquidConnectButtonProps) {
  const busy = isConnecting || isDisconnecting;
  const active = isConnected && !isDisconnecting;

  const statusText = isDisconnecting
    ? "断开中"
    : isConnecting
      ? "连接中"
      : isConnected
        ? "已连接"
        : "未连接";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled && !isConnected}
      className={cn(
        "relative flex-shrink-0 flex flex-col items-center justify-center rounded-full",
        "w-[180px] h-[180px]",
        "cursor-pointer select-none outline-none focus:outline-none",
        "transition-all duration-700 ease-in-out",
        "backdrop-blur-2xl border",
        active
          ? "border-cyan-500/30 bg-transparent"
          : "border-slate-200/40 dark:border-white/[0.08] bg-transparent",
        busy && "border-primary/20",
      )}
    >
      {/* Outer ring — connected */}
      {active && (
        <svg
          className="absolute inset-0 w-full h-full mg-ring-glow pointer-events-none"
          viewBox="0 0 200 200"
          style={{ margin: -8 }}
        >
          <defs>
            <linearGradient id="ring-connected" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--mg-ring-connected-start)" />
              <stop offset="50%" stopColor="var(--mg-ring-connected-mid)" />
              <stop offset="100%" stopColor="var(--mg-ring-connected-end)" />
            </linearGradient>
          </defs>
          <circle
            cx="100" cy="100" r="94"
            fill="none"
            stroke="url(#ring-connected)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="20 4"
          />
        </svg>
      )}

      {/* Outer ring — connecting/disconnecting */}
      {busy && (
        <svg
          className="absolute inset-0 w-full h-full mg-ring-spin pointer-events-none"
          viewBox="0 0 200 200"
          style={{ margin: -8 }}
        >
          <defs>
            <linearGradient id="ring-connecting" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--mg-ring-connecting-start)" />
              <stop offset="100%" stopColor="var(--mg-ring-connecting-end)" />
            </linearGradient>
          </defs>
          <circle
            cx="100" cy="100" r="94"
            fill="none"
            stroke="url(#ring-connecting)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="60 40"
          />
        </svg>
      )}

      {/* Glass sphere body */}
      <div
        className={cn(
          "flex h-[70%] w-[70%] flex-col items-center justify-center gap-2 rounded-full transition-all duration-700 ease-in-out",
          active
            ? "bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 shadow-[inset_0_2px_4px_rgba(255,255,255,0.45),0_10px_25px_rgba(59,130,246,0.45)] text-white"
            : busy
              ? "bg-gradient-to-tr from-indigo-600/70 via-blue-500/70 to-cyan-400/70 text-white/90"
              : "bg-gradient-to-b from-white to-slate-50/95 dark:from-zinc-800/85 dark:to-zinc-900/95 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_2px_3px_rgba(255,255,255,1)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)] border border-slate-200/50 dark:border-zinc-700/35",
        )}
      >
        {busy ? (
          <Loader2 className="h-10 w-10 animate-spin text-white/80" strokeWidth={2} />
        ) : (
          <Power
            className={cn(
              "h-10 w-10 transition-all duration-700",
              active
                ? "scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.7)] text-white"
                : "text-slate-400 dark:text-zinc-500 group-hover:text-[var(--mg-primary)] group-hover:scale-110",
            )}
            strokeWidth={2}
          />
        )}
        <span
          className={cn(
            "text-[13px] font-bold tracking-widest transition-colors duration-700",
            active
              ? "text-white/95"
              : "text-slate-500 dark:text-zinc-400 group-hover:text-[var(--mg-primary)]",
          )}
        >
          {statusText}
        </span>
      </div>
    </button>
  );
}
