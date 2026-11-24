/**
 * Google Drive link helpers (used by the admin, the /api/admin/drive function and the site's player).
 * Works with public links only: the file or folder must be shared as "Anyone with the link can view".
 */

/** File id from any common Drive file link shape (or a bare id). */
export function driveFileId(input: string | null | undefined): string | null {
  const s = (input ?? "").trim();
  if (!s) return null;
  const m = s.match(/drive\.google\.com\/file\/d\/([\w-]{10,})/) ?? s.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]{10,})/)
    ?? s.match(/drive\.usercontent\.google\.com\/download\?(?:[^#]*&)?id=([\w-]{10,})/) ?? s.match(/docs\.google\.com\/file\/d\/([\w-]{10,})/);
  if (m) return m[1];
  return /^[\w-]{25,}$/.test(s) ? s : null;
}

/** Folder id from a Drive folder link. */
export function driveFolderId(input: string | null | undefined): string | null {
  const m = (input ?? "").trim().match(/drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?folders|embeddedfolderview\?(?:[^#]*&)?id=)\/?([\w-]{10,})/);
  return m ? m[1] : null;
}

export const driveViewUrl = (id: string) => `https://drive.google.com/file/d/${id}/view`;
/** Embeddable player for the full film. */
export const drivePreviewUrl = (id: string) => `https://drive.google.com/file/d/${id}/preview`;
export const driveFolderListUrl = (id: string) => `https://drive.google.com/embeddedfolderview?id=${id}#list`;

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi|wmv|mpe?g|3gp|mts|m2ts|flv|ogv)$/i;
export const looksLikeVideo = (name: string) => VIDEO_EXT.test(name.trim());

const decode = (s: string) => s
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/\\u0026/g, "&").trim();

/** File name from a Drive "view" page's <title> ("Name.mp4 - Google Drive"). Null when it's a sign-in page. */
export function parseFileTitle(html: string): string | null {
  const t = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  if (!t) return null;
  const name = decode(t).replace(/\s*-\s*Google Drive\s*$/i, "").trim();
  if (!name || /^(Google Drive|Sign in|Meet Google Drive)/i.test(name)) return null;
  return name;
}

/** True when Google answered with its sign-in / "request access" page, i.e. the link isn't public. */
export const isSignInPage = (html: string, finalUrl = "") =>
  /accounts\.google\.com\/(ServiceLogin|v3\/signin|InteractiveLogin)/.test(finalUrl) || /<title>\s*(Sign in|Meet Google Drive)/i.test(html) || /You need access|Request access/i.test(html);

/** Files listed by Drive's public embedded folder view. Sub-folders are returned separately. */
export function parseFolderListing(html: string): { files: { id: string; name: string }[]; folders: { id: string; name: string }[] } {
  const files: { id: string; name: string }[] = [], folders: { id: string; name: string }[] = [];
  const seen = new Set<string>();
  const entry = /<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<div class="flip-entry-title">([\s\S]*?)<\/div>/g;
  for (let m = entry.exec(html); m; m = entry.exec(html)) {
    const href = decode(m[1]), name = decode(m[2].replace(/<[^>]+>/g, ""));
    const fileId = driveFileId(href), folderId = driveFolderId(href);
    if (fileId && !seen.has(fileId)) { seen.add(fileId); files.push({ id: fileId, name }); }
    else if (folderId && !seen.has(folderId)) { seen.add(folderId); folders.push({ id: folderId, name }); }
  }
  return { files, folders };
}

/** "My_film-final v2.mp4" -> "My film final v2" */
export const titleFromName = (name: string) => name.replace(/\.[^.]{2,5}$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled film";

// ---------------------------------------------------------------- server side: check links, list folders
export type DriveItem = { id: string; name: string; folder: string | null; status: "ok" | "private" | "not-video" | "error"; note?: string };
type Fetch = typeof fetch;
const UA = { "User-Agent": "Mozilla/5.0 (compatible; XperienceAdmin/1.0)", "Accept-Language": "en" };

async function getPage(url: string, f: Fetch): Promise<{ html: string; finalUrl: string; status: number }> {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await f(url, { headers: UA, redirect: "follow", signal: ctrl.signal });
    return { html: await res.text(), finalUrl: res.url || url, status: res.status };
  } finally { clearTimeout(t); }
}

/** Checks every pasted link: files get their name (and whether they're public); folders list their videos (one level of sub-folders). */
export async function resolveDriveLinks(text: string, f: Fetch = fetch, limit = 300): Promise<{ items: DriveItem[]; unknown: string[] }> {
  const lines = text.split(/[\s,]+/).map((l) => l.trim()).filter(Boolean);
  const items: DriveItem[] = [], unknown: string[] = [], seen = new Set<string>();
  const push = (it: DriveItem) => { if (!seen.has(it.id) && items.length < limit) { seen.add(it.id); items.push(it); } };

  const listFolder = async (id: string, label: string | null, depth: number) => {
    let page;
    try { page = await getPage(driveFolderListUrl(id), f); } catch { push({ id, name: label ?? "Folder", folder: label, status: "error", note: "Drive didn't answer. Try again." }); return; }
    if (page.status >= 400 || isSignInPage(page.html, page.finalUrl)) { push({ id, name: label ?? "Folder", folder: label, status: "private", note: "This folder isn't shared as “Anyone with the link”." }); return; }
    const { files, folders } = parseFolderListing(page.html);
    const name = label ?? parseFileTitle(page.html) ?? "Folder";
    for (const file of files) push({ id: file.id, name: file.name, folder: name, status: looksLikeVideo(file.name) ? "ok" : "not-video", note: looksLikeVideo(file.name) ? undefined : "Not a video: skipped" });
    if (depth < 1) for (const sub of folders) await listFolder(sub.id, `${name} / ${sub.name}`, depth + 1);
  };

  for (const line of lines) {
    const folder = driveFolderId(line);
    if (folder) { await listFolder(folder, null, 0); continue; }
    const id = driveFileId(line);
    if (!id) { unknown.push(line); continue; }
    if (seen.has(id)) continue;
    try {
      const page = await getPage(driveViewUrl(id), f);
      if (page.status === 404) { push({ id, name: line, folder: null, status: "error", note: "Drive says this file doesn't exist." }); continue; }
      if (page.status >= 400 || isSignInPage(page.html, page.finalUrl)) { push({ id, name: line, folder: null, status: "private", note: "Not shared as “Anyone with the link”." }); continue; }
      const name = parseFileTitle(page.html) ?? "Drive video";
      push({ id, name, folder: null, status: "ok", note: looksLikeVideo(name) ? undefined : "No video extension in the name: it will still be tried." });
    } catch { push({ id, name: line, folder: null, status: "error", note: "Drive didn't answer. Try again." }); }
  }
  return { items, unknown };
}
