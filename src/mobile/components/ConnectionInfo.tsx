import { getLatencyLevel } from "@/types";

interface ConnectionInfoProps {
  nodeName?: string;
  nodeServer?: string;
  delay?: number;
}

function parseNodeLabels(nodeName?: string): { flag: string; primary: string; secondary: string } {
  if (!nodeName) return { flag: "🌐", primary: "未选择节点", secondary: "" };
  const parts = nodeName.split(/·|•/).map((p) => p.trim()).filter(Boolean);
  const primary = parts[0] ?? nodeName;
  const secondary = parts.slice(1, 3).join(" · ") || "";
  const flagMap: Record<string, string> = {
    中国: "🇨🇳", 香港: "🇭🇰", 台湾: "🇹🇼", 日本: "🇯🇵", 东京: "🇯🇵",
    新加坡: "🇸🇬", 美国: "🇺🇸", 英国: "🇬🇧", 韩国: "🇰🇷", 德国: "🇩🇪", 法国: "🇫🇷",
  };
  const flag = flagMap[primary] ?? "🌐";
  return { flag, primary, secondary };
}

export function ConnectionInfo({ nodeName, nodeServer, delay }: ConnectionInfoProps) {
  const { flag, primary, secondary } = parseNodeLabels(nodeName);
  const level = getLatencyLevel(delay);

  const dotColor =
    level === "excellent" ? "mg-signal-excellent" :
    level === "good" ? "mg-signal-good" :
    level === "poor" ? "mg-signal-poor" :
    "mg-signal-unknown";

  return (
    <div className="mg-connection-info">
      <span className="text-xl">{flag}</span>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-[var(--mg-text-primary)] truncate">
          {primary}
        </span>
        {secondary && (
          <span className="text-[11px] text-[var(--mg-text-secondary)] truncate">
            {secondary}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 ml-auto">
        <div className={`mg-signal-dot ${dotColor}`} />
        <span className="text-xs font-mono font-medium text-[var(--mg-text-secondary)]">
          {delay != null ? `${delay}ms` : "--"}
        </span>
      </div>
    </div>
  );
}
