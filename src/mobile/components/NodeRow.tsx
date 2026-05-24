import type { Node } from "@/types";

function parseFlag(nodeName: string): string {
  const flagMap: Record<string, string> = {
    中国: "🇨🇳", 香港: "🇭🇰", 台湾: "🇹🇼", 日本: "🇯🇵", 东京: "🇯🇵",
    新加坡: "🇸🇬", 美国: "🇺🇸", 英国: "🇬🇧", 韩国: "🇰🇷", 德国: "🇩🇪", 法国: "🇫🇷",
  };
  const primary = nodeName.split(/·|•/)[0]?.trim() ?? "";
  return flagMap[primary] ?? "🌐";
}

interface NodeRowProps {
  node: Node;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function NodeRow({ node, isSelected, onSelect }: NodeRowProps) {
  return (
    <button
      type="button"
      className="mg-node-row w-full text-left"
      onClick={() => onSelect(node.id)}
    >
      <div className="w-2.5 h-2.5 flex items-center justify-center shrink-0">
        {isSelected && (
          <div className="w-1.5 h-1.5 rounded-full bg-[#FF8000] shadow-[0_0_4px_rgba(255,128,0,0.6)]" />
        )}
      </div>
      <span className="text-lg flex-shrink-0">{parseFlag(node.name)}</span>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-semibold text-[var(--mg-text-primary)] truncate">
          {node.name}
        </span>
        <span className="text-[11px] text-[var(--mg-text-secondary)] truncate">
          {node.server}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs font-mono text-[var(--mg-text-secondary)] w-[52px] text-right tabular-nums">
          {node.delayError ? "超时" : node.delay != null ? `${node.delay}ms` : "--"}
        </span>
      </div>
    </button>
  );
}
