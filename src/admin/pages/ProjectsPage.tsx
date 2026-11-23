import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { slugify } from "@/lib/utils";
import { ResourcePage, useRows } from "../components/ResourcePage";
import { SortableList } from "../components/SortableList";
import { MediaThumb } from "../components/MediaThumb";
import { resourceByKey, DISCIPLINES } from "../resources";
import { saveOrder, saveResource, type Progress as P } from "../save";
import { isVideoFile, COMPRESS_THRESHOLD_BYTES } from "../compressVideo";
import { ensureInboxRoom } from "../upload";
import { PublishAllButton } from "../components/PublishAllButton";
import type { AnyRow } from "../db";

const res = resourceByKey("projects")!;

export default function ProjectsPage() {
  const [disc, setDisc] = useState<"all" | "ai" | "editing">("all");
  const filter = useCallback((r: AnyRow) => disc === "all" || r.discipline === disc, [disc]);
  return (
    <Tabs defaultValue="all-projects" className="space-y-5">
      <TabsList>
        <TabsTrigger value="all-projects">All projects</TabsTrigger>
        <TabsTrigger value="bulk">Bulk upload</TabsTrigger>
        <TabsTrigger value="premium">Premium order</TabsTrigger>
        <TabsTrigger value="featured">Featured order</TabsTrigger>
      </TabsList>
      <TabsContent value="all-projects">
        <ResourcePage res={res} filter={disc === "all" ? undefined : filter}
          toolbar={<>
            <PublishAllButton />
            <NativeSelect aria-label="Filter by discipline" value={disc} onChange={(e) => setDisc(e.target.value as typeof disc)} className="w-40">
              <option value="all">All disciplines</option>
              {DISCIPLINES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </NativeSelect>
          </>} />
      </TabsContent>
      <TabsContent value="bulk"><BulkUpload /></TabsContent>
      <TabsContent value="premium"><OrderList kind="premium" /></TabsContent>
      <TabsContent value="featured"><OrderList kind="featured" /></TabsContent>
    </Tabs>
  );
}

function OrderList({ kind }: { kind: "premium" | "featured" }) {
  const qc = useQueryClient();
  const { data = [] } = useRows(res);
  const col = kind === "premium" ? "premium_order" : "sort_order";
  const items = data.filter((r) => (kind === "premium" ? r.is_premium : r.is_featured))
    .sort((a, b) => Number(a[col] ?? 999) - Number(b[col] ?? 999));
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-body text-2xl font-semibold tracking-normal">{kind === "premium" ? "Premium samples" : "Featured (hero shards)"}</h1>
        <p className="mt-1 text-sm text-ash">
          {kind === "premium" ? "Drag to set the chapter order. The site shows 3 to 6 premium projects." : "Drag to order. The hero shows 5 to 7 featured videos."}
          {" "}Tick “{kind === "premium" ? "Premium sample" : "Featured"}” on a project to add it here.
        </p>
      </div>
      {kind === "premium" && (items.length < 3 || items.length > 6) && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">You have {items.length} premium project(s). The section looks best with 3 to 6.</p>
      )}
      {items.length === 0 ? <p className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-ash">None yet.</p> : (
        <SortableList items={items} getId={(r) => String(r.id)}
          render={(r) => (
            <div className="flex items-center gap-3"><MediaThumb src={r.poster_url as string} /><div><p className="text-sm font-medium">{String(r.title)}</p><p className="text-xs text-ash">{r.discipline === "ai" ? "AI Video" : "Editing"}</p></div></div>
          )}
          onReorder={async (ids) => {
            qc.setQueryData(["admin", "projects"], (old: AnyRow[] = []) => old.map((r) => (ids.includes(String(r.id)) ? { ...r, [col]: ids.indexOf(String(r.id)) + 1 } : r)));
            await saveOrder(res, ids, col);
            toast.success("Order saved.");
          }} />
      )}
    </div>
  );
}

type Job = { file: File; progress: P | null; error?: string; done?: boolean };

