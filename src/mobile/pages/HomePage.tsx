import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useProxyStore, useAppStore } from '@/stores/appStore';
import { Power, Settings, ChevronRight, Zap, Gamepad2, Globe, Film, Bot, Gauge } from 'lucide-react';
import { toast } from 'sonner';
import { logErrorDetail, userFacingMessage } from '@/lib/userErrors';
import { getFlagEmoji } from '@/types';
import type { Node } from '@/types';
import type { MobilePage } from '../components/BottomTabBar';

function pad(n: number) { return String(n).padStart(2, '0'); }

function formatDuration(s: number) {
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

function parseNode(name?: string) {
  if (!name) return { flag: '🌐', region: '自动', server: '未选择' };
  const parts = name.split(/·|•/).map(s => s.trim()).filter(Boolean);
  const map: Record<string, string> = {
    '中国': '🇨🇳', '香港': '🇭🇰', '台湾': '🇹🇼', '日本': '🇯🇵',
    '东京': '🇯🇵', '新加坡': '🇸🇬', '美国': '🇺🇸', '英国': '🇬🇧',
    '韩国': '🇰🇷', '德国': '🇩🇪', '法国': '🇫🇷',
  };
  return { flag: map[parts[0] ?? ''] ?? '🌐', region: parts[0] ?? name, server: parts[1] ?? '' };
}

const quickModes = [
  { id: 'smart', label: '智能连接', Icon: Zap },
  { id: 'game', label: '游戏模式', Icon: Gamepad2 },
  { id: 'global', label: '全球加速', Icon: Globe },
  { id: 'media', label: '流媒体', Icon: Film },
  { id: 'ai', label: 'AI Route', Icon: Bot },
  { id: 'speed', label: '自动测速', Icon: Gauge },
];

export function HomePage({ onNavigate }: { onNavigate: (p: MobilePage) => void }) {
  const {
    currentProvider, currentNode, isConnected, isConnecting, isDisconnecting,
    connectedAt, nodes, connect, disconnect,
  } = useProxyStore();
  const { setProxyMode } = useAppStore();

  const [now, setNow] = useState(Date.now);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const elapsed = isConnected && connectedAt ? Math.max(0, Math.floor((now - connectedAt) / 1000)) : 0;
  const busy = isConnecting || isDisconnecting;
  const canConnect = Boolean(currentProvider);

  const handleToggle = async () => {
    if (busy) return;
    if (isConnected) {
      try { await disconnect(); }
      catch (e) { logErrorDetail('mobile.disconnect', e); toast.error(userFacingMessage('disconnect')); }
      return;
    }
    if (!canConnect) return;
    try { await connect(); }
    catch (e) { logErrorDetail('mobile.connect', e); toast.error(userFacingMessage('connect')); }
  };

  const handleMode = async (mode: string) => {
    if (mode === 'global') await setProxyMode('global');
    else if (mode === 'smart') await setProxyMode('rule');
    else toast.info(`${mode} 模式`);
  };

  const { flag, region } = parseNode(currentNode?.name);
  const recentNodes = currentProvider
    ? nodes.filter(n => n.providerId === currentProvider.id && n.enabled && n.id !== currentNode?.id).slice(0, 5)
    : [];

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col h-full overflow-y-auto mob-text-primary">
      <div className="flex-1 px-5 pt-6 pb-2 space-y-6">

        {/* ─── Top Status Area ─── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#4DA3FF]/15 flex items-center justify-center">
              <Power className="w-4 h-4 text-[#4DA3FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">AureStream</span>
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isConnected ? 'bg-[#4ADE80] shadow-[0_0_6px_rgba(74,222,128,0.5)]' : 'bg-white/20',
                )} />
              </div>
              <span className="text-[11px] mob-text-secondary font-medium">
                {isDisconnecting ? '正在断开…' : isConnecting ? '建立连接…' : isConnected ? '已安全连接' : '未连接'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="w-8 h-8 rounded-xl mob-glass flex items-center justify-center"
          >
            <Settings className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {/* ─── Mega Connect Button ─── */}
        <div className="flex flex-col items-center py-3">
          <div className="relative flex items-center justify-center w-[70vw] max-w-[280px]" style={{ aspectRatio: '1' }}>
            {/* Ripple rings */}
            {isConnecting && (
              <>
                <div className="absolute inset-0 rounded-full animate-[mob-ripple_1.8s_ease-out_infinite] border border-[#4DA3FF]/20" />
                <div className="absolute inset-0 rounded-full animate-[mob-ripple_1.8s_ease-out_0.6s_infinite] border border-[#4DA3FF]/15" />
                <div className="absolute inset-0 rounded-full animate-[mob-ripple_1.8s_ease-out_1.2s_infinite] border border-[#4DA3FF]/10" />
              </>
            )}
            {isConnected && !busy && (
              <>
                <div className="absolute inset-0 rounded-full animate-[mob-ripple_2.5s_ease-out_infinite] border border-[#6EE7F9]/15" />
                <div className="absolute inset-0 rounded-full animate-[mob-ripple_2.5s_ease-out_1.2s_infinite] border border-[#6EE7F9]/10" />
              </>
            )}

            {/* Spinning ring — connecting */}
            {isConnecting && (
              <svg className="absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] animate-[mob-spin_1.2s_linear_infinite]" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#4DA3FF" strokeWidth="2" strokeLinecap="round" strokeDasharray="100 180" opacity="0.4" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="url(#spinGrad)" strokeWidth="2" strokeLinecap="round" strokeDasharray="50 230" />
                <defs>
                  <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4DA3FF" />
                    <stop offset="100%" stopColor="#6EE7F9" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
              </svg>
            )}

            {/* Main button */}
            <button
              type="button"
              onClick={handleToggle}
              disabled={!isConnected && (busy || !canConnect)}
              className={cn(
                'relative flex flex-col items-center justify-center rounded-full transition-all duration-500',
                'w-[88%] h-[88%]',
                'outline-none focus:outline-none select-none',
                !isConnected && !busy && 'mob-glass-deep animate-[mob-breathing_3s_ease-in-out_infinite]',
                isConnected && !busy && 'mob-glass-cyan animate-[mob-connected-pulse_3s_ease-in-out_infinite]',
                busy && 'mob-glass-deep opacity-70',
              )}
            >
              {isConnecting ? (
                <span className="text-[11px] font-bold tracking-[0.2em] text-white/70">CONNECTING</span>
              ) : (
                <>
                  <Power className={cn(
                    'transition-all duration-500',
                    isConnected ? 'w-11 h-11 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]' : 'w-9 h-9 text-white/70',
                  )} strokeWidth={2} />
                  <span className={cn(
                    'text-[13px] font-bold tracking-[0.25em] mt-2 transition-all',
                    isConnected ? 'text-white' : 'text-white/70',
                  )}>
                    {isConnected ? 'DISCONNECT' : 'CONNECT'}
                  </span>
                  {isConnected && (
                    <span className="text-[10px] font-mono tabular-nums text-white/50 mt-1">
                      {formatDuration(elapsed)}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>

          {/* Node info below button */}
          <div className="mt-5 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">{currentNode?.country ? getFlagEmoji(currentNode.country) : flag}</span>
              <span className="text-sm font-bold">{region}</span>
            </div>
            <div className="flex items-center justify-center gap-3 mt-1 text-[11px] mob-text-secondary">
              <span className="font-mono">{currentNode?.type?.toUpperCase() || '—'}</span>
              <span className="text-white/20">|</span>
              <span className="font-mono">
                {currentNode?.delayError ? '超时' : currentNode?.delay != null ? `${currentNode.delay}ms` : '—ms'}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Quick Mode Capsules ─── */}
        <div className="space-y-2">
          <span className="text-[10px] font-semibold mob-text-tertiary uppercase tracking-widest px-1">快捷模式</span>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" ref={containerRef}>
            {quickModes.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleMode(id)}
                className="mob-glass flex items-center gap-2 px-4 py-2.5 rounded-full shrink-0 active:scale-[0.97] transition-all"
              >
                <Icon className="w-3.5 h-3.5 text-white/50" />
                <span className="text-[11px] font-semibold text-white/80 whitespace-nowrap">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Recent Nodes ─── */}
        <div className="space-y-2 pb-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold mob-text-tertiary uppercase tracking-widest">最近使用</span>
            <button
              type="button"
              onClick={() => onNavigate('nodes')}
              className="text-[10px] font-semibold text-[#4DA3FF] flex items-center gap-0.5"
            >
              全部 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {recentNodes.length === 0 ? (
            <div className="mob-glass rounded-[32px] px-5 py-4">
              <p className="text-xs mob-text-secondary">暂无最近节点</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentNodes.map((node: Node) => {
                const { flag: nf, region: nr } = parseNode(node.name);
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={async () => {
                      const { applyNodeSelection } = useProxyStore.getState();
                      await applyNodeSelection(node);
                    }}
                    className="w-full mob-glass rounded-[28px] px-4 py-3 flex items-center gap-3 active:scale-[0.99] transition-all"
                  >
                    <span className="text-lg">{node.country ? getFlagEmoji(node.country) : nf}</span>
                    <div className="flex-1 text-left">
                      <span className="text-[13px] font-semibold">{nr || node.name}</span>
                      <span className="text-[10px] mob-text-tertiary block mt-0.5">{node.server}:{node.port}</span>
                    </div>
                    <span className={cn(
                      'text-[11px] font-mono font-bold tabular-nums',
                      node.delayError ? 'text-[#FF5F57]' : node.delay != null ? 'text-[#6EE7F9]' : 'text-white/20',
                    )}>
                      {node.delayError ? '超时' : node.delay != null ? `${node.delay}ms` : '—'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
