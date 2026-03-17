import { cn } from "../../../lib/utils";
import type { ProviderId } from "../../../../../shared/contracts";

interface ProviderBadgeProps {
  providerId: ProviderId;
  className?: string;
}

const BADGE_MAP: Record<ProviderId, { label: string; className: string }> = {
  anthropic: { label: "AN", className: "bg-accent-brand-muted text-accent-brand" },
  codex: { label: "CX", className: "bg-success-muted text-success" },
};

export function ProviderBadge({ providerId, className }: ProviderBadgeProps) {
  const badge = BADGE_MAP[providerId];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-sm text-[11px] font-bold px-1",
        badge.className,
        className,
      )}
    >
      {badge.label}
    </span>
  );
}
