import { Badge } from "@/components/ui/badge";
import { dispatchedAt } from "../api";
import type { AnyRow } from "../db";

export type LiveState = "pending" | "publishing" | "live" | "failed" | "none";

export function liveState(table: string, pk: string, row: AnyRow): LiveState {
  const status = row.media_status as string | undefined;
  if (!status) return "none";
  if (status === "failed") return "failed";
  if (status === "published") return "live";
  const at = dispatchedAt(table, String(row[pk]));
  return at && Date.now() - at < 30 * 60_000 ? "publishing" : "pending";
}

const LABEL: Record<LiveState, string> = { pending: "Pending", publishing: "Publishing…", live: "Live", failed: "Failed", none: "" };

export function StatusBadge({ state, title }: { state: LiveState; title?: string }) {
  if (state === "none") return null;
  return <Badge variant={state} title={title}>{state === "publishing" && <span className="size-1.5 animate-pulse rounded-full bg-current" />}{LABEL[state]}</Badge>;
}
