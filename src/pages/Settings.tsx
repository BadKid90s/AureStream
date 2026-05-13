import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Moon, Sun, Info, Monitor, Globe, Zap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageShell } from '@/components/layout/PageShell'
import { useAppStore } from '@/stores/appStore'
import { cn } from '@/lib/utils'

export function Settings() {
  const { theme, toggleTheme } = useAppStore()

  const SettingRow = ({ icon: Icon, title, description, children }: {
    icon: LucideIcon
    title: string
    description: string
    children: ReactNode
  }) => (
    <div className="glass rounded-2xl p-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <div className="font-medium text-sm">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      {children}
    </div>
  )

  return (
    <PageShell title="设置" subtitle="外观、代理与应用信息">
      <div className="space-y-6">
        <div className="space-y-3">
        <SettingRow icon={Monitor} title="外观主题" description="选择浅色或深色模式">
          <div className="flex rounded-xl bg-black/5 dark:bg-white/5 p-1 gap-1">
            <button
              onClick={() => theme !== 'light' && toggleTheme()}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                theme === 'light'
                  ? "bg-white dark:bg-gray-800 shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sun className="w-3.5 h-3.5" /> 浅色
            </button>
            <button
              onClick={() => theme !== 'dark' && toggleTheme()}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                theme === 'dark'
                  ? "bg-white dark:bg-gray-800 shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Moon className="w-3.5 h-3.5" /> 深色
            </button>
          </div>
        </SettingRow>

        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm">代理设置</div>
              <div className="text-xs text-muted-foreground">配置代理连接参数</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="listen" className="text-xs">监听地址</Label>
              <Input id="listen" defaultValue="127.0.0.1" className="h-10 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="httpPort" className="text-xs">HTTP 端口</Label>
              <Input id="httpPort" type="number" defaultValue="7890" className="h-10 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="socks5Port" className="text-xs">SOCKS5 端口</Label>
              <Input id="socks5Port" type="number" defaultValue="7891" className="h-10 rounded-xl" />
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm">启动设置</div>
              <div className="text-xs text-muted-foreground">配置应用启动行为</div>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: '开机自启动', desc: '应用启动时自动运行' },
              { label: '自动连接', desc: '启动时自动连接上次使用的节点' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1">
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-10 h-6 rounded-full bg-black/10 dark:bg-white/10 peer-checked:bg-primary transition-colors duration-200" />
                  <div className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 peer-checked:translate-x-4" />
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Info className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm">关于</div>
              <div className="text-xs text-muted-foreground">应用信息和版本</div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {[
              { label: '应用版本', value: '1.0.0' },
              { label: '内核版本', value: 'v1.18.2' },
              { label: '框架', value: 'Tauri 2.0' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between py-1.5 px-3 rounded-lg bg-black/5 dark:bg-white/5">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </PageShell>
  )
}
