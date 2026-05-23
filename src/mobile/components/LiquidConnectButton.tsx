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
        "group relative flex-shrink-0 flex flex-col items-center justify-center rounded-full",
        "w-[268px] h-[268px]",
        "cursor-pointer select-none outline-none focus:outline-none",
        "transition-all duration-700 ease-in-out",
        !disabled && !busy && "active:scale-95",
      )}
    >
      {/* Ambient Glow */}
      <div
        className={cn(
          "absolute inset-10 rounded-full filter blur-3xl transition-all duration-1000 -z-10",
          active
            ? "bg-gradient-to-tr from-blue-500 via-indigo-500 to-violet-500 opacity-60 scale-125"
            : busy
              ? "bg-gradient-to-tr from-blue-500 via-indigo-500 to-violet-500 opacity-40 animate-pulse scale-110"
              : "bg-indigo-400/15 dark:bg-indigo-600/10 scale-95 opacity-30 group-hover:opacity-40"
        )}
      />

      {/* Delicate Outer Ring */}
      {!busy && (
        <div
          className={cn(
            "absolute inset-0 rounded-full border transition-all duration-700 pointer-events-none",
            active
              ? "border-indigo-400/30 scale-102"
              : "border-slate-200/60 dark:border-zinc-800/40 group-hover:border-blue-400/30 group-hover:scale-102"
          )}
        />
      )}

      {/* Outer ring — connecting/disconnecting only */}
      {busy && (
        <svg
          className="absolute inset-0 w-full h-full mg-ring-spin pointer-events-none"
          viewBox="0 0 200 200"
          style={{ margin: -10 }}
        >
          <defs>
            <linearGradient id="ring-connecting" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--mg-ring-connecting-start)" />
              <stop offset="100%" stopColor="var(--mg-ring-connecting-end)" />
            </linearGradient>
          </defs>
          <circle
            cx="100" cy="100" r="90"
            fill="none"
            stroke="url(#ring-connecting)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="70 50"
          />
        </svg>
      )}

      {/* Glass sphere body - fixed size to prevent position shift */}
      <div
        className={cn(
          "flex h-[72%] w-[72%] flex-col items-center justify-center gap-2 rounded-full transition-all duration-700 ease-in-out",
          active
            ? "bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 shadow-[inset_0_4px_8px_rgba(255,255,255,0.45),0_16px_40px_rgba(99,102,241,0.45)] text-white"
            : busy
              ? "bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 opacity-80 text-white/95"
              : "mg-connect-btn-body border text-slate-500 dark:text-zinc-400",
        )}
      >
        {busy ? (
          <Loader2 className="h-14 w-14 animate-spin text-white/80" strokeWidth={2} />
        ) : (
          <Power
            className={cn(
              "h-14 w-14 transition-all duration-700",
              active
                ? "scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.8)] text-white"
                : "text-slate-400 dark:text-zinc-500 group-hover:text-indigo-500 group-hover:drop-shadow-[0_0_8px_rgba(99,102,241,0.35)] group-hover:scale-108",
            )}
            strokeWidth={2}
          />
        )}
        <span
          className={cn(
            "text-[16px] font-bold tracking-widest transition-colors duration-700",
            active
              ? "text-white/95"
              : "text-slate-500 dark:text-zinc-400 group-hover:text-indigo-500 group-hover:drop-shadow-[0_0_8px_rgba(99,102,241,0.25)]",
          )}
        >
          {statusText}
        </span>
      </div>
    </button>
  );
}
