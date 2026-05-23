import { useState, useMemo } from "react";
import { RefreshCw, ArrowDown01, ArrowDownAZ } from "lucide-react";
import { NodeRow } from "@/mobile/components/NodeRow";
import { useProxyStore } from "@/stores/appStore";
import { toast } from "sonner";

export function NodesPage() {
  const {
    currentProvider,
    currentNode,
    nodes,
    applyNodeSelection,
    testLatency,
    isTestingLatency,
  } = useProxyStore();

  const [sortBy, setSortBy] = useState<"name" | "delay">("delay");

  const activeNodes = useMemo(() => {
    if (!currentProvider) return [];
    return nodes.filter((n) => n.providerId === currentProvider.id && n.enabled);
  }, [nodes, currentProvider]);

  const sorted = useMemo(() => {
    const arr = [...activeNodes];
    if (sortBy === "name") {
      arr.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
    } else {
      arr.sort((a, b) => {
        const da = a.delayError ? Infinity : (a.delay ?? Infinity);
        const db = b.delayError ? Infinity : (b.delay ?? Infinity);
        if (da === Infinity && db === Infinity) return a.name.localeCompare(b.name, "zh-Hans-CN");
        return da - db;
      });
    }
    return arr;
  }, [activeNodes, sortBy]);

  const handleSelect = async (id: string) => {
    const node = activeNodes.find((n) => n.id === id);
    if (node) {
      try { await applyNodeSelection(node); } catch {
        toast.error("切换节点失败");
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {currentProvider && (
        <div className="mg-glass-card mx-4 mt-4 p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--mg-text-primary)]">
              {currentProvider.name}
            </h3>
            <p className="text-[11px] text-[var(--mg-text-secondary)] mt-0.5">
              节点数 {currentProvider.nodeCount}
              {currentProvider.expiresAt &&
                ` · 到期 ${new Date(currentProvider.expiresAt).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })}`}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-1 px-4 py-3">
        <button
          type="button"
          onClick={() => setSortBy("delay")}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
            sortBy === "delay"
              ? "bg-[var(--mg-primary)] text-white"
              : "text-[var(--mg-text-secondary)]"
          }`}
        >
          <ArrowDown01 className="w-3.5 h-3.5 inline mr-1" />
          延迟
        </button>
        <button
          type="button"
          onClick={() => setSortBy("name")}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
            sortBy === "name"
              ? "bg-[var(--mg-primary)] text-white"
              : "text-[var(--mg-text-secondary)]"
          }`}
        >
          <ArrowDownAZ className="w-3.5 h-3.5 inline mr-1" />
          名称
        </button>
      </div>

      <div className="flex-1 overflow-y-auto mg-scroll-none px-2">
        {sorted.map((node) => (
          <NodeRow
            key={node.id}
            node={node}
            isSelected={node.id === currentNode?.id}
            onSelect={handleSelect}
          />
        ))}
        {sorted.length === 0 && (
          <p className="text-center text-sm text-[var(--mg-text-secondary)] mt-12">
            暂无可用节点
          </p>
        )}
      </div>

      <div className="p-4">
        <button
          type="button"
          onClick={() => testLatency()}
          disabled={isTestingLatency}
          className="w-full py-3 rounded-2xl bg-[var(--mg-glass-bg)] backdrop-blur-xl border border-[var(--mg-glass-border)] text-sm font-semibold text-[var(--mg-text-primary)] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isTestingLatency ? "animate-spin" : ""}`} />
          {isTestingLatency ? "测试中..." : "测试全部延迟"}
        </button>
      </div>
    </div>
  );
}
