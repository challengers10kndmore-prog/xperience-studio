/**
 * GET /p/:slug (rewritten to /api/share?slug=…): a tiny HTML page with Open Graph tags for one project,
 * so WhatsApp / X / LinkedIn previews show its share card. People are sent straight on to the site, which opens the film.
 */
import { envOr } from "./_lib/http.js";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const clean = (t: string) => t.replace(/[_]+/g, " ").replace(/\s*\d{8,}\s*$/, "").replace(/[…]+$/, "").trim();

type P = { slug: string; title: string; caption: string | null; brief: string | null; og_url: string | null; cover_url: string | null; poster_url: string | null; discipline: string };

async function findProject(slug: string): Promise<P | null> {
  const url = envOr("SUPABASE_URL") ?? envOr("VITE_SUPABASE_URL");
  const key = envOr("VITE_SUPABASE_PUBLISHABLE_KEY") ?? envOr("SUPABASE_SECRET_KEY");
  const cols = "slug,title,caption,brief,og_url,cover_url,poster_url,discipline";
  if (url && key) {
    try {
      const r = await fetch(`${url}/rest/v1/projects?select=${cols}&published=eq.true&slug=eq.${encodeURIComponent(slug)}&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(3500) });
      if (r.ok) { const rows = (await r.json()) as P[]; if (rows[0]) return rows[0]; }
    } catch { /* fall back to the snapshot */ }
  }
  const media = (envOr("VITE_MEDIA_BASE_URL") ?? "https://challengers10kndmore-prog.github.io/xperience-media").replace(/\/$/, "");
  try {
    const m = (await (await fetch(`${media}/manifest.json`, { signal: AbortSignal.timeout(4000) })).json()) as { data?: { projects?: P[] } };
    return m.data?.projects?.find((p) => p.slug === slug) ?? null;
  } catch { return null; }
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const slug = (u.searchParams.get("slug") ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 100);
  const site = `${u.protocol}//${u.host}`;
  const media = (envOr("VITE_MEDIA_BASE_URL") ?? "https://challengers10kndmore-prog.github.io/xperience-media").replace(/\/$/, "");
  const p = slug ? await findProject(slug) : null;
  const target = p ? `${site}/?project=${encodeURIComponent(p.slug)}` : site;
  const title = p ? `${clean(p.title)} | Xperience` : "Xperience | AI Video & Video Editing Studio";
  const desc = p?.caption || p?.brief || "AI films, ads and social edits, directed and cut by Daniel Ogbeifun Osewe at Xperience.";
  const img = p?.og_url || p?.cover_url || p?.poster_url;
  const image = img ? `${media}/${img.replace(/^\//, "")}` : `${site}/og/xperience-og.jpg`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta property="og:type" content="video.other"><meta property="og:site_name" content="Xperience">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:url" content="${esc(`${site}/p/${slug}`)}"><meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${esc(target)}"><link rel="canonical" href="${esc(target)}">
</head><body style="background:#07060D;color:#E6E8EE;font-family:sans-serif"><a href="${esc(target)}" style="color:#C84BFF">Watch on Xperience</a>
<script>location.replace(${JSON.stringify(target)})</script></body></html>`;
  return new Response(html, { status: p ? 200 : 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=300" } });
}
