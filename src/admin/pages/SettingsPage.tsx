import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { normalizeSettings } from "@/data/normalize";
import type { SiteSettings, SiteSettingsRow, Stat, Tool, SiteCopy } from "@/data/types";
import { db } from "../db";
import { scheduleManifestRefresh } from "../api";

function useSettings() {
  return useQuery({
    queryKey: ["admin", "site_settings"],
    queryFn: async () => {
      const { data, error } = await db().from("site_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw new Error(error.message);
      return normalizeSettings(data as SiteSettingsRow | null);
    },
  });
}

async function saveSettings(patch: Partial<SiteSettings>) {
  const { error } = await db().from("site_settings").upsert({ id: 1, ...patch });
  if (error) throw new Error(error.message);
  scheduleManifestRefresh(1500);
}

function useDraft() {
  const qc = useQueryClient();
  const { data } = useSettings();
  const [draft, setDraft] = useState<SiteSettings | null>(null);
  useEffect(() => { if (data) setDraft(data); }, [data]);
  const save = async (patch: Partial<SiteSettings>) => {
    try { await saveSettings(patch); toast.success("Saved. Live within a minute."); qc.invalidateQueries({ queryKey: ["admin", "site_settings"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save"); }
  };
  return { draft, setDraft, save };
}

const Field = ({ label, children, help }: { label: string; children: React.ReactNode; help?: string }) => (
  <div className="space-y-1.5"><Label>{label}</Label>{children}{help && <p className="text-[11px] text-ash">{help}</p>}</div>
);

export function SettingsPage() {
  const { draft, setDraft, save } = useDraft();
  if (!draft) return <p className="text-ash">Loading…</p>;
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setDraft({ ...draft, [k]: v });
  const text = (k: keyof SiteSettings, label: string, area = false, help?: string) => (
    <Field label={label} help={help}>
      {area ? <Textarea value={String(draft[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} />
        : <Input value={String(draft[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} />}
    </Field>
  );
  const copy = draft.copy;
  const setCopy = (section: keyof SiteCopy, key: string, v: string) => set("copy", { ...copy, [section]: { ...copy[section], [key]: v } } as SiteCopy);

  return (
    <div className="space-y-6">
      <h1 className="font-body text-2xl font-semibold tracking-normal">Site settings</h1>

      <Card className={draft.maintenance ? "border-amber-500/50" : ""}>
        <CardHeader><CardTitle>Maintenance mode</CardTitle><CardDescription>Shows a holding page to visitors. You still see the site while signed in.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3"><Switch checked={draft.maintenance} onCheckedChange={(v) => { set("maintenance", v); void save({ maintenance: v, maintenance_message: draft.maintenance_message }); }} /><span className="text-sm">{draft.maintenance ? "On" : "Off"}</span></div>
          {text("maintenance_message", "Message")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hero and contact</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {text("hero_headline", "Headline")}
          {text("tagline", "Tagline")}
          <div className="md:col-span-2">{text("hero_sub", "Intro line", true)}</div>
          {text("hero_cta_primary", "Primary button")}
          {text("hero_cta_secondary", "Secondary button")}
          <div className="md:col-span-2">{text("credit_line", "Credit line under the buttons")}</div>
          {text("contact_email", "Contact email")}
          {text("whatsapp", "WhatsApp number", false, "International format, digits only, e.g. 2348012345678")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>SEO</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          {text("seo_title", "Page title")}
          {text("seo_description", "Description", true)}
          {text("og_image_url", "Social share image URL (1200×630)")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Section copy</CardTitle><CardDescription>Headlines and short lines for each section.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><Field label="Manifesto (six lines, one per row: the animation follows them line by line)"><Textarea rows={6} value={copy.manifesto.text} onChange={(e) => setCopy("manifesto", "text", e.target.value)} /></Field></div>
          {([["premium", "Premium samples"], ["crafts", "Two crafts"], ["beforeAfter", "Before / After"], ["library", "Work library"], ["process", "Process"], ["toolkit", "Toolkit"], ["proof", "Proof"], ["services", "Services"], ["faq", "FAQ"], ["finale", "Finale"]] as const).map(([k, label]) => (
            <Field key={k} label={`${label}: headline`}><Input value={(copy[k] as { headline: string }).headline} onChange={(e) => setCopy(k, "headline", e.target.value)} /></Field>
          ))}
          <Field label="Premium: sub"><Input value={copy.premium.sub} onChange={(e) => setCopy("premium", "sub", e.target.value)} /></Field>
          <Field label="Before/After: sub"><Input value={copy.beforeAfter.sub} onChange={(e) => setCopy("beforeAfter", "sub", e.target.value)} /></Field>
          <Field label="Library: sub"><Input value={copy.library.sub} onChange={(e) => setCopy("library", "sub", e.target.value)} /></Field>
          <Field label="Toolkit: sub"><Input value={copy.toolkit.sub} onChange={(e) => setCopy("toolkit", "sub", e.target.value)} /></Field>
          <Field label="Crafts: AI Video line"><Textarea value={copy.crafts.ai} onChange={(e) => setCopy("crafts", "ai", e.target.value)} /></Field>
          <Field label="Crafts: Video Editing line"><Textarea value={copy.crafts.editing} onChange={(e) => setCopy("crafts", "editing", e.target.value)} /></Field>
          <Field label="Finale button"><Input value={copy.finale.cta} onChange={(e) => setCopy("finale", "cta", e.target.value)} /></Field>
          <div className="space-y-2 md:col-span-2">
            <Label>Process steps</Label>
            {copy.process.steps.map((st, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[200px_1fr]">
                <Input value={st.title} aria-label={`Step ${i + 1} title`} onChange={(e) => set("copy", { ...copy, process: { ...copy.process, steps: copy.process.steps.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) } })} />
                <Input value={st.text} aria-label={`Step ${i + 1} text`} onChange={(e) => set("copy", { ...copy, process: { ...copy.process, steps: copy.process.steps.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) } })} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button size="lg" onClick={() => save({
          hero_headline: draft.hero_headline, hero_sub: draft.hero_sub, hero_cta_primary: draft.hero_cta_primary, hero_cta_secondary: draft.hero_cta_secondary,
          credit_line: draft.credit_line, tagline: draft.tagline, contact_email: draft.contact_email || null, whatsapp: draft.whatsapp || null,
          seo_title: draft.seo_title, seo_description: draft.seo_description, og_image_url: draft.og_image_url || null,
          maintenance_message: draft.maintenance_message, copy: draft.copy,
        })}>Save settings</Button>
      </div>
    </div>
  );
}

export function StatsToolsPage() {
  const { draft, setDraft, save } = useDraft();
  if (!draft) return <p className="text-ash">Loading…</p>;
  const stats = draft.stats, tools = draft.tools;
  const setStats = (s: Stat[]) => setDraft({ ...draft, stats: s });
  const setTools = (t: Tool[]) => setDraft({ ...draft, tools: t });
  return (
    <div className="space-y-6">
      <h1 className="font-body text-2xl font-semibold tracking-normal">Stats and tools</h1>
      <Card>
        <CardHeader><CardTitle>Proof stats</CardTitle><CardDescription>Four numbers that roll like timecode. Untick “placeholder” once a number is real.</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {stats.map((s, i) => (
            <div key={i} className="grid items-center gap-2 md:grid-cols-[1fr_110px_80px_80px_auto_auto]">
              <Input aria-label="Label" value={s.label} onChange={(e) => setStats(stats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <Input aria-label="Value" type="number" value={s.value} onChange={(e) => setStats(stats.map((x, j) => (j === i ? { ...x, value: Number(e.target.value) } : x)))} />
              <Input aria-label="Prefix" placeholder="prefix" value={s.prefix ?? ""} onChange={(e) => setStats(stats.map((x, j) => (j === i ? { ...x, prefix: e.target.value } : x)))} />
              <Input aria-label="Suffix" placeholder="suffix" value={s.suffix ?? ""} onChange={(e) => setStats(stats.map((x, j) => (j === i ? { ...x, suffix: e.target.value } : x)))} />
              <label className="flex items-center gap-2 text-xs text-ash"><Switch checked={Boolean(s.todo)} onCheckedChange={(v) => setStats(stats.map((x, j) => (j === i ? { ...x, todo: v } : x)))} /> placeholder</label>
              <Button size="icon" variant="ghost" aria-label="Remove stat" onClick={() => setStats(stats.filter((_, j) => j !== i))}><Trash2 /></Button>
            </div>
          ))}
          <Button size="sm" variant="secondary" onClick={() => setStats([...stats, { key: `stat-${Date.now()}`, label: "New stat", value: 0 }])}><Plus /> Add stat</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Toolkit</CardTitle><CardDescription>Chips in the two marquees.</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {tools.map((t, i) => (
            <div key={i} className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
              <Input aria-label="Tool name" value={t.name} onChange={(e) => setTools(tools.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <NativeSelect aria-label="Group" value={t.group} onChange={(e) => setTools(tools.map((x, j) => (j === i ? { ...x, group: e.target.value } : x)))}>
                <option value="generative">Generative</option><option value="finishing">Finishing</option>
              </NativeSelect>
              <Button size="icon" variant="ghost" aria-label="Remove tool" onClick={() => setTools(tools.filter((_, j) => j !== i))}><Trash2 /></Button>
            </div>
          ))}
          <Button size="sm" variant="secondary" onClick={() => setTools([...tools, { name: "", group: "generative" }])}><Plus /> Add tool</Button>
        </CardContent>
      </Card>
      <div className="flex justify-end"><Button size="lg" onClick={() => save({ stats: draft.stats, tools: draft.tools.filter((t) => t.name.trim()) })}>Save</Button></div>
    </div>
  );
}
