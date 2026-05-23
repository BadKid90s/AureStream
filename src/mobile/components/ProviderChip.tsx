import { Package } from "lucide-react";

interface ProviderChipProps {
  name: string;
}

export function ProviderChip({ name }: ProviderChipProps) {
  return (
    <div className="flex items-center gap-2.5 text-[var(--mg-text-primary)] text-[18px] font-bold">
      <Package className="w-5 h-5 text-[var(--mg-primary)]" strokeWidth={2.5} />
      <span>{name}</span>
    </div>
  );
}
