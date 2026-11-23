import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminApi } from "../api";

/** Starts a full sync: every pending item in every table is published. */
export function PublishAllButton({ variant = "secondary" }: { variant?: "secondary" | "default" }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <Button variant={variant} disabled={busy} onClick={async () => {
      setBusy(true);
      try { await adminApi.publish("all"); toast.success("Publishing everything that's pending. Items turn Live in a few minutes."); setTimeout(() => qc.invalidateQueries({ queryKey: ["admin"] }), 4000); }
      catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't start publishing"); }
      finally { setBusy(false); }
    }}><RefreshCw /> Publish all pending</Button>
  );
}
