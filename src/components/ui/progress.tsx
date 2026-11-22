import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export function Progress({ value, className, tone = "violet" }: { value: number; className?: string; tone?: "violet" | "danger" | "amber" }) {
  const color = tone === "danger" ? "bg-danger" : tone === "amber" ? "bg-amber-400" : "bg-violet";
  return (
    <ProgressPrimitive.Root className={cn("relative h-2 w-full overflow-hidden rounded-full bg-graphite", className)} value={value}>
      <ProgressPrimitive.Indicator className={cn("h-full transition-transform", color)} style={{ transform: `translateX(-${100 - Math.min(100, Math.max(0, value))}%)` }} />
    </ProgressPrimitive.Root>
  );
}
