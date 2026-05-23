import { Package } from "lucide-react";

interface ProviderChipProps {
  name: string;
}

export function ProviderChip({ name }: ProviderChipProps) {
  return (
    <div className="mg-provider-chip">
      <Package className="w-3.5 h-3.5 text-[var(--mg-primary)]" />
      <span>{name}</span>
    </div>
  );
}
