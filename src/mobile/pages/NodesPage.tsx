import { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Activity, Loader2, RefreshCw, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProxyStore } from '@/stores/appStore';
import { getLatencyColor, getFlagEmoji } from '@/types';

function parseNode(name?: string) {
  if (!name) return { flag: '🌐', region: '未知', label: name ?? '' };
  const parts = name.split(/·|•/).map(s => s.trim()).filter(Boolean);
  const map: Record<string, string> = {
    '中国': '🇨🇳', '香港': '🇭🇰', '台湾': '🇹🇼', '日本': '🇯🇵',
    '东京': '🇯🇵', '新加坡': '🇸🇬', '美国': '🇺🇸', '英国': '🇬🇧',
    '韩国': '🇰🇷', '德国': '🇩🇪', '法国': '🇫🇷',
  };
  return { flag: map[parts[0] ?? ''] ?? '🌐', region: parts[0] ?? name, label: parts[0] ?? name };
}

export function NodesPage() {
  const {
    currentProvider, currentNode, nodes, isTestingLatency, latencyPendingByNodeId,
    testLatency, applyNodeSelection,
  } = useProxyStore();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'delay' | 'name'>('delay');
  const [favorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('mob_fav_nodes') ?? '[]'); }
    catch { return []; }
  });

  const active = useMemo(
    () => currentProvider ? nodes.filter(n => n.providerId === currentProvider.id && n.enabled) : [],
    [nodes, currentProvider],
  );

  const filtered = useMemo(() => {
    let list = active;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n => n.name.toLowerCase().includes(q) || n.server.toLowerCase().includes(q));
    }
    const arr = [...list];
    arr.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'zh-Hans-CN');
      if (a.delayError && !b.delayError) return 1;
      if (!a.delayError && b.delayError) return -1;
      if (a.delayError && b.delayError) return a.name.localeCompare(b.name, 'zh-Hans-CN');
      const da = a.delay, db = b.delay;
      if (da == null && db == null) return a.name.localeCompare(b.name, 'zh-Hans-CN');
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    });
    return arr;
  }, [active, search, sortBy]);

  return (
    <div className="flex flex-col h-full overflow-y-auto mob-text-primary">
      <div className="flex-1 px-5 pt-6 pb-2 space-y-3">

        <h1 className="text-lg font-bold">选择节点</h1>

        {/* Search */}
        <div className="mob-glass rounded-[28px] px-4 py-2.5 flex items-center gap-2.5">
          <Search className="w-4 h-4 text-white/30 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索国家或节点..."
            className="flex-1 bg-transparent text-sm font-medium text-white placeholder:text-white/20 outline-none"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="text-[10px] font-semibold text-white/40">
              清除
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void testLatency()}
            disabled={isTestingLatency || active.length === 0}
            className="mob-glass rounded-[28px] px-4 py-2.5 flex items-center gap-2 text-[11px] font-bold flex-1 justify-center text-white/80 active:scale-[0.98] transition-all disabled:opacity-40"
          >
            {isTestingLatency ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
            <span>{isTestingLatency ? '测速中' : '全部测速'}</span>
          </button>
          <button
            type="button"
            onClick={() => setSortBy(s => s === 'name' ? 'delay' : 'name')}
            className="mob-glass rounded-[28px] px-4 py-2.5 flex items-center gap-1.5 text-[11px] font-bold text-white/60 active:scale-[0.98] transition-all"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortBy === 'name' ? '名称' : '延迟'}</span>
          </button>
        </div>

        {/* List */}
        <div className="space-y-1.5 pb-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/30">
              <p className="text-sm font-medium">{search ? '无匹配结果' : '暂无节点'}</p>
            </div>
          ) : (
            filtered.map(node => {
              const sel = currentNode?.id === node.id;
              const { flag, region } = parseNode(node.name);
              const pending = latencyPendingByNodeId[node.id];
              const delayText = node.delayError ? '超时' : node.delay != null ? `${node.delay}ms` : null;
              const isFav = favorites.includes(node.id);

              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => void applyNodeSelection(node)}
                  className={cn(
                    'w-full mob-glass rounded-[28px] px-4 py-3.5 flex items-center gap-3 text-left active:scale-[0.99] transition-all',
                    sel && 'bg-[#4DA3FF]/10 border border-[#4DA3FF]/20',
                  )}
                >
                  <span className="text-lg shrink-0">{node.country ? getFlagEmoji(node.country) : flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm font-semibold truncate', sel ? 'text-[#4DA3FF]' : 'text-white')}>
                        {region}
                      </span>
                      {sel && <span className="text-[8px] font-bold text-[#4DA3FF] px-1.5 py-0.5 rounded-full bg-[#4DA3FF]/15 shrink-0">当前</span>}
                    </div>
                    <span className="text-[10px] text-white/35 mt-0.5 block truncate">{node.server}:{node.port}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isFav && <Star className="w-3 h-3 text-[#4DA3FF] fill-[#4DA3FF]" />}
                    {pending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white/40" />
                    ) : delayText ? (
                      <span className={cn(
                        'text-[11px] font-mono font-bold tabular-nums',
                        node.delayError ? 'text-[#FF5F57]' : getLatencyColor(node.delay),
                      )}>
                        {delayText}
                      </span>
                    ) : (
                      <span className="text-[9px] text-white/20">测速</span>
                    )}
                    <div className={cn(
                      'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                      sel ? 'border-[#4DA3FF]' : 'border-white/10',
                    )}>
                      {sel && <div className="w-[6px] h-[6px] rounded-full bg-[#4DA3FF]" />}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
