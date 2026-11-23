import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress as Bar } from "@/components/ui/progress";
import { FieldInput } from "./FieldInput";
import type { Resource } from "../resources";
import { saveResource, type Progress } from "../save";
import { PosterPanel } from "./PosterPanel";
import { isVideoFile, COMPRESS_THRESHOLD_BYTES } from "../compressVideo";
import type { AnyRow } from "../db";

const STAGE: Record<Progress["stage"], string> = { checking: "Checking space…", saving: "Saving…", compressing: "Compressing video…", uploading: "Uploading…", publishing: "Starting publish…", done: "Done" };

export function ResourceEditor({ res, row, open, onOpenChange, onSaved }: { res: Resource; row: AnyRow | null; open: boolean; onOpenChange: (o: boolean) => void; onSaved: (r: AnyRow) => void }) {
  const [draft, setDraft] = useState<AnyRow>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [progress, setProgress] = useState<Progress | null>(null);
  const [compress, setCompress] = useState(false);
  const bigVideo = Object.values(files).some((f) => isVideoFile(f) && f.size > COMPRESS_THRESHOLD_BYTES);
  const busy = progress !== null && progress.stage !== "done";

  useEffect(() => {
    if (open) { setDraft(row ?? res.defaults?.() ?? {}); setFiles({}); setProgress(null); }
  }, [open, row, res]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    for (const f of res.fields) {
      if ("required" in f && f.required && !draft[f.name]) return toast.error(`${f.label} is required.`);
    }
    try {
      if (res.table === "projects" && typeof draft.caption === "string" && draft.caption.length > 120) return toast.error("Keep the caption to one line (about 90 characters).");
      const saved = await saveResource(res, draft, files, setProgress, { compress, original: row });
      toast.success(Object.keys(files).length ? "Saved. Video is publishing (a few minutes)." : "Saved.");
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setProgress(null);
      toast.error(err instanceof Error ? err.message : "Couldn't save.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent>
        <DialogTitle>{row ? `Edit ${res.singular}` : `New ${res.singular}`}</DialogTitle>
        <DialogDescription className="sr-only">Edit the fields and save.</DialogDescription>
        <form onSubmit={onSubmit} className="space-y-4">
          {res.fields.map((f) => (
            <FieldInput key={f.name} field={f} row={draft} value={draft[f.name]} onChange={(v) => setDraft((d) => ({ ...d, [f.name]: v }))}
              pendingFile={files[f.name]} onFile={(file) => setFiles((m) => { const n = { ...m }; if (file) n[f.name] = file; else delete n[f.name]; return n; })} />
          ))}
          {row && res.table === "projects" && Boolean(row.video_url) && <PosterPanel res={res} row={row} onQueued={() => { onSaved(row); onOpenChange(false); }} />}
          {bigVideo && (
            <label className="flex items-start gap-2 rounded-lg border border-line p-3 text-sm">
              <input type="checkbox" className="mt-1 accent-violet" checked={compress} onChange={(e) => setCompress(e.target.checked)} />
              <span><b>Compress before upload (faster)</b><br /><span className="text-xs text-ash">Off = the original uploads in 45 MB pieces with no quality loss (recommended). On = your browser shrinks it first.</span></span>
            </label>
          )}
          {progress && (
            <div className="space-y-1.5 rounded-lg border border-line p-3 text-xs" role="status">
              <p>{STAGE[progress.stage]} {progress.note && <span className="text-ash">· {progress.note}</span>}</p>
              {progress.ratio !== undefined && <Bar value={progress.ratio * 100} />}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Working…" : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
