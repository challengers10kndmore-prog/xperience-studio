import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi, type SyncStatus } from "../api";
import { InboxMeter } from "../components/InboxMeter";
import { PublishAllButton } from "../components/PublishAllButton";
import { db } from "../db";

const ago = (iso?: string | null) => {
  if (!iso) return "never";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return `${s}s ago`;
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  if (s < 172800) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} days ago`;
};

export default function OverviewPage() {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ["admin", "sync-status"], queryFn: adminApi.status, refetchInterval: 30_000, retry: false });
  const counts = useQuery({
    queryKey: ["admin", "counts"],
    queryFn: async () => {
      const c = async (t: string, f?: [string, unknown]) => { let q = db().from(t).select("*", { count: "exact", head: true }); if (f) q = q.eq(f[0], f[1]); return (await q).count ?? 0; };
      const [projects, live, pending, failed, unread] = await Promise.all([
        c("projects"), c("projects", ["published", true]), c("projects", ["media_status", "pending"]), c("projects", ["media_status", "failed"]), c("contact_messages", ["is_read", false]),
      ]);
      return { projects, live, pending, failed, unread };
    },
  });

  async function setSource(mode: SyncStatus["source"]["data"]) {
    try { await adminApi.setSource(mode); toast.success(`Data source set to ${mode}. Visitors pick it up within a minute.`); qc.invalidateQueries({ queryKey: ["admin", "sync-status"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't change the source"); }
  }

  const s = status.data;
  return (
    <div className="space-y-6">
      <h1 className="font-body text-2xl font-semibold tracking-normal">Overview</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[["Projects", counts.data?.projects], ["Published", counts.data?.live], ["Publishing", counts.data?.pending], ["Failed", counts.data?.failed], ["Unread messages", counts.data?.unread]].map(([k, v]) => (
          <Card key={String(k)}><CardHeader><CardDescription>{k}</CardDescription><CardTitle className="text-2xl">{v ?? "–"}</CardTitle></CardHeader></Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Media sync</CardTitle><CardDescription>Videos are published to GitHub Pages by the sync Action.</CardDescription></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {status.error ? <p className="text-amber-300">{(status.error as Error).message}</p> : (
              <>
                <Row k="Last sync" v={s?.lastSync ? `${ago(s.lastSync.updated_at)} · ${s.lastSync.conclusion ?? s.lastSync.status}` : "…"} href={s?.lastSync?.html_url} />
                <Row k="Manifest snapshot" v={ago(s?.manifestGeneratedAt)} />
                <Row k="Supabase keep-alive" v={ago(s?.keepAliveAt ?? s?.lastKeepAlive?.updated_at)} href={s?.lastKeepAlive?.html_url} />
              </>
            )}
            <div className="flex flex-wrap gap-2"><PublishAllButton variant="default" />
            <Button size="sm" variant="secondary" onClick={async () => { try { await adminApi.publish("manifest"); toast.success("Publishing changes (about a minute)."); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } }}>
              <RefreshCw /> Publish text changes
            </Button></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Data source</CardTitle><CardDescription>Auto = Supabase, falling back to the published snapshot if Supabase is slow or down.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="inline-flex rounded-lg border border-line p-1" role="radiogroup" aria-label="Data source">
              {(["auto", "supabase", "github"] as const).map((m) => (
                <button key={m} role="radio" aria-checked={s?.source.data === m} onClick={() => setSource(m)}
                  className={`rounded-md px-3 py-1.5 text-sm ${s?.source.data === m ? "bg-violet text-white" : "text-ash hover:text-chrome"}`}>
                  {m === "auto" ? "Auto" : m === "supabase" ? "Supabase only" : "Snapshot only"}
                </button>
              ))}
            </div>
            <p className="text-xs text-ash">If the main admin is down, use the <Link className="underline" to="/admin/emergency">emergency admin</Link>.</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2"><CardContent className="pt-5"><InboxMeter /></CardContent></Card>
      </div>
    </div>
  );
}

function Row({ k, v, href }: { k: string; v: string; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/60 pb-2 last:border-0">
      <span className="text-ash">{k}</span>
      <span className="flex items-center gap-1.5">{v}{href && <a href={href} target="_blank" rel="noreferrer" aria-label="Open run"><ExternalLink className="size-3.5 text-ash" /></a>}</span>
    </div>
  );
}
