/**
 * Emergency admin API. Zero Supabase dependency for auth: bcrypt password + TOTP, signed httpOnly cookie (2 h),
 * 15-minute lock after 5 failures. Actions: login, logout, session, health, source, maintenance, resync.
 */
import { actionOf, clientIp, err, json, readJson, sameOrigin, envOr } from "../_lib/http.js";
import {
  checkPassword, checkTotp, GLOBAL_MAX_FAILURES, clearCookie, hasEmergencySession, lockState, recordFailure, recordSuccess, sessionCookie, signSession,
} from "../_lib/emergency.js";
import { pingSupabase } from "../_lib/supabase.js";
import { dispatchSync, setMaintenance, setSource, syncStatus, SOURCE_MODES, type SourceFile } from "../_lib/github.js";

export async function GET(req: Request) {
  const action = actionOf(req);
  if (action === "session") return json({ authenticated: hasEmergencySession(req), configured: configured() });
  if (!hasEmergencySession(req)) return err(401, "Sign in first.");
  if (action === "health") {
    const [supabase, status] = await Promise.all([pingSupabase(), syncStatus().catch((e: Error) => ({ error: e.message }))]);
    return json({ supabase, ...status });
  }
  return err(404, "Unknown action");
}

export async function POST(req: Request) {
  const action = actionOf(req);
  if (!sameOrigin(req)) return err(403, "Bad origin");

  if (action === "login") {
    if (!configured()) return err(503, "Emergency admin isn't set up yet (missing EMERGENCY_* variables).");
    const ip = clientIp(req);
    for (const key of [`ip:${ip}`, "global"]) {
      const s = lockState(key);
      if (s.locked) return err(429, `Too many attempts. Try again in ${Math.ceil(s.retryAfterS / 60)} min.`, { "Retry-After": String(s.retryAfterS) });
    }
    const body = await readJson<{ password: string; code: string }>(req);
    const ok = (await checkPassword(String(body.password ?? ""))) && checkTotp(String(body.code ?? ""));
    if (!ok) {
      recordFailure(`ip:${ip}`);
      recordFailure("global", Date.now(), GLOBAL_MAX_FAILURES);
      return err(401, "Wrong password or code.");
    }
    recordSuccess(`ip:${ip}`);
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(signSession(envOr("EMERGENCY_SESSION_SECRET")!)) });
  }
  if (action === "logout") return json({ ok: true }, 200, { "Set-Cookie": clearCookie() });

  if (!hasEmergencySession(req)) return err(401, "Sign in first.");
  try {
    if (action === "source") {
      const { data } = await readJson<{ data: SourceFile["data"] }>(req);
      if (!data || !SOURCE_MODES.includes(data)) return err(400, "data must be auto, github or supabase");
      return json({ ok: true, source: await setSource(data) });
    }
    if (action === "maintenance") {
      const b = await readJson<{ enabled: boolean; message: string }>(req);
      const msg = typeof b.message === "string" ? b.message.slice(0, 300) : null;
      return json({ ok: true, maintenance: await setMaintenance(Boolean(b.enabled), msg) });
    }
    if (action === "resync") {
      await dispatchSync({});
      return json({ ok: true });
    }
  } catch (e) {
    return err(502, e instanceof Error ? e.message : "GitHub request failed");
  }
  return err(404, "Unknown action");
}

function configured() {
  return Boolean(envOr("EMERGENCY_PASSWORD_HASH") && envOr("EMERGENCY_TOTP_SECRET") && envOr("EMERGENCY_SESSION_SECRET"));
}
