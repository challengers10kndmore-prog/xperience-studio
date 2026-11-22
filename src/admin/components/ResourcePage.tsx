import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, RotateCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { db, type AnyRow } from "../db";
import type { Resource } from "../resources";
import { deleteResource, retryPublish, saveOrder } from "../save";
import { scheduleManifestRefresh } from "../api";
import { liveState, StatusBadge } from "./StatusBadge";
import { MediaThumb } from "./MediaThumb";
import { ResourceEditor } from "./ResourceEditor";
import { SortableList } from "./SortableList";

export function useRows(res: Resource) {
  return useQuery({
    queryKey: ["admin", res.table],
    queryFn: async () => {
      const q = db().from(res.table).select("*");
      const { data, error } = res.sortable ? await q.order("sort_order").order("created_at", { ascending: false }) : await q.order(res.pk);
      if (error) throw new Error(error.message);
      return data as AnyRow[];
    },
    refetchInterval: (q) => ((q.state.data as AnyRow[] | undefined)?.some((r) => r.media_status === "pending") ? 15_000 : false),
  });
}

export function ResourcePage({ res, filter, toolbar, header }: { res: Resource; filter?: (r: AnyRow) => boolean; toolbar?: ReactNode; header?: ReactNode }) {
  const qc = useQueryClient();
  const { data = [], isLoading, error } = useRows(res);
  const [editing, setEditing] = useState<AnyRow | null>(null);
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => (filter ? data.filter(filter) : data), [data, filter]);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", res.table] });

  const togglePublished = async (r: AnyRow, v: boolean) => {
    const { error: e } = await db().from(res.table).update({ published: v }).eq(res.pk, String(r[res.pk]));
    if (e) toast.error(e.message); else { scheduleManifestRefresh(); refresh(); }
  };

  const item = (r: AnyRow) => {
    const s = res.summary(r);
    const state = liveState(res.table, res.pk, r);
    return (
      <div className="flex items-center gap-3">
        {res.hasMedia && <MediaThumb src={s.thumb} />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{s.primary}</p>
          {s.secondary && <p className="truncate text-xs text-ash">{s.secondary}</p>}
        </div>
        {res.hasMedia && <StatusBadge state={state} title={r.media_error as string | undefined} />}
        {state === "failed" && (
          <Button size="sm" variant="ghost" title={String(r.media_error ?? "")} onClick={async () => { try { await retryPublish(res, r); toast.success("Retrying…"); refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Retry failed"); } }}>
            <RotateCw /> Retry
          </Button>
        )}
        {"published" in r && <Switch checked={Boolean(r.published)} onCheckedChange={(v) => togglePublished(r, v)} aria-label="Published" />}
        <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => { setEditing(r); setOpen(true); }}><Pencil /></Button>
        {res.canDelete && (
          <Button size="icon" variant="ghost" aria-label="Delete" onClick={async () => {
            if (!confirm(`Delete this ${res.singular}? This can't be undone.`)) return;
            try { await deleteResource(res, r); toast.success("Deleted."); refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
          }}><Trash2 /></Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-body text-2xl font-semibold tracking-normal">{res.title}</h1>
          {res.description && <p className="mt-1 max-w-2xl text-sm text-ash">{res.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {toolbar}
          {res.canCreate && <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus /> New {res.singular}</Button>}
        </div>
      </div>
      {header}
      {error && <p className="text-sm text-rose-300">{(error as Error).message}</p>}
      {isLoading ? <p className="text-sm text-ash">Loading…</p> : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-ash">Nothing here yet.</p>
      ) : res.sortable && !filter ? (
        <SortableList items={rows} getId={(r) => String(r[res.pk])} render={item}
          onReorder={async (ids) => {
            qc.setQueryData(["admin", res.table], ids.map((id) => rows.find((r) => String(r[res.pk]) === id)!));
            await saveOrder(res, ids); toast.success("Order saved.");
          }} />
      ) : (
        <ul className="space-y-2">{rows.map((r) => <li key={String(r[res.pk])} className="rounded-lg border border-line bg-carbon p-2">{item(r)}</li>)}</ul>
      )}
      <ResourceEditor res={res} row={editing} open={open} onOpenChange={setOpen} onSaved={() => refresh()} />
    </div>
  );
}
