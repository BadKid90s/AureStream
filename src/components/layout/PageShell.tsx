import * as React from 'react'
import { cn } from '@/lib/utils'

export interface PageShellProps {
  children: React.ReactNode
  className?: string
  contentClassName?: string
  /** 与仪表盘单页布局配合：占用 MainContent 内剩余高度并沿用 min-h-0 传递 */
  fillHeight?: boolean
  title?: string
  subtitle?: string
}

export function PageShell({
  children,
  className,
  contentClassName,
  fillHeight,
  title,
  subtitle,
}: PageShellProps) {
  const showHeader = Boolean(title ?? subtitle)

  return (
    <div
      className={cn(
        'w-full max-w-4xl mx-auto',
        fillHeight && 'flex flex-1 min-h-0 flex-col h-full',
        className
      )}
    >
      {showHeader && (
        <header className="shrink-0 space-y-1 mb-4 sm:mb-5">
          {title ? (
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
                {title}
              </span>
            </h1>
          ) : null}
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </header>
      )}
      <div
        className={cn(
          fillHeight && 'flex flex-1 min-h-0 flex-col overflow-hidden',
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}
