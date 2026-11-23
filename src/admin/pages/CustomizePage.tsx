import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { HOME_SECTIONS, DEFAULT_ORDER, orderedSections, type Layout, type SectionKey } from "@/data/layout";
import { db } from "../db";
import { scheduleManifestRefresh } from "../api";
import { SortableList } from "../components/SortableList";

const META = Object.fromEntries(HOME_SECTIONS.map((s) => [s.key, s]));

/** Website customization: drag the home page sections into any order and switch them on or off. */
export default function CustomizePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "layout"],
    queryFn: async () => ((await db().from("site_settings").select("layout").eq("id", 1).maybeSingle()).data?.layout ?? {}) as Layout,
  });
  const [order, setOrder] = useState<SectionKey[]>(DEFAULT_ORDER);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) { setOrder(orderedSections(data)); setHidden(new Set(data.hidden ?? [])); setDirty(false); } }, [data]);

  async function save() {
    setBusy(true);
    const layout: Layout = { order, hidden: [...hidden] };
    const { error } = await db().from("site_settings").update({ layout }).eq("id", 1);
    setBusy(false);
    if (error) return toast.error(error.message);
    scheduleManifestRefresh(1000);
    setDirty(false);
    qc.invalidateQueries({ queryKey: ["admin", "layout"] });
    toast.success("Saved. The home page uses the new order within a minute (reload to see it).");
  }

  const fixed = (label: string) => (
    <div className="flex items-center gap-3 rounded-lg border border-dashed border-line px-4 py-3 text-sm text-ash"><Lock className="size-4" /> {label} <span className="ml-auto text-xs">always here</span></div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-body text-2xl font-semibold tracking-normal">Website customization</h1>
          <p className="mt-1 max-w-2xl text-sm text-ash">Drag the home page sections into the order you want and switch any off. The hero always comes first and the footer last.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => { setOrder(DEFAULT_ORDER); setHidden(new Set()); setDirty(true); }}><RotateCcw /> Default order</Button>
          <Button onClick={save} disabled={!dirty || busy}>{busy ? "Saving…" : dirty ? "Save order" : "Saved"}</Button>
        </div>
      </div>
      {isLoading ? <p className="text-ash">Loading…</p> : (
        <div className="space-y-2">
          {fixed("Hero")}
          <SortableList items={order} getId={(k) => k} onReorder={(ids) => { setOrder(ids as SectionKey[]); setDirty(true); }}
            render={(k) => {
              const off = hidden.has(k);
              return (
                <div className={`flex items-center gap-3 ${off ? "opacity-50" : ""}`}>
                  <span className="timecode w-6 text-xs text-magenta">{String(order.indexOf(k) + 1).padStart(2, "0")}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{META[k]?.label ?? k}</p>
                    <p className="truncate text-xs text-ash">{META[k]?.hint}</p>
                  </div>
                  {off ? <EyeOff className="size-4 text-ash" /> : <Eye className="size-4 text-ash" />}
                  <Switch checked={!off} aria-label={`Show ${META[k]?.label ?? k}`} onCheckedChange={(v) => { setHidden((h) => { const n = new Set(h); if (v) n.delete(k); else n.add(k); return n; }); setDirty(true); }} />
                </div>
              );
            }} />
          {fixed("Footer")}
        </div>
      )}
    </div>
  );
}
