import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore, useProxyStore } from '@/stores/appStore';
import { Sun, Moon, Monitor, Shuffle, Globe, ArrowLeftRight, Power, Wifi } from 'lucide-react';
import type { MobilePage } from '../components/BottomTabBar';

const themes = [
  { id: 'light' as const, label: '浅色', Icon: Sun },
  { id: 'dark' as const, label: '深色', Icon: Moon },
  { id: 'system' as const, label: '系统', Icon: Monitor },
];

const modes = [
  { id: 'rule' as const, label: '规则模式', desc: '自动分流', Icon: Shuffle },
  { id: 'global' as const, label: '全局模式', desc: '全部代理', Icon: Globe },
  { id: 'direct' as const, label: '直连模式', desc: '绕过代理', Icon: ArrowLeftRight },
];

export function ProfilePage(_props: { onNavigate?: (p: MobilePage) => void }) {
  const { theme, setTheme, autoStart, setAutoStart, autoConnect, setAutoConnect, proxyMode, setProxyMode } = useAppStore();
  const { providers, currentProvider, isConnected } = useProxyStore();
  const [showMode, setShowMode] = useState(false);

  const p = currentProvider || providers[0];

  return (
    <div className="flex flex-col h-full overflow-y-auto mob-text-primary">
      <div className="flex-1 px-5 pt-6 pb-2 space-y-4">

        {/* Profile header */}
        <div className="mob-glass rounded-[32px] p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#4DA3FF]/15 flex items-center justify-center text-xl font-black text-[#4DA3FF]">
            {p ? p.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div>
            <p className="text-base font-bold">{p?.name || '未设置'}</p>
            <p className="text-[11px] mob-text-secondary mt-0.5">
              {p ? `${p.nodeCount} 节点 · ${p.trafficTotalGB ?? '∞'} GB` : '请添加订阅'}
            </p>
          </div>
        </div>

        {/* Appearance */}
        <div className="mob-glass rounded-[32px] p-4 space-y-3">
          <span className="text-[10px] font-semibold mob-text-tertiary uppercase tracking-widest block">外观</span>
          <div className="flex gap-2">
            {themes.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1.5 py-3 rounded-[28px] transition-all active:scale-[0.98]',
                  theme === t.id ? 'bg-[#4DA3FF] text-white shadow-[0_0_16px_rgba(77,163,255,0.2)]' : 'bg-white/5 text-white/40',
                )}
              >
                <t.Icon className="w-4 h-4" />
                <span className="text-[10px] font-semibold">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="mob-glass rounded-[32px] overflow-hidden">
          <span className="text-[10px] font-semibold mob-text-tertiary uppercase tracking-widest px-4 pt-3.5 pb-1 block">设置</span>

          <button
            type="button"
            onClick={() => !isConnected && setShowMode(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 disabled:opacity-40"
          >
            <div className="flex items-center gap-3">
              <Shuffle className="w-4 h-4 text-white/40" />
              <span className="text-xs font-medium">代理模式</span>
            </div>
            <span className="text-xs mob-text-secondary">{modes.find(m => m.id === proxyMode)?.label}</span>
          </button>

          <div className="border-t border-white/5">
            <Row icon={Power} label="开机自启" enabled={autoStart} onToggle={() => setAutoStart(!autoStart)} />
          </div>
          <div className="border-t border-white/5">
            <Row icon={Wifi} label="自动连接" enabled={autoConnect} onToggle={() => setAutoConnect(!autoConnect)} />
          </div>
        </div>

        {/* About */}
        <div className="mob-glass rounded-[32px] px-4 py-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">版本</span>
            <span className="text-xs mob-text-secondary">v0.1.2</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <span className="text-xs font-medium">内核</span>
            <span className="text-xs mob-text-secondary">Mihomo</span>
          </div>
        </div>

        {/* Mode bottom sheet */}
        {showMode && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowMode(false)}>
            <div
              className="w-full max-w-md mob-glass rounded-t-[32px] p-5 pb-10"
              onClick={e => e.stopPropagation()}
              style={{ animation: 'mob-fade-up 0.25s ease-out' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold">代理模式</h3>
                <button type="button" onClick={() => setShowMode(false)} className="text-[11px] mob-text-secondary font-medium">关闭</button>
              </div>
              <div className="space-y-1.5">
                {modes.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { void setProxyMode(m.id); setShowMode(false); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3.5 rounded-[28px] transition-all active:scale-[0.99]',
                      proxyMode === m.id ? 'bg-[#4DA3FF]/10 border border-[#4DA3FF]/20' : 'bg-white/5',
                    )}
                  >
                    <m.Icon className={cn('w-4 h-4', proxyMode === m.id ? 'text-[#4DA3FF]' : 'text-white/30')} />
                    <div className="flex-1 text-left">
                      <span className={cn('text-sm font-semibold', proxyMode === m.id ? 'text-[#4DA3FF]' : 'text-white')}>{m.label}</span>
                      <p className="text-[9px] mob-text-tertiary mt-0.5">{m.desc}</p>
                    </div>
                    <div className={cn(
                      'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0',
                      proxyMode === m.id ? 'border-[#4DA3FF]' : 'border-white/10',
                    )}>
                      {proxyMode === m.id && <div className="w-[6px] h-[6px] rounded-full bg-[#4DA3FF]" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, enabled, onToggle }: {
  icon: typeof Power;
  label: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5">
      <Icon className="w-4 h-4 text-white/40" />
      <div className="flex-1 text-left">
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={cn(
        'relative w-8 h-[18px] rounded-full transition-colors shrink-0',
        enabled ? 'bg-[#4ADE80]' : 'bg-white/10',
      )}>
        <div className={cn(
          'absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform shadow-sm',
          enabled && 'translate-x-[14px]',
        )} />
      </div>
    </button>
  );
}
