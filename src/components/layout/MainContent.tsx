import * as React from "react"

interface MainContentProps {
  children: React.ReactNode
  /** 为 false 时主区域不滚动（用于仪表盘单屏）；其他页面默认 true */
  scrollBody?: boolean
}

export function MainContent({ children, scrollBody = true }: MainContentProps) {
  return (
    <div className="flex-1 min-w-0 my-3 rounded-3xl glass-rail overflow-hidden flex flex-col min-h-0 relative shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-primary/[0.06] to-transparent pointer-events-none rounded-t-3xl" />
      <div
        className={`relative flex-1 min-h-0 flex flex-col p-6 sm:p-8 ${
          scrollBody ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
