#!/usr/bin/env node
/**
 * Emergency upload (when Supabase is down): compress a video locally and commit it straight to the media repo.
 *
 *   node scripts/emergency-upload.mjs <file> --project <project-id>     # replaces v/<id>.mp4 + p/<id>.jpg
 *   node scripts/emergency-upload.mjs <file> --section hero --mobile    # replaces s/hero-mobile.mp4
 *
 * Needs ffmpeg on your computer and GITHUB_TOKEN (Contents: write on the media repo).
 * The browser version of this needs a GitHub App and is optional (EMERGENCY_UPLOAD_ENABLED); this script always works.
 * Re-uses paths the site already points at, so no database write is needed.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { loadEnv, requireEnv } from "./lib/env.mjs";

loadEnv();
requireEnv("GITHUB_TOKEN");
const [file] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
if (!file || !fs.existsSync(file)) { console.error("Usage: node scripts/emergency-upload.mjs <video> --project <id> | --section <key> [--mobile]"); process.exit(1); }
const project = arg("project"), section = arg("section");
if (!project && !section) { console.error("Say where it goes: --project <id> or --section <key>"); process.exit(1); }

const REPO = process.env.MEDIA_REPO || "challengers10kndmore-prog/xperience-media";
const BRANCH = process.env.MEDIA_BRANCH || "main";
const H = { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "xp-up-"));
const out = path.join(tmp, "out.mp4"), poster = path.join(tmp, "poster.jpg");
const loop = Boolean(section);
const scale = "scale='if(gte(iw,ih),-2,min(1080,iw))':'if(gte(iw,ih),min(1080,ih),-2)'";
console.log("Compressing…");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", file, "-vf", scale, "-c:v", "libx264", "-profile:v", "high", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
  ...(loop ? ["-an"] : ["-c:a", "aac", "-b:a", "128k"]), "-movflags", "+faststart", out], { stdio: "inherit" });
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "1", "-i", out, "-frames:v", "1", "-q:v", "3", poster]);
const size = fs.statSync(out).size;
if (size > 90 * 1024 * 1024) { console.error(`Still ${(size / 1048576).toFixed(0)} MB after compression (limit 90 MB). Trim it or lower the quality.`); process.exit(1); }

const targets = project
  ? [[out, `v/${project}.mp4`], [poster, `p/${project}.jpg`]]
  : [[out, `s/${section}-${process.argv.includes("--mobile") ? "mobile" : "desktop"}.mp4`], ...(process.argv.includes("--mobile") ? [] : [[poster, `s/${section}-desktop.jpg`]])];

const api = (p, init = {}) => fetch(`https://api.github.com/repos/${REPO}${p}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } }).then(async (r) => { if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return r.json(); });
const ref = await api(`/git/ref/heads/${BRANCH}`);
const base = await api(`/git/commits/${ref.object.sha}`);
const tree = [];
for (const [local, dest] of targets) {
  console.log(`Uploading ${dest}…`);
  const blob = await api("/git/blobs", { method: "POST", body: JSON.stringify({ content: fs.readFileSync(local).toString("base64"), encoding: "base64" }) });
  tree.push({ path: dest, mode: "100644", type: "blob", sha: blob.sha });
}
const t = await api("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: base.tree.sha, tree }) });
const c = await api("/git/commits", { method: "POST", body: JSON.stringify({ message: `emergency upload: ${targets.map((x) => x[1]).join(", ")}`, tree: t.sha, parents: [ref.object.sha] }) });
await api(`/git/refs/heads/${BRANCH}`, { method: "PATCH", body: JSON.stringify({ sha: c.sha }) });
fs.rmSync(tmp, { recursive: true, force: true });
console.log("✓ Done. GitHub Pages updates in about a minute.");
