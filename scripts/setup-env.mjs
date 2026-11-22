#!/usr/bin/env node
/**
 * Creates or updates .env.local for the Xperience site.
 *
 *   node scripts/setup-env.mjs
 *
 * - Fills every public value automatically.
 * - Asks only for the secrets (typing is hidden), keeps any you already set.
 * - Generates the cookie-signing secret for you.
 * - Checks each key against Supabase / GitHub and tells you if it works.
 * - Never prints a secret, never sends one anywhere except the service it belongs to.
 *
 * Needs Node 18+ and nothing else.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env.local");
const EXAMPLE_PATH = path.join(ROOT, ".env.example");

const GITHUB_OWNER = "challengers10kndmore-prog";
const PROJECT_REF = "vzrcflhzlgarelgmqpru";

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const warn = (m) => console.log(`  \x1b[33m!\x1b[0m ${m}`);
const bad = (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);
const head = (m) => console.log(`\n\x1b[1m${m}\x1b[0m`);

// ---------- read existing values ----------
const parse = (text) => {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
};
const existing = fs.existsSync(ENV_PATH) ? parse(fs.readFileSync(ENV_PATH, "utf8")) : {};
const template = fs.existsSync(EXAMPLE_PATH) ? parse(fs.readFileSync(EXAMPLE_PATH, "utf8")) : {};
const env = { ...template, ...Object.fromEntries(Object.entries(existing).filter(([, v]) => v !== "")) };

// ---------- prompts ----------
const isTTY = Boolean(process.stdin.isTTY);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: isTTY });
let muted = false;
rl._writeToOutput = function (s) {
  if (!muted) return rl.output.write(s);
  if (s.includes("\n") || s.includes("\r")) return rl.output.write("\n");
  rl.output.write("*");
};
// Queue lines so answers are never lost, even when input arrives all at once.
const lines = [];
const waiting = [];
let closed = false;
rl.on("line", (l) => (waiting.length ? waiting.shift()(l) : lines.push(l)));
rl.on("close", () => { closed = true; while (waiting.length) waiting.shift()(""); });
const nextLine = () => new Promise((res) => (lines.length ? res(lines.shift()) : closed ? res("") : waiting.push(res)));
// --auto: ask nothing. Fill public values, keep anything already in .env.local,
// generate the cookie secret, then check the keys. Used by Claude Code.
const AUTO = process.argv.includes("--auto");
const ask = async (q, { secret = false, current = "" } = {}) => {
  if (AUTO) return current;
  const hint = current ? (secret ? " [set: press Enter to keep]" : ` [${current}]`) : "";
  process.stdout.write(`  ${q}${hint}: `);
  muted = secret && isTTY;
  const a = await nextLine();
  muted = false;
  if (!isTTY) process.stdout.write("\n");
  return a.trim() || current;
};

// ---------- checks ----------
const timeout = (ms) => AbortSignal.timeout(ms);
async function checkSupabaseSecret(url, key) {
  if (!key) return warn("Supabase secret key not set yet (needed in Phase 1).");
  if (!key.startsWith("sb_secret_")) warn("That doesn't look like a secret key (should start with sb_secret_).");
  try {
    const r = await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: timeout(10000) });
    if (r.ok) ok("Supabase secret key works.");
    else if (r.status === 540 || r.status === 503) bad("Supabase project looks paused or unavailable. Restore it in the dashboard.");
    else bad(`Supabase rejected the secret key (HTTP ${r.status}). Copy it again from Project Settings > API Keys.`);
  } catch (e) { warn(`Couldn't reach Supabase to check the key (${e.name}). Check your internet and try again.`); }
}
async function checkAccessToken(token) {
  if (!token) return warn("Supabase access token not set yet (needed in Phase 1).");
  try {
    const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}`, { headers: { Authorization: `Bearer ${token}` }, signal: timeout(10000) });
    if (r.ok) ok("Supabase access token works and can see the project.");
    else bad(`Supabase access token rejected (HTTP ${r.status}). Make a new one under Account > Access Tokens.`);
  } catch (e) { warn(`Couldn't reach the Supabase API to check the token (${e.name}).`); }
}
async function checkGithub(repo, token) {
  try {
    const headers = { Accept: "application/vnd.github+json", "User-Agent": "xperience-setup" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(`https://api.github.com/repos/${repo}`, { headers, signal: timeout(10000) });
    if (r.status === 404) return warn(`Repo ${repo} not found yet. Create it (public) when you reach Phase 2.`);
    if (!r.ok) return bad(`GitHub said HTTP ${r.status} for ${repo}${token ? ": check the token's repository access." : "."}`);
    const data = await r.json();
    ok(`Repo ${repo} exists.`);
    if (!token) return warn("GitHub token not set yet (needed in Phase 2).");
    if (data.permissions?.push) ok("GitHub token can write to it.");
    else bad("GitHub token can't write to it. Give it Contents: Read and write on this repo.");
    const p = await fetch(`https://api.github.com/repos/${repo}/pages`, { headers, signal: timeout(10000) });
    if (p.ok) ok("GitHub Pages is on.");
    else warn("GitHub Pages isn't on yet (repo Settings > Pages). Fine until Phase 2.");
  } catch (e) { warn(`Couldn't reach GitHub to check (${e.name}).`); }
}

// ---------- write ----------
const q = (v) => `"${String(v ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
function writeEnv() {
  const lines = [
    "# Created by scripts/setup-env.mjs. Never commit this file.",
    "# Anything starting with VITE_ is public (it ships to the browser).",
    "",
  ];
  const order = Object.keys(template).length ? Object.keys(template) : Object.keys(env);
  const extras = Object.keys(env).filter((k) => !order.includes(k));
  for (const k of [...order, ...extras]) lines.push(`${k}=${q(env[k])}`);
  fs.writeFileSync(ENV_PATH, lines.join("\n") + "\n", { mode: 0o600 });
}

function ensureGitignore() {
  const gi = path.join(ROOT, ".gitignore");
  const text = fs.existsSync(gi) ? fs.readFileSync(gi, "utf8") : "";
  if (!/^\.env\.local$/m.test(text)) {
    fs.writeFileSync(gi, text + (text.endsWith("\n") || !text ? "" : "\n") + ".env\n.env.local\n.env.*.local\n");
    ok("Added .env.local to .gitignore.");
  }
}

// ---------- run ----------
console.log("\n\x1b[1mXperience: environment setup\x1b[0m" + (AUTO ? " (auto: no questions)" : ""));
console.log("Press Enter to skip anything you don't have yet. Re-run any time; filled values are kept.");

head("1. Supabase");
console.log("  Secret key: Supabase > Project Settings > API Keys > Secret keys (starts with sb_secret_).");
console.log("  Use a NEW key if the old one was ever pasted in a chat.");
env.SUPABASE_SECRET_KEY = await ask("Secret key", { secret: true, current: env.SUPABASE_SECRET_KEY });
console.log("  Access token: supabase.com > avatar > Account preferences > Access Tokens > Generate.");
env.SUPABASE_ACCESS_TOKEN = await ask("Access token", { secret: true, current: env.SUPABASE_ACCESS_TOKEN });
console.log("  Database password: the one you set when creating the project (Project Settings > Database to reset).");
env.SUPABASE_DB_PASSWORD = await ask("Database password", { secret: true, current: env.SUPABASE_DB_PASSWORD });

head("2. Admin");
env.ADMIN_EMAIL = await ask("Email you'll log in to /admin with", { current: env.ADMIN_EMAIL });

head("3. GitHub media repo");
env.MEDIA_REPO ||= `${GITHUB_OWNER}/xperience-media`;
env.VITE_MEDIA_BASE_URL ||= `https://${GITHUB_OWNER}.github.io/xperience-media`;
console.log(`  Repo: ${env.MEDIA_REPO}  (create it as Public; Settings > Pages > main / root)`);
console.log("  Token: GitHub > Settings > Developer settings > Fine-grained tokens > only xperience-media,");
console.log("         Contents: Read and write, Actions: Read and write.");
env.GITHUB_TOKEN = await ask("GitHub token (github_pat_...)", { secret: true, current: env.GITHUB_TOKEN });

head("4. Site address");
env.VITE_PUBLIC_SITE_URL = (await ask("Live site URL if you have one (e.g. https://xperience-studio.vercel.app)", { current: env.VITE_PUBLIC_SITE_URL })).replace(/\/+$/, "");

head("5. Emergency admin");
if (!env.EMERGENCY_SESSION_SECRET) {
  env.EMERGENCY_SESSION_SECRET = crypto.randomBytes(48).toString("base64");
  ok("Generated the cookie-signing secret.");
} else ok("Cookie-signing secret already set.");
console.log("  Password hash + 2FA come later from scripts/make-emergency-credentials.mjs (Phase 3).");

rl.close();
ensureGitignore();
writeEnv();
head("Saved .env.local");

head("Checking your keys");
await checkSupabaseSecret(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
await checkAccessToken(env.SUPABASE_ACCESS_TOKEN);
await checkGithub(env.MEDIA_REPO, env.GITHUB_TOKEN);
if (!env.SUPABASE_DB_PASSWORD) warn("Database password not set yet (needed in Phase 1).");
if (!env.ADMIN_EMAIL) warn("Admin email not set yet (needed in Phase 1).");

console.log("\nDone. Re-run this script any time to fill in what's missing.\n");
