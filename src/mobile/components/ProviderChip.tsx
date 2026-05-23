import { Package } from "lucide-react";
import type { Provider } from "@/types";

interface ProviderChipProps {
  provider: Provider;
}

export function ProviderChip({ provider }: ProviderChipProps) {
  const total = provider.trafficTotalGB || 0;
  const used = provider.trafficUsedGB || 0;
  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-[24px] bg-[var(--mg-glass-bg)] border border-[var(--mg-glass-border)] shadow-[var(--mg-glass-shadow)] backdrop-blur-xl w-full max-w-[340px]">
      <Package className="w-5.5 h-5.5 text-[#FF8000] shrink-0" strokeWidth={2.5} />
      <div className="flex flex-col items-start text-left min-w-0 flex-1">
        <span className="text-[15px] font-extrabold text-[var(--mg-text-primary)] truncate w-full">
          {provider.name}
        </span>
        <span className="text-[11px] text-[var(--mg-text-secondary)] font-mono mt-1">
          {provider.nodeCount}个节点 · {used.toFixed(1)}G/{total.toFixed(0)}G
        </span>
      </div>
    </div>
  );
}
