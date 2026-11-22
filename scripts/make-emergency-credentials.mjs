#!/usr/bin/env node
/**
 * Creates the emergency-admin credentials.
 *
 *   node scripts/make-emergency-credentials.mjs
 *
 * - Asks you for an emergency password (hidden) or makes a strong one for you.
 * - Prints a QR code: scan it with Google Authenticator / Authy / 1Password.
 * - Offers to save EMERGENCY_PASSWORD_HASH, EMERGENCY_TOTP_SECRET and EMERGENCY_SESSION_SECRET into .env.local.
 * Run it on your own laptop: it shows secrets on screen.
 */
import fs from "node:fs";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { ask, isInteractive } from "./lib/prompt.mjs";

if (!isInteractive()) {
  console.error("Run this in a terminal on your laptop (it shows a QR code and secrets).");
  process.exit(1);
}

let password = await ask("Choose an emergency password (min 14 characters), or press Enter to generate one: ", { hidden: true });
let generated = false;
if (!password) { password = crypto.randomBytes(18).toString("base64url"); generated = true; }
else {
  const again = await ask("Type it again: ", { hidden: true });
  if (again !== password) { console.error("Passwords don't match."); process.exit(1); }
  if (password.length < 14) { console.error("Too short. Use at least 14 characters."); process.exit(1); }
}

const hash = await bcrypt.hash(password, 12);
const secret = new OTPAuth.Secret({ size: 20 });
const totp = new OTPAuth.TOTP({ issuer: "Xperience", label: "Emergency admin", algorithm: "SHA1", digits: 6, period: 30, secret });
const session = crypto.randomBytes(32).toString("base64url");

console.log("\n1) Scan this with your authenticator app:\n");
console.log(await QRCode.toString(totp.toString(), { type: "terminal", small: true }));
console.log(`   (or type the key by hand: ${secret.base32})\n`);
if (generated) console.log(`2) Your emergency password (store it in your password manager): ${password}\n`);

const code = await ask("Enter the 6-digit code your app shows now, to check it works: ");
if (totp.validate({ token: code.trim(), window: 1 }) === null) console.log("   ! That code didn't match. Check your phone's clock, then run this again.");
else console.log("   ✓ Code works.");

const vars = { EMERGENCY_PASSWORD_HASH: hash, EMERGENCY_TOTP_SECRET: secret.base32, EMERGENCY_SESSION_SECRET: session };
const save = (await ask("\nSave these into .env.local? (y/N) ")).toLowerCase().startsWith("y");
if (save) {
  let text = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
  for (const [k, v] of Object.entries(vars)) {
    const line = `${k}="${v}"`;
    text = new RegExp(`^${k}=.*$`, "m").test(text) ? text.replace(new RegExp(`^${k}=.*$`, "m"), line) : `${text.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(".env.local", text);
  console.log("   ✓ Saved to .env.local");
}
console.log("\nNow add the same three values in Vercel > Project > Settings > Environment Variables:");
for (const k of Object.keys(vars)) console.log(`   ${k}${save ? " (copy from .env.local)" : `=${vars[k]}`}`);
console.log("");
