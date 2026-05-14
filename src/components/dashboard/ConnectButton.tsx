import { Power, Zap } from 'lucide-react'
import { useId } from 'react'
import { cn } from '@/lib/utils'
import { useProxyStore } from '@/stores/appStore'

const SIZE_MAP = {
  default: {
    glow: 'w-[10rem] h-[10rem]',
    outer: 'w-[8.5rem] h-[8.5rem]',
    inner: 'w-[5.5rem] h-[5.5rem]',
    icon: 'w-10 h-10',
    caption: 'text-base',
  },
  lg: {
    glow: 'w-[14rem] h-[14rem]',
    outer: 'w-[12rem] h-[12rem]',
    inner: 'w-[7.5rem] h-[7.5rem]',
    icon: 'w-12 h-12',
    caption: 'text-lg',
  },
} as const

interface ConnectButtonProps {
  disabled?: boolean
  size?: keyof typeof SIZE_MAP
  className?: string
  proxyMode?: '规则' | '全局' | '直连'
}

export function ConnectButton({
  disabled: disabledOuter = false,
  size = 'default',
  className,
  proxyMode,
}: ConnectButtonProps) {
  const { isConnected, isConnecting, connect, disconnect } = useProxyStore()
  const spinGradId = useId().replace(/:/g, 'i')
  const dims = SIZE_MAP[size]

  const handleClick = () => {
    if (isConnected) {
      if (isConnecting) return
      disconnect()
      return
    }
    if (disabledOuter || isConnecting) return
    void connect()
  }

  return (
    <div className={cn('relative flex flex-col items-center gap-12', className)}>
      {/* 呼吸光晕 — 同一元素，仅切换动画类名 */}
      <div
        className={cn(
          'absolute rounded-full transition-all duration-1000 ease-in-out',
          dims.glow,
          'bg-primary/25 dark:bg-primary/20 blur-2xl',
          isConnected
            ? 'animate-breathing-active'
            : 'animate-breathing-idle'
        )}
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* 主按钮 — 始终是同一个 <button>，仅颜色/阴影随状态过渡 */}
      <button
        type="button"
        onClick={handleClick}
        disabled={!isConnected && (disabledOuter || isConnecting)}
        aria-disabled={!isConnected && (disabledOuter || isConnecting)}
        title={disabledOuter && !isConnected ? '请先选择有可节点的供应商' : undefined}
        className={cn(
          'relative z-10 flex items-center justify-center rounded-full transition-all duration-700 ease-in-out',
          'enabled:cursor-pointer disabled:cursor-not-allowed',
          dims.outer,
          'glass-strong group',
          isConnected
            ? 'border-primary/30 shadow-[0_0_48px_rgba(59,130,246,0.35),0_0_96px_rgba(59,130,246,0.12)]'
            : 'border-border/60 shadow-[0_4px_24px_rgba(0,0,0,0.06)]',
          !isConnected && !isConnecting && 'opacity-90 hover:opacity-100',
          isConnecting && 'border-primary/20',
        )}
      >
        {/* 连接中 — 旋转渐变环 */}
        {isConnecting && (
          <svg className="absolute inset-0 size-full animate-spin" viewBox="0 0 124 124">
            <circle
              cx="62" cy="62" r="58"
              fill="none"
              stroke={`url(#spin-grad-${spinGradId})`}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="260 120"
            />
            <defs>
              <linearGradient id={`spin-grad-${spinGradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--color-primary)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
        )}

        {/* 内部圆形 — 同一元素，仅渐变随状态过渡 */}
        <div
          className={cn(
            'relative flex items-center justify-center rounded-full transition-all duration-700 ease-in-out',
            dims.inner,
            isConnected
              ? 'bg-gradient-to-br from-primary to-blue-500 shadow-lg'
              : isConnecting
                ? 'bg-gradient-to-br from-primary/60 to-blue-500/60'
                : 'bg-gradient-to-br from-gray-300 to-gray-200 dark:from-gray-700 dark:to-gray-600 shadow-md',
          )}
        >
          <Power
            className={cn(
              'relative z-10 transition-all duration-700 ease-in-out',
              dims.icon,
              isConnected
                ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]'
                : isConnecting
                  ? 'text-white/80'
                  : 'text-gray-500 dark:text-gray-400',
            )}
            strokeWidth={2}
          />
        </div>

        {/* 已连接 — 外层脉动波纹 */}
        <div
          className={cn(
            'pointer-events-none absolute inset-0 rounded-full border-2 border-primary/30 transition-opacity duration-700',
            isConnected ? 'animate-ping opacity-100' : 'opacity-0',
          )}
          style={{ animationDuration: '1.5s' }}
        />
        <div
          className={cn(
            'pointer-events-none absolute inset-0 rounded-full border border-primary/20 transition-opacity duration-700',
            isConnected ? 'animate-ping opacity-100' : 'opacity-0',
          )}
          style={{ animationDuration: '3s', animationDelay: '0.5s' }}
        />
      </button>

      {/* 文字区 — 同一结构，仅文本/颜色随状态过渡 */}
      <div className="flex min-h-[3rem] flex-col items-center justify-center gap-1 text-center">
        <p
          className={cn(
            'min-h-[1.5em] font-semibold transition-all duration-700 ease-in-out',
            dims.caption,
            isConnecting && 'text-muted-foreground',
            !isConnecting && !isConnected && 'text-muted-foreground',
            !isConnecting && isConnected && 'text-primary',
          )}
        >
          {isConnecting ? '连接中...' : isConnected ? '已连接' : '点击连接'}
        </p>
        <div
          className={cn(
            'flex h-[1.25rem] items-center justify-center gap-1.5 text-[11px] transition-all duration-700 ease-in-out',
            isConnected ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1',
            !isConnected && 'pointer-events-none select-none',
          )}
          aria-hidden={!isConnected}
        >
          <Zap className="size-3 text-primary" aria-hidden />
          <span className="font-medium text-primary">
            {proxyMode === '全局' ? '全局模式已开启' : proxyMode === '直连' ? '直连模式已开启' : '规则模式已开启'}
          </span>
        </div>
      </div>
    </div>
  )
}
