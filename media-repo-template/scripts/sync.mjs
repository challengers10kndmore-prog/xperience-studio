#!/usr/bin/env node
/**
 * Media sync: Supabase inbox -> transcode -> GitHub Pages, then writes URLs back and regenerates manifest.json.
 * Every run processes ALL pending rows in every media table (--table/--id are only logged): GitHub keeps one queued run
 * per concurrency group and cancels the rest, so a run must never depend on its own trigger.
 *
 * Inbox entries on a row (row.inbox[field]):
 *   "path"                              one uploaded file
 *   { parts: ["p.part001", ...], size } a large file uploaded in 45 MB pieces (joined back byte for byte here)
 *   _poster: { at: seconds } | { auto: true }   re-pick the poster from the published video
 *   _cover: true                                 re-render the caption cover card + share card (projects)
 * Env: SUPABASE_URL, SUPABASE_SECRET_KEY, GITHUB_TOKEN, GITHUB_REPOSITORY.  Flags: --manifest-only
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { planJobs, ffmpegArgs, bitrateFor, posterArgs, frameArgs, buildManifest, MAX_BYTES } from "./lib.mjs";
import { pickBestTime, renderPoster, renderCover, renderShareCard, draftCaption, cleanTitle, probe } from "./posters.mjs";

const columns = JSON.parse(fs.readFileSync(new URL("./publicColumns.json", import.meta.url), "utf8"));
const SB = process.env.SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SECRET_KEY;
const REPO = process.env.GITHUB_REPOSITORY;
const GH = process.env.GITHUB_TOKEN;
if (!SB || !KEY) { console.error("Missing SUPABASE_URL / SUPABASE_SECRET_KEY repo secrets."); process.exit(1); }

const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
console.log(`trigger: table=${arg("table") ?? "-"} id=${arg("id") ?? "-"} (processing every pending row)`);
const manifestOnly = process.argv.includes("--manifest-only");
const ROOT = process.cwd();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "xp-sync-"));
const MEDIA_TABLES = ["projects", "section_media", "brands", "testimonials", "services", "before_after"];
const VIDEO_POSTER_TABLES = new Set(["projects", "testimonials", "before_after"]);
const pk = (t) => (t === "section_media" ? "key" : "id");

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
async function rest(p, init = {}) {
  const res = await fetch(`${SB}/rest/v1/${p}`, { ...init, headers: { ...headers, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${p}: HTTP ${res.status} ${await res.text()}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}
const sh = (cmd, args) => execFileSync(cmd, args, { stdio: ["ignore", "pipe", "inherit"], maxBuffer: 64 * 1024 * 1024 }).toString();
const ensureDir = (f) => fs.mkdirSync(path.dirname(f), { recursive: true });
const hasAudio = (file) => JSON.parse(sh("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", file])).streams?.some((s) => s.codec_type === "audio");

// ---------------------------------------------------------------- inbox I/O
const objUrl = (p) => `${SB}/storage/v1/object/inbox/${p.split("/").map(encodeURIComponent).join("/")}`;
async function fetchObject(p) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(objUrl(p), { headers });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (attempt >= 3) throw new Error(`download ${p}: HTTP ${res.status}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}
/** Downloads one inbox entry (single file or parts) to a local file. Returns { file, paths } (paths = what to delete later). */
async function download(entry) {
  if (typeof entry === "string") {
    const file = path.join(TMP, path.basename(entry).replace(/[^\w.-]/g, "_"));
    fs.writeFileSync(file, await fetchObject(entry));
    return { file, paths: [entry] };
  }
  const parts = [...(entry.parts ?? [])].sort();
  if (!parts.length) throw new Error("upload has no parts");
  const file = path.join(TMP, path.basename(parts[0]).replace(/\.part\d+$/, "").replace(/[^\w.-]/g, "_"));
  const fd = fs.openSync(file, "w");
  try { for (const p of parts) fs.writeSync(fd, await fetchObject(p)); } finally { fs.closeSync(fd); }
  const size = fs.statSync(file).size;
  if (entry.size && size !== entry.size) throw new Error(`joined file is ${size} bytes, expected ${entry.size}: a part is missing or damaged. Upload it again.`);
  console.log(`    joined ${parts.length} parts (${(size / 1048576).toFixed(1)} MB)`);
  return { file, paths: parts };
}
async function removeFromInbox(paths) {
  for (let i = 0; i < paths.length; i += 100) {
    const res = await fetch(`${SB}/storage/v1/object/inbox`, { method: "DELETE", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: paths.slice(i, i + 100) }) });
    if (!res.ok) console.warn(`inbox cleanup failed: HTTP ${res.status}`);
  }
}

