import { cn } from "../../../lib/utils";

interface StepDotsProps {
  current: number;
  total?: number;
}

export function StepDots({ current, total = 2 }: StepDotsProps) {
  return (
    <div className="flex justify-center gap-1.5 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all",
            i === current
              ? "w-[18px] bg-accent-brand"
              : i < current
                ? "w-1.5 bg-accent-brand/60"
                : "w-1.5 bg-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}
