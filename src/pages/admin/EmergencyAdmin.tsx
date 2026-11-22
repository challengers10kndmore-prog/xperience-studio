/**
 * Emergency admin. Zero Supabase dependency: talks only to /api/emergency/*, which uses bcrypt + TOTP,
 * a signed httpOnly cookie, and the GitHub API. Use it when Supabase or the main admin is down.
 */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { XperienceLogo } from "@/components/brand/XperienceLogo";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Run = { status: string; conclusion: string | null; updated_at: string; html_url: string } | null;
type Health = {
  supabase: { ok: boolean; status: number; latencyMs: number; error: string | null };
  lastSync?: Run; lastKeepAlive?: Run; manifestGeneratedAt?: string | null; keepAliveAt?: string | null;
  source?: { data: "auto" | "github" | "supabase"; maintenance?: { enabled: boolean; message: string | null } };
  error?: string;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/emergency/${path}`, { credentials: "same-origin", headers: { "Content-Type": "application/json" }, ...init });
  let body: unknown = null;
  try { body = await res.json(); } catch { /* ignore */ }
  if (!res.ok) throw new Error((body as { error?: string } | null)?.error ?? (res.status === 404 ? "Server functions aren't running here (they run on Vercel)." : `HTTP ${res.status}`));
  return body as T;
}

const ago = (iso?: string | null) => (iso ? `${new Date(iso).toLocaleString()}` : "never");

export default function EmergencyAdmin() {
  const [session, setSession] = useState<{ authenticated: boolean; configured: boolean } | null>(null);
  useEffect(() => {
    document.title = "Emergency admin | Xperience";
    api<{ authenticated: boolean; configured: boolean }>("session").then(setSession).catch(() => setSession({ authenticated: false, configured: true }));
  }, []);
  return (
    <main className="min-h-dvh bg-void px-4 py-10 font-body text-chrome">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center gap-3">
          <XperienceLogo variant="mark" className="size-10" />
          <div><h1 className="font-body text-xl font-semibold tracking-normal">Emergency admin</h1><p className="text-xs text-ash">Works even if Supabase is down.</p></div>
        </header>
        {!session ? <p className="text-ash">Checking…</p> : session.authenticated ? <Dashboard onLogout={() => setSession({ ...session, authenticated: false })} /> : <Login configured={session.configured} onDone={() => setSession({ ...session, authenticated: true })} />}
        <p className="text-xs text-ash"><Link to="/admin" className="underline">Main admin</Link></p>
      </div>
    </main>
  );
}

function Login({ onDone, configured }: { onDone: () => void; configured: boolean }) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try { await api("login", { method: "POST", body: JSON.stringify({ password, code }) }); onDone(); }
    catch (err) { setMsg(err instanceof Error ? err.message : "Failed"); }
    finally { setBusy(false); setCode(""); }
  }
  return (
    <form onSubmit={submit} className="max-w-sm space-y-4 rounded-2xl border border-line bg-carbon p-6">
      {!configured && <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">Not set up yet. <Link className="underline" to="/admin/emergency/setup">Set up your emergency login</Link>.</p>}
      <div className="space-y-1.5"><Label htmlFor="ep">Emergency password</Label><Input id="ep" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="ec">6-digit code from your authenticator app</Label>
        <Input id="ec" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></div>
      {msg && <p role="alert" className="text-sm text-rose-300">{msg}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Checking…" : "Sign in"}</Button>
    </form>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [h, setH] = useState<Health | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [mMsg, setMMsg] = useState("");
  const load = useCallback(() => api<Health>("health").then((x) => { setH(x); setMMsg(x.source?.maintenance?.message ?? ""); }).catch((e) => setNote(e.message)), []);
  useEffect(() => { void load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);
  const act = async (path: string, body: unknown, ok: string) => {
    setNote(null);
    try { await api(path, { method: "POST", body: JSON.stringify(body) }); setNote(ok); void load(); } catch (e) { setNote(e instanceof Error ? e.message : "Failed"); }
  };
  const src = h?.source?.data ?? "auto";
  const maint = Boolean(h?.source?.maintenance?.enabled);
  return (
    <div className="space-y-5">
      {note && <p role="status" className="rounded-md border border-line bg-carbon p-3 text-sm">{note}</p>}
      <section className="rounded-2xl border border-line bg-carbon p-5">
        <h2 className="mb-3 font-body text-base font-semibold tracking-normal">Health</h2>
        {!h ? <p className="text-ash">Loading…</p> : (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <dt className="text-ash">Supabase</dt>
            <dd className={h.supabase.ok ? "text-emerald-300" : "text-rose-300"}>{h.supabase.ok ? "Up" : `Down (${h.supabase.error})`} · {h.supabase.latencyMs} ms</dd>
            <dt className="text-ash">Last sync</dt><dd>{h.lastSync ? `${ago(h.lastSync.updated_at)} · ${h.lastSync.conclusion ?? h.lastSync.status}` : "never"}</dd>
            <dt className="text-ash">Last keep-alive</dt><dd>{ago(h.keepAliveAt ?? h.lastKeepAlive?.updated_at)}</dd>
            <dt className="text-ash">Snapshot (manifest.json)</dt><dd>{ago(h.manifestGeneratedAt)}</dd>
            {h.error && <><dt className="text-ash">GitHub</dt><dd className="text-rose-300">{h.error}</dd></>}
          </dl>
        )}
      </section>
      <section className="rounded-2xl border border-line bg-carbon p-5">
        <h2 className="mb-1 font-body text-base font-semibold tracking-normal">Data source</h2>
        <p className="mb-3 text-xs text-ash">If Supabase is down, choose “Snapshot only”. Visitors switch within a minute.</p>
        <div className="inline-flex rounded-lg border border-line p-1" role="radiogroup" aria-label="Data source">
          {(["auto", "supabase", "github"] as const).map((m) => (
            <button key={m} role="radio" aria-checked={src === m} onClick={() => act("source", { data: m }, `Source set to ${m}.`)}
              className={`rounded-md px-3 py-1.5 text-sm ${src === m ? "bg-violet text-white" : "text-ash hover:text-chrome"}`}>{m === "auto" ? "Auto" : m === "supabase" ? "Supabase only" : "Snapshot only"}</button>
          ))}
        </div>
      </section>
      <section className="space-y-3 rounded-2xl border border-line bg-carbon p-5">
        <div className="flex items-center justify-between"><h2 className="font-body text-base font-semibold tracking-normal">Maintenance page</h2>
          <Switch checked={maint} onCheckedChange={(v) => act("maintenance", { enabled: v, message: mMsg }, v ? "Maintenance on." : "Maintenance off.")} aria-label="Maintenance" /></div>
        <Textarea value={mMsg} onChange={(e) => setMMsg(e.target.value)} placeholder="We're polishing a few frames. Back very soon." />
      </section>
      <section className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => act("resync", {}, "Sync started. Check again in a few minutes.")}>Run sync now</Button>
        <Button variant="ghost" onClick={async () => { await api("logout", { method: "POST" }).catch(() => {}); onLogout(); }}>Sign out</Button>
      </section>
    </div>
  );
}
