#!/usr/bin/env node
/**
 * One-time setup of the media repo (MEDIA_REPO, default challengers10kndmore-prog/xperience-media).
 *
 *   node scripts/setup-media-repo.mjs
 *
 * 1. Pushes media-repo-template/ (Actions, sync scripts, source.json, manifest.json) in one commit.
 *    Existing manifest.json / source.json / status.json in the repo are kept.
 * 2. Switches on GitHub Pages (branch MEDIA_BRANCH, root).
 * 3. Saves SUPABASE_URL and SUPABASE_SECRET_KEY as Actions secrets (encrypted, never printed).
 * 4. Runs the first sync (regenerates manifest.json).
 * Needs GITHUB_TOKEN with Contents, Actions, Pages, Secrets: read and write on the media repo.
 */
import fs from "node:fs";
import path from "node:path";
import sodium from "libsodium-wrappers";
import { loadEnv, requireEnv } from "./lib/env.mjs";

loadEnv();
requireEnv("GITHUB_TOKEN");
const REPO = process.env.MEDIA_REPO || "challengers10kndmore-prog/xperience-media";
const BRANCH = process.env.MEDIA_BRANCH || "main";
const API = `https://api.github.com/repos/${REPO}`;
const H = { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const warn = (m) => console.log(`  \x1b[33m!\x1b[0m ${m}`);

async function gh(p, init = {}) {
  const res = await fetch(p.startsWith("http") ? p : `${API}${p}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } });
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: text ? JSON.parse(text) : null };
}

// 0. repo exists?
const repo = await gh("");
if (!repo.ok) {
  console.error(`Can't reach ${REPO} (HTTP ${repo.status}). Create it on github.com (Public) and give the token access, then run this again.`);
  process.exit(1);
}
ok(`Found ${REPO}`);

// 1. push template
const TEMPLATE = path.resolve("media-repo-template");
const KEEP_IF_PRESENT = new Set(["manifest.json", "source.json", "status.json"]);
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (!e.name.endsWith(".test.ts")) files.push(path.relative(TEMPLATE, full).split(path.sep).join("/"));
  }
})(TEMPLATE);
fs.copyFileSync("shared/publicColumns.json", path.join(TEMPLATE, "scripts/publicColumns.json"));

let ref = await gh(`/git/ref/heads/${BRANCH}`);
let baseCommit, baseTree;
if (ref.ok) {
  baseCommit = ref.body.object.sha;
  baseTree = (await gh(`/git/commits/${baseCommit}`)).body.tree.sha;
} else {
  // Empty repo: the Git Data API needs one commit first.
  const init = await gh("/contents/README.md", { method: "PUT", body: JSON.stringify({ message: "init", content: Buffer.from("# xperience-media\n").toString("base64"), branch: BRANCH }) });
  if (!init.ok) { console.error(`Couldn't initialise the repo (HTTP ${init.status}).`); process.exit(1); }
  ref = await gh(`/git/ref/heads/${BRANCH}`);
  baseCommit = ref.body.object.sha;
  baseTree = (await gh(`/git/commits/${baseCommit}`)).body.tree.sha;
}
const existing = new Set(((await gh(`/git/trees/${baseTree}?recursive=1`)).body?.tree ?? []).map((t) => t.path));
const tree = [];
for (const f of files) {
  if (KEEP_IF_PRESENT.has(f) && existing.has(f)) continue;
  const content = fs.readFileSync(path.join(TEMPLATE, f));
  const blob = await gh("/git/blobs", { method: "POST", body: JSON.stringify({ content: content.toString("base64"), encoding: "base64" }) });
  if (!blob.ok) { console.error(`blob ${f}: HTTP ${blob.status}`); process.exit(1); }
  tree.push({ path: f, mode: "100644", type: "blob", sha: blob.body.sha });
}
const newTree = await gh("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: baseTree, tree }) });
const commit = await gh("/git/commits", { method: "POST", body: JSON.stringify({ message: "setup: media pipeline (sync + keep-alive Actions)", tree: newTree.body.sha, parents: [baseCommit] }) });
const upd = await gh(`/git/refs/heads/${BRANCH}`, { method: "PATCH", body: JSON.stringify({ sha: commit.body.sha }) });
if (!upd.ok) { console.error(`Push failed (HTTP ${upd.status}). Does the token have Contents: write?`); process.exit(1); }
ok(`Pushed ${tree.length} file(s) to ${BRANCH}`);

// 2. Pages
const pages = await gh("/pages");
if (pages.ok) ok(`Pages already on: ${pages.body.html_url}`);
else {
  const p = await gh("/pages", { method: "POST", body: JSON.stringify({ source: { branch: BRANCH, path: "/" } }) });
  if (p.ok) ok(`Pages switched on: ${p.body.html_url}`);
  else warn(`Couldn't switch on Pages (HTTP ${p.status}). Do it by hand: repo Settings > Pages > Deploy from a branch > ${BRANCH} > / (root) > Save.`);
}

// 3. Actions secrets
async function setSecret(name, value) {
  if (!value) return warn(`${name} is empty; skipped`);
  const key = await gh("/actions/secrets/public-key");
  if (!key.ok) return warn(`Couldn't read the Actions public key (HTTP ${key.status}). Add ${name} by hand: Settings > Secrets and variables > Actions.`);
  await sodium.ready;
  const sealed = sodium.crypto_box_seal(sodium.from_string(value), sodium.from_base64(key.body.key, sodium.base64_variants.ORIGINAL));
  const r = await gh(`/actions/secrets/${name}`, { method: "PUT", body: JSON.stringify({ encrypted_value: sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL), key_id: key.body.key_id }) });
  if (r.ok) ok(`Secret ${name} saved`);
  else warn(`Couldn't save ${name} (HTTP ${r.status}). Add it by hand: Settings > Secrets and variables > Actions.`);
}
await setSecret("SUPABASE_URL", process.env.SUPABASE_URL);
await setSecret("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);

// 4. first sync
const d = await gh("/dispatches", { method: "POST", body: JSON.stringify({ event_type: "media-uploaded", client_payload: { table: "manifest" } }) });
if (d.status === 204) ok("First sync started (Actions tab).");
else warn(`Couldn't start the sync (HTTP ${d.status}). It will run on its own within the hour.`);
console.log("\nDone.");
