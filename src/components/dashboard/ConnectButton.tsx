import { Power, Zap } from 'lucide-react'
import { useId } from 'react'
import { cn } from '@/lib/utils'
import { useProxyStore } from '@/stores/appStore'

const SIZE_MAP = {
  default: {
    glow: 'w-[9.25rem] h-[9.25rem]',
    outer: 'w-[7.75rem] h-[7.75rem]',
    inner: 'w-[5rem] h-[5rem]',
    icon: 'w-9 h-9',
    caption: 'text-base',
  },
  lg: {
    glow: 'w-[12rem] h-[12rem]',
    outer: 'w-[10rem] h-[10rem]',
    inner: 'w-[6.75rem] h-[6.75rem]',
    icon: 'w-11 h-11',
    caption: 'text-lg',
  },
} as const

interface ConnectButtonProps {
  /** 外层禁用（如无供应商或无可用节点） */
  disabled?: boolean
  /** default：原尺寸；lg：左侧连接列主按钮放大 */
  size?: keyof typeof SIZE_MAP
  className?: string
}

export function ConnectButton({
  disabled: disabledOuter = false,
  size = 'default',
  className,
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
    <div className={cn('relative flex flex-col items-center gap-3', className)}>
      <div
        className={cn(
          'absolute inset-0 rounded-full transition-all duration-700 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2',
          dims.glow,
          isConnected ? 'bg-primary/20 blur-2xl animate-pulse' : 'bg-primary/5 blur-xl'
        )}
        style={isConnected ? { animationDuration: '2s' } : undefined}
      />

      <button
        type="button"
        onClick={handleClick}
        disabled={!isConnected && (disabledOuter || isConnecting)}
        aria-disabled={!isConnected && (disabledOuter || isConnecting)}
        title={disabledOuter && !isConnected ? '请先选择有可节点的供应商' : undefined}
        className={cn(
          'relative rounded-full flex items-center justify-center transition-all duration-500',
          dims.outer,
          'glass-strong group',
          !isConnecting &&
            ((!isConnected && !disabledOuter) || isConnected)
            ? 'hover:scale-105 active:scale-95 cursor-pointer'
            : isConnecting
              ? 'cursor-default'
              : 'opacity-45 cursor-not-allowed',
          isConnected && 'border-primary/30'
        )}
        style={{
          boxShadow: isConnected
            ? '0 0 48px rgba(59, 130, 246, 0.35), 0 0 96px rgba(59, 130, 246, 0.12), inset 0 1px 0 rgba(255,255,255,0.3)'
            : '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.3)',
        }}
      >
        {isConnecting && (
          <svg className="absolute inset-0 w-full h-full animate-spin" viewBox="0 0 124 124">
            <circle
              cx="62"
              cy="62"
              r="58"
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

        <div
          className={cn(
            'relative rounded-full flex items-center justify-center transition-all duration-500',
            dims.inner,
            isConnected
              ? 'bg-gradient-to-br from-primary to-primary'
              : 'bg-gradient-to-br from-gray-300 to-gray-200 dark:from-gray-700 dark:to-gray-600'
          )}
        >
          <Power
            className={cn(
              'relative z-10 transition-all duration-300',
              dims.icon,
              isConnected ? 'text-white drop-shadow-lg' : 'text-gray-500 dark:text-gray-400'
            )}
            strokeWidth={2}
          />
        </div>

        {isConnected && (
          <>
            <div
              className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping pointer-events-none"
              style={{ animationDuration: '1.5s' }}
            />
            <div
              className="absolute inset-0 rounded-full border border-primary/20 animate-ping pointer-events-none"
              style={{ animationDuration: '3s', animationDelay: '0.5s' }}
            />
          </>
        )}
      </button>

      <div className="flex min-h-[2.875rem] flex-col items-center justify-center gap-1 text-center">
        {isConnecting ? (
          <div
            className={cn(
              'font-semibold transition-colors duration-300',
              dims.caption,
              'text-muted-foreground'
            )}
          >
            连接中...
          </div>
        ) : isConnected ? (
          <div className={cn(dims.caption, 'invisible select-none font-semibold')} aria-hidden>
            点击连接
          </div>
        ) : (
          <div className={cn('font-semibold text-muted-foreground transition-colors duration-300', dims.caption)}>
            点击连接
          </div>
        )}
        <div
          className={cn(
            'flex h-[1.125rem] items-center justify-center gap-1.5 text-[11px]',
            !isConnected && 'pointer-events-none opacity-0'
          )}
          aria-hidden={!isConnected}
        >
          <Zap className="h-3 w-3 shrink-0 text-primary" aria-hidden />
          <span className="font-medium text-primary">代理已开启</span>
        </div>
      </div>
    </div>
  )
}
