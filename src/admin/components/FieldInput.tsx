import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload, X } from "lucide-react";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { mediaUrl } from "@/lib/media";
import { formatBytes } from "@/lib/utils";
import type { FieldDef } from "../resources";
import { db, type AnyRow } from "../db";

type Props = {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  pendingFile?: File | null;
  onFile?: (f: File | null) => void;
  row: AnyRow;
};

export function FieldInput({ field, value, onChange, pendingFile, onFile, row }: Props) {
  const id = `f-${field.name}`;
  const help = "help" in field && field.help ? <p className="text-[11px] text-ash/80">{field.help}</p> : null;

  if (field.type === "bool") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-line px-3 py-2.5">
        <div><Label htmlFor={id} className="text-sm text-chrome">{field.label}</Label>{help}</div>
        <Switch id={id} checked={Boolean(value)} onCheckedChange={onChange} />
      </div>
    );
  }
  if (field.type === "media") return <MediaInput field={field} value={value} pendingFile={pendingFile} onFile={onFile} row={row} />;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{field.label}</Label>
      {field.type === "textarea" ? (
        <Textarea id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value || null)} rows={3} />
      ) : field.type === "select" ? (
        <NativeSelect id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </NativeSelect>
      ) : field.type === "tags" ? (
        <TagsInput id={id} value={(value as string[] | null) ?? []} onChange={onChange} />
      ) : field.type === "brand" ? (
        <BrandSelect id={id} value={(value as string | null) ?? ""} onChange={onChange} />
      ) : (
        <Input id={id} type={field.type === "number" ? "number" : field.type} step="any" placeholder={"placeholder" in field ? field.placeholder : undefined}
          value={value == null ? "" : String(value)}
          onChange={(e) => onChange(field.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value || null)} />
      )}
      {help}
    </div>
  );
}

function TagsInput({ id, value, onChange }: { id: string; value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => { const t = draft.trim(); if (t && !value.includes(t)) onChange([...value, t]); setDraft(""); };
  return (
    <div className="rounded-md border border-line bg-carbon p-2">
      <div className="mb-1 flex flex-wrap gap-1">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded bg-graphite px-2 py-0.5 text-xs">
            {t}<button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}><X className="size-3" /></button>
          </span>
        ))}
      </div>
      <input id={id} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type and press Enter"
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }} onBlur={add}
        className="w-full bg-transparent px-1 text-sm outline-none" />
    </div>
  );
}

function BrandSelect({ id, value, onChange }: { id: string; value: string; onChange: (v: string | null) => void }) {
  const { data } = useQuery({ queryKey: ["admin", "brands-lite"], queryFn: async () => (await db().from("brands").select("id,name").order("sort_order")).data ?? [] });
  return (
    <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">None</option>
      {(data as { id: string; name: string }[] | undefined)?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
    </NativeSelect>
  );
}

function MediaInput({ field, value, pendingFile, onFile, row }: { field: Extract<FieldDef, { type: "media" }>; value: unknown; pendingFile?: File | null; onFile?: (f: File | null) => void; row: AnyRow }) {
  const current = mediaUrl(value as string | null);
  const inInbox = Boolean((row.inbox as Record<string, string> | undefined)?.[field.name]);
  const accept = field.accept === "video" ? "video/*,.mov,.mkv,.m4v" : "image/png,image/jpeg,image/webp,image/svg+xml";
  return (
    <div className="space-y-1.5">
      <Label>{field.label}</Label>
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-line p-3">
        <div className="h-16 w-28 shrink-0 overflow-hidden rounded bg-graphite">
          {current && field.accept === "video" ? (
            <video src={current} muted playsInline preload="metadata" className="h-full w-full object-cover" />
          ) : current ? <img src={current} alt="" className="h-full w-full object-contain" /> : null}
        </div>
        <div className="min-w-0 flex-1 text-xs text-ash">
          {pendingFile ? <p className="truncate text-chrome">{pendingFile.name} · {formatBytes(pendingFile.size)} (uploads on save)</p>
            : inInbox ? <p className="text-amber-300">Uploaded, waiting to publish.</p>
            : current ? <p className="truncate">{String(value)}</p> : <p>Nothing uploaded yet.</p>}
          {field.help && <p>{field.help}</p>}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs hover:bg-graphite">
          <Upload className="size-3.5" /> {current || pendingFile ? "Replace" : "Choose"}
          <input type="file" accept={accept} className="sr-only" onChange={(e) => onFile?.(e.target.files?.[0] ?? null)} />
        </label>
        {pendingFile && <button type="button" className="text-ash hover:text-chrome" aria-label="Clear file" onClick={() => onFile?.(null)}><X className="size-4" /></button>}
      </div>
    </div>
  );
}
