import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useProxyStore } from '@/stores/appStore';
import { ArrowDown, ArrowUp, Wifi } from 'lucide-react';

function formatBytes(b: number) {
  if (b < 1024) return '0 B';
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatSpeed(b: number) {
  if (b < 1024) return '0 B/s';
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB/s`;
  return `${(b / 1024 / 1024).toFixed(1)} MB/s`;
}

export function DataPage() {
  const {
    isConnected, uploadSpeed, downloadSpeed, sessionUploadBytes, sessionDownloadBytes,
    connectedAt, currentNode,
  } = useProxyStore();

  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = isConnected && connectedAt ? Math.max(0, Math.floor((now - connectedAt) / 1000)) : 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto mob-text-primary">
      <div className="flex-1 px-5 pt-6 pb-2 space-y-4">

        <h1 className="text-lg font-bold">数据</h1>

        {/* Session info */}
        <div className="mob-glass rounded-[32px] p-5 text-center">
          <p className="text-[10px] mob-text-tertiary uppercase tracking-widest mb-2">本会话</p>
          <p className={cn(
            'text-4xl font-black tabular-nums tracking-tight',
            isConnected ? 'text-[#4ADE80]' : 'text-white/30',
          )}>
            {formatBytes(sessionUploadBytes + sessionDownloadBytes)}
          </p>
          <p className="text-[11px] mob-text-secondary mt-2">
            {isConnected ? `已连接 ${pad2(Math.floor(elapsed / 3600))}:${pad2(Math.floor((elapsed % 3600) / 60))}:${pad2(elapsed % 60)}` : '未连接'}
          </p>
        </div>

        {/* Speed */}
        <div className="grid grid-cols-2 gap-3">
          <div className="mob-glass rounded-[32px] p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDown className="w-4 h-4 text-[#6EE7F9]" />
              <span className="text-[10px] mob-text-tertiary font-semibold">下载</span>
            </div>
            <p className="text-xl font-black tabular-nums">{formatSpeed(downloadSpeed)}</p>
            {isConnected && <p className="text-[9px] mob-text-tertiary mt-1">总计 {formatBytes(sessionDownloadBytes)}</p>}
          </div>
          <div className="mob-glass rounded-[32px] p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUp className="w-4 h-4 text-[#4DA3FF]" />
              <span className="text-[10px] mob-text-tertiary font-semibold">上传</span>
            </div>
            <p className="text-xl font-black tabular-nums">{formatSpeed(uploadSpeed)}</p>
            {isConnected && <p className="text-[9px] mob-text-tertiary mt-1">总计 {formatBytes(sessionUploadBytes)}</p>}
          </div>
        </div>

        {/* Provider usage */}
        <UsageCard />

        {/* Node info */}
        {currentNode && (
          <div className="mob-glass rounded-[32px] px-5 py-4 flex items-center gap-3">
            <Wifi className="w-5 h-5 text-[#6EE7F9]" />
            <div>
              <p className="text-sm font-semibold">{currentNode.name}</p>
              <p className="text-[10px] mob-text-tertiary mt-0.5">{currentNode.server}:{currentNode.port}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function pad2(n: number) { return String(n).padStart(2, '0'); }

function UsageCard() {
  const { providers, currentProvider } = useProxyStore();
  const p = currentProvider || providers[0];
  if (!p || p.trafficTotalGB == null) return null;

  const used = p.trafficUsedGB ?? 0;
  const total = p.trafficTotalGB;
  const pct = Math.min(100, (used / total) * 100);

  return (
    <div className="mob-glass rounded-[32px] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold mob-text-tertiary uppercase tracking-widest">订阅用量</span>
        <span className="text-[10px] mob-text-tertiary">{p.name}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black tabular-nums">{used.toFixed(1)}</span>
        <span className="text-[11px] mob-text-secondary">/ {total.toFixed(0)} GB</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-[#4DA3FF] to-[#6EE7F9] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] mob-text-tertiary">
        <span>{pct.toFixed(1)}% 已使用</span>
        {p.expiresAt && <span>到期 {new Date(p.expiresAt).toLocaleDateString('zh-CN')}</span>}
      </div>
    </div>
  );
}
