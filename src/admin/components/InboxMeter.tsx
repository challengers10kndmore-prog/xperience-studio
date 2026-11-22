import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";
import { inboxUsage, INBOX_LIMIT_BYTES } from "../db";

export function InboxMeter() {
  const { data, error } = useQuery({ queryKey: ["admin", "inbox-usage"], queryFn: inboxUsage, refetchInterval: 30_000 });
  const pct = data ? (data.bytes / INBOX_LIMIT_BYTES) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm"><span>Upload inbox</span><span className="text-ash">{data ? `${formatBytes(data.bytes)} of 1 GB · ${data.files} file(s)` : error ? "unavailable" : "…"}</span></div>
      <Progress value={pct} tone={pct > 85 ? "danger" : pct > 60 ? "amber" : "violet"} />
      <p className="text-xs text-ash">Files leave the inbox once they're published to the media host. If it stays full, check for failed items.</p>
    </div>
  );
}
