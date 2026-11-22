import { envOr } from "./http.js";

const API = "https://api.github.com";

function cfg() {
  const repo = envOr("MEDIA_REPO") ?? "challengers10kndmore-prog/xperience-media";
  const branch = envOr("MEDIA_BRANCH") ?? "main";
  const token = envOr("GITHUB_TOKEN");
  return { repo, branch, token };
}

function headers(token: string) {
  return { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "xperience-site" };
}

export class GitHubError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function dispatchSync(payload: { table?: string; id?: string }, f: typeof fetch = fetch) {
  const { repo, token } = cfg();
  if (!token) throw new GitHubError("GITHUB_TOKEN is not set", 500);
  const r = await f(`${API}/repos/${repo}/dispatches`, {
    method: "POST", headers: headers(token), body: JSON.stringify({ event_type: "media-uploaded", client_payload: payload }),
  });
  if (r.status !== 204) throw new GitHubError(`dispatch failed: HTTP ${r.status}`, r.status);
}

export async function readJsonFile<T>(path: string, f: typeof fetch = fetch): Promise<{ data: T; sha: string } | null> {
  const { repo, branch, token } = cfg();
  if (!token) throw new GitHubError("GITHUB_TOKEN is not set", 500);
  const r = await f(`${API}/repos/${repo}/contents/${path}?ref=${branch}`, { headers: headers(token) });
  if (r.status === 404) return null;
  if (!r.ok) throw new GitHubError(`read ${path}: HTTP ${r.status}`, r.status);
  const j = (await r.json()) as { content?: string; sha: string; download_url?: string };
  let text = j.content ? Buffer.from(j.content, "base64").toString("utf8") : "";
  if (!text && j.download_url) text = await (await f(j.download_url)).text(); // files over 1 MB
  return { data: JSON.parse(text) as T, sha: j.sha };
}

export async function writeJsonFile(path: string, data: unknown, message: string, sha?: string, f: typeof fetch = fetch) {
  const { repo, branch, token } = cfg();
  if (!token) throw new GitHubError("GITHUB_TOKEN is not set", 500);
  const r = await f(`${API}/repos/${repo}/contents/${path}`, {
    method: "PUT", headers: headers(token),
    body: JSON.stringify({ message, branch, sha, content: Buffer.from(JSON.stringify(data, null, 1) + "\n").toString("base64") }),
  });
  if (!r.ok) throw new GitHubError(`write ${path}: HTTP ${r.status}`, r.status);
}

/** Read-modify-write with one retry on sha conflict. */
export async function updateJsonFile<T>(path: string, fallback: T, mutate: (cur: T) => T, message: string, f: typeof fetch = fetch) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const cur = await readJsonFile<T>(path, f);
    const next = mutate(cur?.data ?? fallback);
    try { await writeJsonFile(path, next, message, cur?.sha, f); return next; } catch (e) {
      if (!(e instanceof GitHubError) || (e.status !== 409 && e.status !== 422) || attempt === 1) throw e;
    }
  }
  throw new GitHubError("conflict", 409);
}

export type RunInfo = { status: string; conclusion: string | null; created_at: string; updated_at: string; html_url: string } | null;

export async function lastRun(workflow: string, f: typeof fetch = fetch): Promise<RunInfo> {
  const { repo, token } = cfg();
  if (!token) return null;
  const r = await f(`${API}/repos/${repo}/actions/workflows/${workflow}/runs?per_page=1`, { headers: headers(token) });
  if (!r.ok) return null;
  const j = (await r.json()) as { workflow_runs?: NonNullable<RunInfo>[] };
  const run = j.workflow_runs?.[0];
  return run ? { status: run.status, conclusion: run.conclusion, created_at: run.created_at, updated_at: run.updated_at, html_url: run.html_url } : null;
}

export type SourceFile = { data: "auto" | "github" | "supabase"; maintenance?: { enabled: boolean; message: string | null } };
export const SOURCE_MODES = ["auto", "github", "supabase"] as const;

export async function setSource(mode: SourceFile["data"], f: typeof fetch = fetch) {
  return updateJsonFile<SourceFile>("source.json", { data: "auto" }, (cur) => ({ ...cur, data: mode }), `source: ${mode}`, f);
}

export async function setMaintenance(enabled: boolean, message: string | null, f: typeof fetch = fetch) {
  const m = { enabled, message };
  await updateJsonFile<SourceFile>("source.json", { data: "auto" }, (cur) => ({ ...cur, maintenance: m }), `maintenance: ${enabled ? "on" : "off"}`, f);
  await updateJsonFile<Record<string, unknown>>("manifest.json", { version: 1, data: {} }, (cur) => ({ ...cur, maintenance: m }), `maintenance: ${enabled ? "on" : "off"}`, f);
  return m;
}

export async function syncStatus(f: typeof fetch = fetch) {
  const [sync, keepAlive, manifest, status, source] = await Promise.all([
    lastRun("sync.yml", f), lastRun("keep-alive.yml", f),
    readJsonFile<{ generated_at?: string }>("manifest.json", f).catch(() => null),
    readJsonFile<{ keep_alive_at?: string }>("status.json", f).catch(() => null),
    readJsonFile<SourceFile>("source.json", f).catch(() => null),
  ]);
  return {
    lastSync: sync, lastKeepAlive: keepAlive,
    manifestGeneratedAt: manifest?.data.generated_at ?? null,
    keepAliveAt: status?.data.keep_alive_at ?? null,
    source: source?.data ?? { data: "auto" },
  };
}
