import { useState, useEffect, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Moon, Sun, Info, Monitor, Globe, Zap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageShell } from '@/components/layout/PageShell'
import { useAppStore } from '@/stores/appStore'
import { cn } from '@/lib/utils'
import { getVersion, type MihomoVersion } from 'tauri-plugin-mihomo-api'

export function Settings() {
  const { theme, setTheme, proxyBypassDomains, setProxyBypassDomains,
          autoStart, autoConnect, setAutoStart, setAutoConnect } = useAppStore()
  const [kernelVersion, setKernelVersion] = useState<MihomoVersion | null>(null)
  const [kernelError, setKernelError] = useState(false)

  useEffect(() => {
    getVersion()
      .then(setKernelVersion)
      .catch(() => setKernelError(true))
  }, [])

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
    <PageShell title="设置">
      <div className="space-y-6">
        <div className="space-y-3">
        <SettingRow icon={Monitor} title="外观主题" description="选择跟随系统、浅色或深色模式">
          <div className="flex rounded-xl bg-black/5 dark:bg-white/5 p-1 gap-1">
            {[
              { id: 'system', label: '跟随系统', icon: Monitor },
              { id: 'light', label: '浅色', icon: Sun },
              { id: 'dark', label: '深色', icon: Moon },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => theme !== t.id && setTheme(t.id as 'system'|'light'|'dark')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border',
                  theme === t.id
                    ? 'bg-white dark:bg-[#202025] text-foreground shadow-sm border-black/5 dark:border-white/10'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5',
                )}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </SettingRow>

        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm">代理设置</div>
              <div className="text-xs text-muted-foreground">配置系统代理排除地址（逗号分隔）</div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="proxyBypassDomains" className="text-xs">排除代理的地址</Label>
            <Input
              id="proxyBypassDomains"
              value={proxyBypassDomains}
              onChange={(e) => setProxyBypassDomains(e.target.value)}
              placeholder="localhost,127.*,10.*,192.168.*,<local>"
              className="h-10 rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              示例：localhost,127.*,10.*,192.168.*,*.local,&lt;local&gt;
            </p>
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
              { label: '开机自启动', desc: '应用启动时自动运行', checked: autoStart, onChange: setAutoStart },
              { label: '自动连接', desc: '启动时自动连接上次使用的节点', checked: autoConnect, onChange: setAutoConnect },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1">
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={item.checked}
                    onChange={(e) => item.onChange(e.target.checked)}
                  />
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
              {
                label: '内核版本',
                value: kernelVersion
                  ? kernelVersion.version
                  : kernelError
                    ? '未运行'
                    : '检测中…',
              },
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
