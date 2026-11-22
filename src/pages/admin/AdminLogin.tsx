import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSupabase } from "@/lib/supabase";
import { checkIsAdmin } from "@/admin/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { XperienceLogo } from "@/components/brand/XperienceLogo";

type Mode = "login" | "forgot" | "set-password";

export default function AdminLogin() {
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Admin login | Xperience";
    const sb = getSupabase();
    if (/type=(recovery|invite)/.test(window.location.hash)) setMode("set-password");
    const { data } = sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("set-password");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const sb = getSupabase();
    try {
      if (mode === "login") {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!(await checkIsAdmin(data.user.id))) {
          await sb.auth.signOut();
          throw new Error("This account isn't an admin. Ask for access, then try again.");
        }
        nav("/admin", { replace: true });
      } else if (mode === "forgot") {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/admin/login` });
        if (error) throw error;
        setMsg({ tone: "ok", text: "If that's the admin email, a link is on its way. Open it on this device to choose your password (check spam too)." });
      } else {
        if (password.length < 10) throw new Error("Use at least 10 characters.");
        if (password !== password2) throw new Error("The two passwords don't match.");
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw error;
        setMsg({ tone: "ok", text: "Password saved. Taking you to the admin…" });
        setTimeout(() => nav("/admin", { replace: true }), 900);
      }
    } catch (err) {
      setMsg({ tone: "err", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-void px-4 font-body">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-2xl border border-line bg-carbon p-8">
        <XperienceLogo variant="mark" className="mx-auto h-16 w-16" />
        <h1 className="text-center font-body text-xl font-semibold tracking-normal">
          {mode === "login" ? "Admin sign in" : mode === "forgot" ? "Set or reset your password" : "Choose your password"}
        </h1>
        {mode !== "set-password" && (
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        )}
        {mode !== "forgot" && (
          <div className="space-y-1.5">
            <Label htmlFor="password">{mode === "set-password" ? "New password" : "Password"}</Label>
            <Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        )}
        {mode === "set-password" && (
          <div className="space-y-1.5">
            <Label htmlFor="password2">Repeat new password</Label>
            <Input id="password2" type="password" autoComplete="new-password" required value={password2} onChange={(e) => setPassword2(e.target.value)} />
          </div>
        )}
        {msg && <p role="status" className={msg.tone === "ok" ? "text-sm text-emerald-300" : "text-sm text-rose-300"}>{msg.text}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : mode === "forgot" ? "Send reset link" : "Save password"}
        </Button>
        <div className="flex justify-between text-xs text-ash">
          {mode === "login" ? (
            <button type="button" className="hover:text-chrome" onClick={() => setMode("forgot")}>Set or forgot password?</button>
          ) : (
            <button type="button" className="hover:text-chrome" onClick={() => setMode("login")}>Back to sign in</button>
          )}
          <Link to="/admin/emergency" className="hover:text-chrome">Emergency admin</Link>
        </div>
      </form>
    </main>
  );
}