// ---------------------------------------------------------------- transcoding
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
  if (rel.status === 404) rel = await fetch(`${api}/releases`, { method: "POST", headers: gh, body: JSON.stringify({ tag_name: "masters", name: "Masters (download links)", body: "Full-quality masters over 95 MB. Download links only." }) });
  const release = await rel.json();
  const existing = (release.assets ?? []).find((a) => a.name === name);
  if (existing) await fetch(`${api}/releases/assets/${existing.id}`, { method: "DELETE", headers: gh });
  const up = await fetch(`https://uploads.github.com/repos/${REPO}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`, {
    method: "POST", headers: { ...gh, "Content-Type": "application/octet-stream" }, body: fs.readFileSync(file),
  });
  if (!up.ok) throw new Error(`release upload: HTTP ${up.status}`);
  return (await up.json()).browser_download_url;
}

/** Where the published video for poster picking lives, per table. */
const videoPathFor = (table, row) => (table === "projects" ? `v/${row.id}.mp4` : table === "testimonials" ? `v/testimonial-${row.id}.mp4` : `v/ba-${row.id}-after.mp4`);
const posterPathFor = (table, row) => (table === "projects" ? `p/${row.id}.jpg` : table === "testimonials" ? `p/testimonial-${row.id}.jpg` : `p/ba-${row.id}.jpg`);

async function makePoster(table, row, videoFile, patch, at) {
  const out = posterPathFor(table, row);
  const t = typeof at === "number" ? Math.max(0, at) : pickBestTime(videoFile).t;
  renderPoster(videoFile, t, path.join(ROOT, out));
  patch.poster_url = out;
  patch.poster_time = Math.round(t * 100) / 100;
  if (table === "projects") patch.poster_source = typeof at === "number" ? "time" : "auto";
  console.log(`    poster ${typeof at === "number" ? "at" : "auto"} ${t.toFixed(2)}s -> ${out}`);
}

async function makeCovers(row, patch) {
  const merged = { ...row, ...patch };
  if (!merged.poster_url) return;
  let caption = (merged.caption ?? "").trim();
  if (!caption) { caption = draftCaption(merged.title, merged.brief); patch.caption = caption; }
  const meta = { title: cleanTitle(merged.title), caption, discipline: merged.discipline };
  const poster = path.join(ROOT, merged.poster_url);
  if (!fs.existsSync(poster)) return;
  await renderCover(poster, path.join(ROOT, `c/${row.id}.jpg`), meta);
  await renderShareCard(poster, path.join(ROOT, `og/${row.id}.jpg`), meta);
  patch.cover_url = `c/${row.id}.jpg`;
  patch.og_url = `og/${row.id}.jpg`;
  console.log(`    cover + share card (caption: "${caption}")`);
}

