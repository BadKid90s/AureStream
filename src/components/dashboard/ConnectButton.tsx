import { Power, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProxyStore } from '@/stores/appStore'

export function ConnectButton() {
  const { isConnected, isConnecting, connect, disconnect } = useProxyStore()

  const handleClick = () => {
    if (isConnected) {
      disconnect()
    } else {
      connect()
    }
  }

  return (
    <div className="relative flex flex-col items-center gap-6">
      {/* Outer glow ring */}
      <div className={cn(
        "absolute inset-0 w-40 h-40 rounded-full transition-all duration-700",
        isConnected
          ? "bg-primary/20 blur-2xl animate-pulse"
          : "bg-primary/5 blur-xl"
      )}
        style={isConnected ? { animationDuration: '2s' } : undefined}
      />

      {/* Button */}
      <button
        onClick={handleClick}
        disabled={isConnecting}
        className={cn(
          "relative w-36 h-36 rounded-full flex items-center justify-center transition-all duration-500",
          "glass-strong hover:scale-105 active:scale-95",
          "group cursor-pointer",
          isConnected && "border-primary/30"
        )}
        style={{
          boxShadow: isConnected
            ? "0 0 60px rgba(45, 212, 191, 0.4), 0 0 120px rgba(45, 212, 191, 0.15), inset 0 1px 0 rgba(255,255,255,0.3)"
            : "0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.3)"
        }}
      >
        {/* Connecting ring animation */}
        {isConnecting && (
          <svg className="absolute inset-0 w-full h-full animate-spin" viewBox="0 0 144 144">
            <circle
              cx="72" cy="72" r="68"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="320 100"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
        )}

        {/* Inner circle */}
        <div className={cn(
          "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500",
          isConnected
            ? "bg-gradient-to-br from-primary to-teal-600"
            : "bg-gradient-to-br from-gray-300 to-gray-200 dark:from-gray-700 dark:to-gray-600"
        )}>
          <Power
            className={cn(
              "w-10 h-10 relative z-10 transition-all duration-300",
              isConnected
                ? "text-white drop-shadow-lg"
                : "text-gray-500 dark:text-gray-400"
            )}
            strokeWidth={2}
          />
        </div>

        {/* Pulse rings when connected */}
        {isConnected && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDuration: '1.5s' }} />
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
          </>
        )}
      </button>

      {/* Status text */}
      <div className="text-center">
        <div className={cn(
          "text-lg font-semibold transition-colors duration-300",
          isConnected ? "text-primary" : "text-muted-foreground"
        )}>
          {isConnecting ? '连接中...' : isConnected ? '已连接' : '点击连接'}
        </div>
        {isConnected && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <Zap className="w-3 h-3 text-primary" />
            <span>安全代理已开启</span>
          </div>
        )}
      </div>
    </div>
  )
}
