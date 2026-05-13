import { Home, Package, Settings, Moon, Sun, ChevronRight, Zap } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { cn } from '@/lib/utils'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { theme, toggleTheme } = useAppStore()

  const menuItems = [
    { id: 'dashboard', label: '仪表盘', icon: Home },
    { id: 'providers', label: '服务商', icon: Package },
    { id: 'settings', label: '设置', icon: Settings },
  ]

  return (
    <div className="flex flex-col h-screen w-64 glass-strong border-r border-white/20 relative z-10">
      {/* Background gradient accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

      {/* Logo area */}
      <div className="relative flex items-center gap-3 px-5 h-16 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center shadow-lg shadow-primary/25">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight">AureProxy</span>
          <div className="text-[10px] text-muted-foreground leading-none">v1.0.0</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 px-3 py-4">
        <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          导航
        </p>
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                  )}
                  <Icon className={cn("w-[18px] h-[18px] transition-transform duration-200", isActive && "scale-110")} />
                  <span>{item.label}</span>
                  {isActive && (
                    <ChevronRight className="w-4 h-4 ml-auto opacity-60" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Theme toggle */}
      <div className="relative px-3 py-4 border-t border-white/10">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all duration-200"
        >
          {theme === 'light' ? (
            <Moon className="w-[18px] h-[18px]" />
          ) : (
            <Sun className="w-[18px] h-[18px]" />
          )}
          <span>{theme === 'light' ? '深色模式' : '浅色模式'}</span>
          <div className="ml-auto w-8 h-5 rounded-full bg-muted flex items-center px-0.5 transition-colors duration-300">
            <div className={cn(
              "w-4 h-4 rounded-full bg-primary shadow-md transition-transform duration-300",
              theme === 'dark' ? 'translate-x-3' : 'translate-x-0'
            )} />
          </div>
        </button>
      </div>
    </div>
  )
}
