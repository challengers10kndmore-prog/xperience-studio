import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", {
  variants: {
    variant: {
      default: "bg-graphite text-chrome border border-line",
      pending: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
      publishing: "bg-electric/15 text-blue-300 border border-electric/30",
      live: "bg-success/15 text-emerald-300 border border-success/30",
      failed: "bg-danger/15 text-rose-300 border border-danger/30",
      violet: "bg-violet/20 text-violet-200 border border-violet/40",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...p }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ variant }), className)} {...p} />;
}
