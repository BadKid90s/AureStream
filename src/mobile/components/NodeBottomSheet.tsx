import { useMemo } from "react";
import { ArrowDown01, ArrowDownAZ, RefreshCw } from "lucide-react";
import { NodeRow } from "./NodeRow";
import type { Node } from "@/types";

interface NodeBottomSheetProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  currentNodeId?: string;
  sortBy: "name" | "delay";
  onSortChange: (sort: "name" | "delay") => void;
  onSelect: (id: string) => void;
  onTestLatency: () => void;
  isTesting: boolean;
}

export function NodeBottomSheet({
  open,
  onClose,
  nodes,
  currentNodeId,
  sortBy,
  onSortChange,
  onSelect,
  onTestLatency,
  isTesting,
}: NodeBottomSheetProps) {
  const sorted = useMemo(() => {
    const arr = [...nodes];
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
  }, [nodes, sortBy]);

  if (!open) return null;

  return (
    <>
      <div
        className="mg-sheet-overlay"
        onClick={onClose}
        style={{ animation: "sheet-fade-in 0.25s ease-out" }}
      />
      <div
        className="mg-sheet-panel"
        style={{ animation: "sheet-slide-in 0.35s cubic-bezier(0.32, 0.72, 0, 1)" }}
      >
        <div className="mg-sheet-handle" />
        <div className="flex items-center justify-between px-5 pb-3">
          <h3 className="text-base font-bold text-[var(--mg-text-primary)]">选择节点</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSortChange("delay")}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
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
              onClick={() => onSortChange("name")}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                sortBy === "name"
                  ? "bg-[var(--mg-primary)] text-white"
                  : "text-[var(--mg-text-secondary)]"
              }`}
            >
              <ArrowDownAZ className="w-3.5 h-3.5 inline mr-1" />
              名称
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto mg-scroll-none">
          {sorted.map((node) => (
            <NodeRow
              key={node.id}
              node={node}
              isSelected={node.id === currentNodeId}
              onSelect={onSelect}
            />
          ))}
        </div>
        <div className="p-4">
          <button
            type="button"
            onClick={onTestLatency}
            disabled={isTesting}
            className="w-full py-3 rounded-2xl bg-[var(--mg-glass-bg)] backdrop-blur-xl border border-[var(--mg-glass-border)] text-sm font-semibold text-[var(--mg-text-primary)] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isTesting ? "animate-spin" : ""}`} />
            {isTesting ? "测试中..." : "测试全部延迟"}
          </button>
        </div>
      </div>
    </>
  );
}