function BulkUpload() {
  const qc = useQueryClient();
  const [discipline, setDiscipline] = useState("ai");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [compress, setCompress] = useState(false);

  const add = (list: FileList | null) => {
    const files = Array.from(list ?? []).filter(isVideoFile);
    if (!files.length) return toast.error("Drop video files (mp4, mov, webm…).");
    setJobs((j) => [...j, ...files.map((file) => ({ file, progress: null }))]);
  };

  async function run() {
    try { await ensureInboxRoom(jobs.filter((j) => !j.done).reduce((s, j) => s + j.file.size, 0)); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Not enough room in the inbox"); return; }
    setRunning(true);
    for (let i = 0; i < jobs.length; i++) {
      if (jobs[i].done) continue;
      const set = (patch: Partial<Job>) => setJobs((all) => all.map((j, k) => (k === i ? { ...j, ...patch } : j)));
      const file = jobs[i].file;
      const title = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
      try {
        await saveResource(res, { title, slug: `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`, discipline, aspect_ratio: "16:9", published: false, tools: [] },
          { video_url: file }, (p) => set({ progress: p }), { compress });
        set({ done: true });
      } catch (e) {
        set({ error: e instanceof Error ? e.message : "Failed" });
      }
    }
    setRunning(false);
    qc.invalidateQueries({ queryKey: ["admin", "projects"] });
    toast.success("Uploads finished. Projects are saved as drafts: add details, then publish.");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-body text-2xl font-semibold tracking-normal">Bulk upload</h1>
        <p className="mt-1 text-sm text-ash">Drop several videos. Each becomes a draft project (title from the file name). Big files are compressed in your browser first.</p>
      </div>
      <div className="flex items-center gap-3">
        <label className="text-sm text-ash" htmlFor="bulk-disc">Discipline</label>
        <NativeSelect id="bulk-disc" className="w-48" value={discipline} onChange={(e) => setDiscipline(e.target.value)}>
          {DISCIPLINES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </NativeSelect>
      </div>
      <label
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition ${over ? "border-violet bg-violet/10" : "border-line"}`}>
        <UploadCloud className="size-8 text-ash" />
        <span className="text-sm">Drop videos here or click to choose</span>
        <input type="file" multiple accept="video/*,.mov,.mkv,.m4v" className="sr-only" onChange={(e) => add(e.target.files)} />
      </label>
      {jobs.length > 0 && (
        <ul className="space-y-2">
          {jobs.map((j, i) => (
            <li key={i} className="rounded-lg border border-line bg-carbon p-3 text-sm">
              <div className="flex justify-between gap-2"><span className="truncate">{j.file.name}</span>
                <span className={j.error ? "text-rose-300" : j.done ? "text-emerald-300" : "text-ash"}>{j.error ?? (j.done ? "Uploaded · publishing" : j.progress ? `${j.progress.stage}${j.progress.ratio !== undefined ? ` ${Math.round(j.progress.ratio * 100)}%` : ""}${j.progress.note?.includes("part") ? ` · ${j.progress.note.split(" · ").pop()}` : ""}` : "Waiting")}</span></div>
              {j.progress?.ratio !== undefined && !j.done && <Progress className="mt-2" value={j.progress.ratio * 100} />}
            </li>
          ))}
        </ul>
      )}
      {jobs.some((j) => j.file.size > COMPRESS_THRESHOLD_BYTES) && (
        <label className="flex items-start gap-2 rounded-lg border border-line p-3 text-sm">
          <input type="checkbox" className="mt-1 accent-violet" checked={compress} onChange={(e) => setCompress(e.target.checked)} disabled={running} />
          <span><b>Compress before upload (faster)</b><br /><span className="text-xs text-ash">Off = originals upload in 45 MB pieces with no quality loss (recommended). Files under 45 MB are never compressed.</span></span>
        </label>
      )}
      <div className="flex gap-2">
        <Button onClick={run} disabled={running || !jobs.some((j) => !j.done)}>{running ? "Uploading…" : `Upload ${jobs.filter((j) => !j.done).length} video(s)`}</Button>
        <Button variant="ghost" onClick={() => setJobs([])} disabled={running}>Clear</Button>
      </div>
    </div>
  );
}
