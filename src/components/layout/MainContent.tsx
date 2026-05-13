import * as React from "react"

interface MainContentProps {
  children: React.ReactNode
}

export function MainContent({ children }: MainContentProps) {
  return (
    <div className="flex-1 overflow-auto relative">
      {/* Top gradient bar */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />
      <div className="relative p-8">
        {children}
      </div>
    </div>
  )
}
