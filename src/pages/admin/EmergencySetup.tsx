/**
 * One-time emergency-login setup, entirely in the browser.
 * Step 1: setup code -> QR code for the authenticator app. Step 2: password + 6-digit code -> values to paste into Vercel.
 * The server refuses once the EMERGENCY_* values exist (the page locks itself).
 */
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { Check, Copy } from "lucide-react";
import { XperienceLogo } from "@/components/brand/XperienceLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type State = "loading" | "open" | "locked" | "no-code" | "offline";
type Values = Record<"EMERGENCY_PASSWORD_HASH" | "EMERGENCY_TOTP_SECRET" | "EMERGENCY_SESSION_SECRET", string>;

async function post<T>(action: string, body: unknown): Promise<T> {
  const r = await fetch(`/api/emergency/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error((j as { error?: string } | null)?.error ?? `HTTP ${r.status}`);
  return j as T;
}

export default function EmergencySetup() {
  const [state, setState] = useState<State>("loading");
  const [setupCode, setSetupCode] = useState("");
  const [totp, setTotp] = useState<{ secret: string; qr: string } | null>(null);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [code, setCode] = useState("");
  const [values, setValues] = useState<Values | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Emergency login setup | Xperience";
    fetch("/api/emergency/setup-status").then((r) => r.json()).then((j) => setState(j.setup)).catch(() => setState("offline"));
  }, []);

  async function begin(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const r = await post<{ secret: string; uri: string }>("setup-begin", { setupCode });
      setTotp({ secret: r.secret, qr: await QRCode.toDataURL(r.uri, { margin: 1, width: 240, color: { dark: "#07060D", light: "#E6E8EE" } }) });
    } catch (err) { setMsg(err instanceof Error ? err.message : "Failed"); } finally { setBusy(false); }
  }

  async function finish(e: FormEvent) {
    e.preventDefault(); setMsg(null);
    if (password !== password2) return setMsg("The two passwords don't match.");
    setBusy(true);
    try { setValues((await post<{ values: Values }>("setup-finish", { setupCode, password, secret: totp!.secret, code })).values); }
    catch (err) { setMsg(err instanceof Error ? err.message : "Failed"); } finally { setBusy(false); }
  }

  return (
    <main className="min-h-dvh bg-void px-4 py-10 font-body text-chrome">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="flex items-center gap-3">
          <XperienceLogo variant="mark" className="size-10" />
          <div><h1 className="font-body text-xl font-semibold tracking-normal">Emergency login setup</h1><p className="text-xs text-ash">One time only. This page locks itself afterwards.</p></div>
        </header>

        {state === "loading" && <p className="text-ash">Checking…</p>}
        {state === "offline" && <p className="text-amber-300">The server functions aren't reachable here. Open this page on your Vercel preview link.</p>}
        {state === "locked" && <p className="rounded-xl border border-line bg-carbon p-5">Emergency login is already set up, so this page is locked. Sign in at <Link className="underline" to="/admin/emergency">/admin/emergency</Link>.</p>}
        {state === "no-code" && <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 text-amber-100">Add <code>EMERGENCY_SETUP_CODE</code> in Vercel (Settings &gt; Environment Variables), redeploy, then reload this page.</p>}

        {state === "open" && !totp && (
          <form onSubmit={begin} className="space-y-4 rounded-2xl border border-line bg-carbon p-6">
            <p className="text-sm text-ash">Step 1 of 2. Type the setup code you added in Vercel.</p>
            <div className="space-y-1.5"><Label htmlFor="sc">Setup code</Label><Input id="sc" autoComplete="off" required value={setupCode} onChange={(e) => setSetupCode(e.target.value)} /></div>
            {msg && <p role="alert" className="text-sm text-rose-300">{msg}</p>}
            <Button type="submit" disabled={busy}>{busy ? "Checking…" : "Continue"}</Button>
          </form>
        )}

        {state === "open" && totp && !values && (
          <form onSubmit={finish} className="space-y-5 rounded-2xl border border-line bg-carbon p-6">
            <p className="text-sm text-ash">Step 2 of 2. In your authenticator app (Google Authenticator, Authy or 1Password), tap <b>+</b> and scan this code.</p>
            <img src={totp.qr} alt="QR code for your authenticator app" className="mx-auto rounded-lg" width={240} height={240} />
            <p className="break-all text-center text-xs text-ash">Can't scan? Type this key: <span className="font-mono text-chrome">{totp.secret}</span></p>
            <div className="space-y-1.5"><Label htmlFor="pw">Choose an emergency password (at least 14 characters)</Label><Input id="pw" type="password" autoComplete="new-password" required minLength={14} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="pw2">Type it again</Label><Input id="pw2" type="password" autoComplete="new-password" required value={password2} onChange={(e) => setPassword2(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="otp">6-digit code your app shows now</Label><Input id="otp" inputMode="numeric" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></div>
            {msg && <p role="alert" className="text-sm text-rose-300">{msg}</p>}
            <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create my emergency login"}</Button>
          </form>
        )}

        {values && (
          <section className="space-y-5 rounded-2xl border border-violet/50 bg-carbon p-6">
            <h2 className="font-body text-lg font-semibold tracking-normal">Last step: paste these into Vercel</h2>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-chrome/90">
              <li>Vercel &gt; your project &gt; <b>Settings</b> &gt; <b>Environment Variables</b>.</li>
              <li>Add each of the three below (All Environments, <b>Sensitive</b> on). Use the copy buttons.</li>
              <li>Delete <code>EMERGENCY_SETUP_CODE</code> (it's no longer needed).</li>
              <li><b>Deployments</b> &gt; the newest <i>build</i> deployment &gt; <b>⋯</b> &gt; <b>Redeploy</b>.</li>
            </ol>
            {(Object.keys(values) as (keyof Values)[]).map((k) => <CopyRow key={k} name={k} value={values[k]} />)}
            <p className="text-xs text-amber-200">These values are only shown here, once. Keep this tab open until they're saved in Vercel. Your password and authenticator app are what you'll use to sign in at /admin/emergency.</p>
          </section>
        )}
      </div>
    </main>
  );
}

function CopyRow({ name, value }: { name: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="space-y-1">
      <p className="font-mono text-xs text-ash">{name}</p>
      <div className="flex gap-2">
        <input readOnly value={value} className="min-w-0 flex-1 rounded-md border border-line bg-void px-2 py-1.5 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} aria-label={name} />
        <Button type="button" size="sm" variant="secondary" onClick={() => { void navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }}>
          {done ? <Check /> : <Copy />} {done ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