async function processRow(table, row) {
  const inbox = { ...(row.inbox ?? {}) };
  const posterReq = inbox._poster; delete inbox._poster;
  const coverReq = inbox._cover; delete inbox._cover;
  const jobs = planJobs(table, { ...row, inbox });
  const patch = {};
  const cleanup = [];
  let posterDone = false;

  for (const job of jobs) {
    console.log(`  ${table}/${row[pk(table)]}: ${job.field}`);
    const { file: input, paths } = await download(job.src);
    cleanup.push(...paths);
    if (job.kind === "image") {
      const dest = path.join(ROOT, job.out); ensureDir(dest);
      sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", input, "-vf", "scale='min(1920,iw)':-2", "-q:v", "2", dest]);
      patch[job.field] = job.out;
      if (table === "projects" && job.field === "poster_url") { patch.poster_source = "upload"; patch.poster_time = null; posterDone = true; }
      continue;
    }
    if (job.kind === "logo") {
      const dest = path.join(ROOT, job.out); ensureDir(dest);
      if (/\.svg$/i.test(typeof job.src === "string" ? job.src : "")) { const svgOut = job.out.replace(/\.png$/, ".svg"); fs.copyFileSync(input, path.join(ROOT, svgOut)); patch[job.field] = svgOut; }
      else { sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", input, "-vf", "scale='min(800,iw)':-2", dest]); patch[job.field] = job.out; }
      continue;
    }
    const info = probe(input);
    const loop = job.kind === "loop";
    const dest = transcode(input, job.out, { audio: job.audio && hasAudio(input), loop });
    patch[job.field] = job.out;
    if (VIDEO_POSTER_TABLES.has(table) && (job.field === "video_url" || job.field === "after_url") && !posterDone) {
      await makePoster(table, row, dest, patch);
      posterDone = true;
    } else if (job.poster) {
      const p = path.join(ROOT, job.poster); ensureDir(p);
      sh("ffmpeg", posterArgs(input, p, Math.min(1, info.duration * 0.1).toFixed(2), job.posterAtEnd));
      if (table !== "section_media" || job.field === "desktop_url") patch.poster_url = job.poster;
    }
    if (job.frames) {
      const dir = path.join(ROOT, job.frames.dir);
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      sh("ffmpeg", frameArgs(input, dir, job.frames, info.duration));
      const count = fs.readdirSync(dir).filter((f) => f.endsWith(".webp")).length;
      if (!count) throw new Error("frame extraction produced no frames");
      patch.frames = { ...(patch.frames ?? row.frames ?? {}), [job.frames.variant]: { path: job.frames.dir, count, w: job.frames.w, h: job.frames.h, ext: "webp", pattern: "f%03d" } };
    }
    if (job.teaser) { transcode(input, job.teaser, { audio: false, teaser: true }); patch.teaser_url = job.teaser; }
    if (table === "projects" && job.field === "video_url") {
      if (!row.duration_s || jobs.length) patch.duration_s = Math.round(info.duration * 10) / 10;
      if (job.master && fs.statSync(input).size > MAX_BYTES) patch.full_video_url = await uploadMaster(input, `${row.slug ?? row.id}.mp4`);
    }
    fs.rmSync(input, { force: true });
  }

  // poster re-pick from the already-published video
  if (posterReq && VIDEO_POSTER_TABLES.has(table) && !posterDone) {
    const v = path.join(ROOT, videoPathFor(table, row));
    if (!fs.existsSync(v)) throw new Error("No published video to pick a poster from yet.");
    await makePoster(table, row, v, patch, posterReq.at);
    posterDone = true;
  }
  if (table === "projects" && (posterDone || coverReq)) await makeCovers(row, patch);

  // nothing to do and nothing published: the upload never arrived
  const hasMedia = ["video_url", "desktop_url", "mobile_url", "logo_url", "loop_url", "before_url", "after_url", "poster_url"].some((f) => row[f] || patch[f]);
  if (!jobs.length && !posterReq && !coverReq && !hasMedia && table !== "faqs") {
    throw new Error("No file reached the upload inbox (it may have been over the 50 MB limit). Upload it again: large files now upload in pieces.");
  }
  return { patch, cleanup };
}

// ---------------------------------------------------------------- git (safe against concurrent runs)
function gitCommit(message) {
  sh("git", ["add", "-A"]);
  if (!sh("git", ["status", "--porcelain"]).trim()) return false;
  const id = ["-c", "user.name=xperience-sync", "-c", "user.email=actions@users.noreply.github.com"];
  sh("git", [...id, "commit", "-q", "-m", message]);
  for (let i = 1; i <= 6; i++) {
    try { sh("git", ["push", "-q"]); return true; } catch {
      console.log(`  push rejected (attempt ${i}); rebasing on the latest main`);
      try { sh("git", [...id, "pull", "--rebase", "-X", "theirs", "-q"]); }
      catch { // generated files (manifest.json, status.json) conflict: keep ours, which was just rebuilt from the database
        try { sh("git", ["checkout", "--theirs", "--", "."]); sh("git", ["add", "-A"]); sh("git", [...id, "-c", "core.editor=true", "rebase", "--continue"]); }
        catch { sh("git", ["rebase", "--abort"]); }
      }
      execFileSync("sleep", [String(2 * i)]);
    }
  }
  throw new Error("git push failed after 6 attempts");
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
  const done = [];
  for (const table of MEDIA_TABLES) {
    const rows = await rest(`${table}?select=*&media_status=eq.pending&order=updated_at`);
    if (rows.length) console.log(`${table}: ${rows.length} pending`);
    for (const row of rows) {
      try {
        done.push({ table, row, ...(await processRow(table, row)) });
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
      // only clear the row if nobody re-uploaded while we worked (inbox unchanged since we read it)
      const key = `${pk(d.table)}=eq.${encodeURIComponent(d.row[pk(d.table)])}`;
      const fresh = (await rest(`${d.table}?select=inbox,updated_at&${key}`))[0];
      if (fresh && JSON.stringify(fresh.inbox ?? {}) !== JSON.stringify(d.row.inbox ?? {})) { delete body.inbox; delete body.media_status; console.log(`  ${d.table}/${d.row[pk(d.table)]}: new upload arrived meanwhile; it stays pending`); }
      await rest(`${d.table}?${key}`, { method: "PATCH", body: JSON.stringify(body) });
      await removeFromInbox(d.cleanup);
    }
  }
}
await regenerateManifest();
gitCommit("manifest: update");
fs.rmSync(TMP, { recursive: true, force: true });
if (failures) { console.error(`${failures} item(s) failed (marked "failed" in admin with the reason).`); process.exitCode = 1; }
