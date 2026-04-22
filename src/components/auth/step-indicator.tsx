import { cn } from "@/lib/utils";

export function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i < current ? "w-6 bg-primary" : i === current ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}
