import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;
export function TabsList({ className, ...p }: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("inline-flex flex-wrap gap-1 rounded-lg border border-line bg-carbon p-1", className)} {...p} />;
}
export function TabsTrigger({ className, ...p }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger className={cn("rounded-md px-3 py-1.5 text-sm text-ash transition data-[state=active]:bg-graphite data-[state=active]:text-chrome", className)} {...p} />;
}
export const TabsContent = TabsPrimitive.Content;
