#!/usr/bin/env node
/**
 * Media sync: Supabase inbox -> transcode -> GitHub Pages, then writes URLs back and regenerates manifest.json.
 * Runs in the xperience-media repo (GitHub Actions). Env: SUPABASE_URL, SUPABASE_SECRET_KEY, GITHUB_TOKEN, GITHUB_REPOSITORY.
 * Args: --table <t> --id <id>  (optional; without them every pending row is processed)   --manifest-only
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { planJobs, ffmpegArgs, bitrateFor, posterArgs, buildManifest, MAX_BYTES } from "./lib.mjs";
const columns = JSON.parse(fs.readFileSync(new URL("./publicColumns.json", import.meta.url), "utf8"));

const SB = process.env.SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SECRET_KEY;
const REPO = process.env.GITHUB_REPOSITORY;
const GH = process.env.GITHUB_TOKEN;
if (!SB || !KEY) { console.error("Missing SUPABASE_URL / SUPABASE_SECRET_KEY repo secrets."); process.exit(1); }

const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const onlyTable = arg("table");
const onlyId = arg("id");
const manifestOnly = process.argv.includes("--manifest-only");
const ROOT = process.cwd();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "xp-sync-"));
const MEDIA_TABLES = ["projects", "section_media", "brands", "testimonials", "services", "before_after"];
const pk = (t) => (t === "section_media" ? "key" : "id");

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
async function rest(p, init = {}) {
  const res = await fetch(`${SB}/rest/v1/${p}`, { ...init, headers: { ...headers, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${p}: HTTP ${res.status} ${await res.text()}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}
const sh = (cmd, args) => execFileSync(cmd, args, { stdio: ["ignore", "pipe", "inherit"] }).toString();
const probe = (file) => {
  const j = JSON.parse(sh("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file]));
  return { duration: Number(j.format?.duration ?? 0), hasAudio: j.streams?.some((s) => s.codec_type === "audio") };
};
const ensureDir = (f) => fs.mkdirSync(path.dirname(f), { recursive: true });

async function download(src) {
  const res = await fetch(`${SB}/storage/v1/object/inbox/${src.split("/").map(encodeURIComponent).join("/")}`, { headers });
  if (!res.ok) throw new Error(`download ${src}: HTTP ${res.status}`);
  const file = path.join(TMP, path.basename(src).replace(/[^\w.-]/g, "_"));
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

async function removeFromInbox(paths) {
  if (!paths.length) return;
  const res = await fetch(`${SB}/storage/v1/object/inbox`, { method: "DELETE", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: paths }) });
  if (!res.ok) console.warn(`inbox cleanup failed: HTTP ${res.status}`);
}

function transcode(input, out, opts) {
  const dest = path.join(ROOT, out);
  ensureDir(dest);
  sh("ffmpeg", ffmpegArgs({ input, output: dest, ...opts }));
  if (fs.statSync(dest).size > MAX_BYTES) {
    const { duration } = probe(input);
    let kbps = bitrateFor(duration, opts.audio && !opts.loop);
    for (let i = 0; i < 3 && (i === 0 || fs.statSync(dest).size > MAX_BYTES); i++) {
      sh("ffmpeg", ffmpegArgs({ input, output: dest, ...opts, videoKbps: kbps }));
      kbps = Math.floor(kbps * 0.8);
    }
    if (fs.statSync(dest).size > MAX_BYTES) throw new Error(`still over 95 MB after lowering bitrate: ${out}`);
  }
  return dest;
}

async function uploadMaster(file, name) {
  if (!GH || !REPO) throw new Error("GITHUB_TOKEN missing for release upload");
  const api = `https://api.github.com/repos/${REPO}`;
  const gh = { Authorization: `Bearer ${GH}`, Accept: "application/vnd.github+json" };
  let rel = await fetch(`${api}/releases/tags/masters`, { headers: gh });
  if (rel.status === 404) {
    rel = await fetch(`${api}/releases`, { method: "POST", headers: gh, body: JSON.stringify({ tag_name: "masters", name: "Masters (download links)", body: "Full-quality masters over 95 MB. Download links only." }) });
  }
  const release = await rel.json();
  const existing = (release.assets ?? []).find((a) => a.name === name);
  if (existing) await fetch(`${api}/releases/assets/${existing.id}`, { method: "DELETE", headers: gh });
  const up = await fetch(`https://uploads.github.com/repos/${REPO}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`, {
    method: "POST", headers: { ...gh, "Content-Type": "application/octet-stream" }, body: fs.readFileSync(file),
  });
  if (!up.ok) throw new Error(`release upload: HTTP ${up.status}`);
  return (await up.json()).browser_download_url;
}

async function processRow(table, row) {
  const jobs = planJobs(table, row);
  const patch = {};
  const cleanup = [];
  for (const job of jobs) {
    console.log(`  ${table}/${row[pk(table)]}: ${job.field} <- ${job.src}`);
    const input = await download(job.src);
    cleanup.push(job.src);
    if (job.kind === "image") {
      const dest = path.join(ROOT, job.out); ensureDir(dest);
      sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", input, "-vf", "scale='min(1920,iw)':-2", "-q:v", "3", dest]);
      patch[job.field] = job.out;
      continue;
    }
    if (job.kind === "logo") {
      const dest = path.join(ROOT, job.out); ensureDir(dest);
      if (/\.svg$/i.test(job.src)) { const svgOut = job.out.replace(/\.png$/, ".svg"); fs.copyFileSync(input, path.join(ROOT, svgOut)); patch[job.field] = svgOut; }
      else { sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", input, "-vf", "scale='min(800,iw)':-2", dest]); patch[job.field] = job.out; }
      continue;
    }
    const info = probe(input);
    const loop = job.kind === "loop";
    transcode(input, job.out, { audio: job.audio && info.hasAudio, loop });
    patch[job.field] = job.out;
    if (job.poster) {
      const dest = path.join(ROOT, job.poster); ensureDir(dest);
      sh("ffmpeg", posterArgs(input, dest, Math.min(1, info.duration * 0.1).toFixed(2)));
      if (table !== "section_media" || job.field === "desktop_url") patch.poster_url = job.poster;
    }
    if (job.teaser) { transcode(input, job.teaser, { audio: false, teaser: true }); patch.teaser_url = job.teaser; }
    if (table === "projects" && job.field === "video_url") {
      if (!row.duration_s) patch.duration_s = Math.round(info.duration * 10) / 10;
      if (job.master && fs.statSync(input).size > MAX_BYTES) patch.full_video_url = await uploadMaster(input, `${row.slug ?? row.id}.mp4`);
    }
    fs.rmSync(input, { force: true });
  }
  return { patch, cleanup };
}

function gitCommit(message) {
  sh("git", ["add", "-A"]);
  const dirty = sh("git", ["status", "--porcelain"]).trim();
  if (!dirty) return false;
  sh("git", ["-c", "user.name=xperience-sync", "-c", "user.email=actions@users.noreply.github.com", "commit", "-q", "-m", message]);
  for (let i = 0; i < 4; i++) {
    try { sh("git", ["push", "-q"]); return true; } catch { sh("git", ["pull", "--rebase", "-q"]); }
  }
  throw new Error("git push failed");
}

async function regenerateManifest() {
  const get = (t, filter = "published=eq.true") => rest(`${t}?select=${columns[t]}${filter ? `&${filter}` : ""}`);
  const [site_settings, projects, brands, section_media, testimonials, services, faqs, before_after] = await Promise.all([
    get("site_settings", ""), get("projects"), get("brands"), get("section_media"), get("testimonials"), get("services"), get("faqs"), get("before_after"),
  ]);
  const file = path.join(ROOT, "manifest.json");
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
  const tables = { site_settings: site_settings[0] ?? null, projects, brands, section_media, testimonials, services, faqs, before_after };
  if (prev && JSON.stringify(prev.data) === JSON.stringify(tables)) { console.log("manifest unchanged"); return; }
  fs.writeFileSync(file, JSON.stringify(buildManifest(tables, prev), null, 1) + "\n");
  console.log("manifest.json regenerated");
}

let failures = 0;
if (!manifestOnly) {
  const tables = onlyTable && MEDIA_TABLES.includes(onlyTable) ? [onlyTable] : MEDIA_TABLES;
  const done = [];
  for (const table of tables) {
    const filter = onlyId && onlyTable === table ? `&${pk(table)}=eq.${encodeURIComponent(onlyId)}` : "";
    const rows = await rest(`${table}?select=*&media_status=eq.pending${filter}`);
    for (const row of rows) {
      try {
        const r = await processRow(table, row);
        done.push({ table, row, ...r });
      } catch (e) {
        failures++;
        console.error(`  FAILED ${table}/${row[pk(table)]}: ${e.message}`);
        await rest(`${table}?${pk(table)}=eq.${encodeURIComponent(row[pk(table)])}`, { method: "PATCH", body: JSON.stringify({ media_status: "failed", media_error: String(e.message).slice(0, 500) }) });
      }
    }
  }
  if (done.length) {
    gitCommit(`media: publish ${done.length} item(s)`);
    for (const d of done) {
      const body = { ...d.patch, media_status: "published", media_synced_at: new Date().toISOString(), media_error: null, inbox: {} };
      if (d.table === "projects") body.inbox_path = null;
      await rest(`${d.table}?${pk(d.table)}=eq.${encodeURIComponent(d.row[pk(d.table)])}`, { method: "PATCH", body: JSON.stringify(body) });
      await removeFromInbox(d.cleanup);
    }
  }
}
await regenerateManifest();
gitCommit("manifest: update");
fs.rmSync(TMP, { recursive: true, force: true });
if (failures) { console.error(`${failures} item(s) failed (marked "failed" in admin).`); process.exitCode = 1; }
