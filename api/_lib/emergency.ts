import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import * as OTPAuth from "otpauth";
import { envOr } from "./http.js";

export const COOKIE = "xp_emergency";
export const SESSION_TTL_S = 2 * 60 * 60;
export const MAX_FAILURES = 5;
export const LOCK_MS = 15 * 60 * 1000;
/** Instance-wide bar is higher so one attacker can't easily lock Daniel out from every network. */
export const GLOBAL_MAX_FAILURES = 20;

// ---------- signed session cookie ----------
const b64url = (b: Buffer) => b.toString("base64url");

export function signSession(secret: string, now = Date.now()) {
  const exp = Math.floor(now / 1000) + SESSION_TTL_S;
  const payload = `${exp}.${b64url(crypto.randomBytes(12))}`;
  const sig = b64url(crypto.createHmac("sha256", secret).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined, secret: string, now = Date.now()) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [exp, nonce, sig] = parts;
  const expected = b64url(crypto.createHmac("sha256", secret).update(`${exp}.${nonce}`).digest());
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  return Number(exp) * 1000 > now;
}

export function readCookie(req: Request, name = COOKIE) {
  const m = (req.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

export function sessionCookie(token: string) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_S}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export function hasEmergencySession(req: Request) {
  const secret = envOr("EMERGENCY_SESSION_SECRET");
  return Boolean(secret && verifySession(readCookie(req), secret));
}

// ---------- credentials ----------
export async function checkPassword(password: string, hash = envOr("EMERGENCY_PASSWORD_HASH")) {
  if (!hash || !password) return false;
  try { return await bcrypt.compare(password, hash); } catch { return false; }
}

export function checkTotp(code: string, secret = envOr("EMERGENCY_TOTP_SECRET"), timestamp = Date.now()) {
  if (!secret || !/^\d{6}$/.test(code ?? "")) return false;
  const totp = new OTPAuth.TOTP({ issuer: "Xperience", label: "Emergency admin", algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) });
  return totp.validate({ token: code, window: 1, timestamp }) !== null;
}

// ---------- lockout (per IP and global, per function instance) ----------
type Entry = { failures: number; lockedUntil: number };
const attempts = new Map<string, Entry>();

export function lockState(key: string, now = Date.now()) {
  const e = attempts.get(key);
  if (!e) return { locked: false, retryAfterS: 0 };
  if (e.lockedUntil > now) return { locked: true, retryAfterS: Math.ceil((e.lockedUntil - now) / 1000) };
  return { locked: false, retryAfterS: 0 };
}

export function recordFailure(key: string, now = Date.now(), max = MAX_FAILURES) {
  const e = attempts.get(key) ?? { failures: 0, lockedUntil: 0 };
  if (e.lockedUntil && e.lockedUntil <= now) { e.failures = 0; e.lockedUntil = 0; }
  e.failures += 1;
  if (e.failures >= max) e.lockedUntil = now + LOCK_MS;
  attempts.set(key, e);
  return e;
}

export const recordSuccess = (key: string) => attempts.delete(key);
export const _resetAttempts = () => attempts.clear();
