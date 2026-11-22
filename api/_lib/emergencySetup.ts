/**
 * One-time emergency-login setup from the browser (no laptop needed).
 * Guarded by EMERGENCY_SETUP_CODE; locks itself as soon as the EMERGENCY_* values exist in Vercel.
 */
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import * as OTPAuth from "otpauth";
import { envOr } from "./http.js";

export const MIN_PASSWORD = 14;

export function emergencyConfigured() {
  return Boolean(envOr("EMERGENCY_PASSWORD_HASH") && envOr("EMERGENCY_TOTP_SECRET") && envOr("EMERGENCY_SESSION_SECRET"));
}

/** Setup is open only while a setup code exists AND the emergency login isn't configured yet. */
export function setupState() {
  if (emergencyConfigured()) return "locked" as const;
  if (!envOr("EMERGENCY_SETUP_CODE")) return "no-code" as const;
  return "open" as const;
}

export function checkSetupCode(code: string, expected = envOr("EMERGENCY_SETUP_CODE")) {
  if (!expected || !code) return false;
  const a = crypto.createHash("sha256").update(code.trim()).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

const totpFor = (secret: string) =>
  new OTPAuth.TOTP({ issuer: "Xperience", label: "Emergency admin", algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) });

export function newTotp() {
  const secret = new OTPAuth.Secret({ size: 20 }).base32;
  return { secret, uri: totpFor(secret).toString() };
}

export async function finishSetup(input: { password: string; secret: string; code: string }, now = Date.now()) {
  if (input.password.length < MIN_PASSWORD) throw new Error(`Use at least ${MIN_PASSWORD} characters.`);
  if (!/^[A-Z2-7]{16,}$/.test(input.secret)) throw new Error("Start again: the QR code expired.");
  if (totpFor(input.secret).validate({ token: input.code, window: 1, timestamp: now }) === null) {
    throw new Error("That 6-digit code didn't match. Check your phone's clock and try the newest code.");
  }
  return {
    EMERGENCY_PASSWORD_HASH: await bcrypt.hash(input.password, 12),
    EMERGENCY_TOTP_SECRET: input.secret,
    EMERGENCY_SESSION_SECRET: crypto.randomBytes(32).toString("base64url"),
  };
}
