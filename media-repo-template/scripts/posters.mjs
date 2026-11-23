/**
 * Posters + cover cards.
 *  - pickBestTime: samples ~20 frames between 10% and 90% of the video, drops frames that are too dark / blown out /
 *    mid scene-change, and returns the time of the sharpest (variance of the Laplacian).
 *  - renderPoster: that frame, lightly graded for the brand (contrast + saturation), gently sharpened, 1920 wide (1080 for vertical).
 *  - renderCover: the poster with the caption baked in (satori -> resvg): title in Clash Display, discipline tag, caption, Xperience mark.
 *  - renderShareCard: the same design at 1200x630 for Open Graph / WhatsApp previews.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const FONT_DIR = new URL("./fonts/", import.meta.url);
const sh = (args, opts = {}) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", ...args], { maxBuffer: 64 * 1024 * 1024, ...opts });

export function probe(file) {
  const j = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file]).toString());
  const v = j.streams?.find((s) => s.codec_type === "video") ?? {};
  let w = Number(v.width) || 1920, h = Number(v.height) || 1080;
  const rot = Math.abs(Number(v.tags?.rotate ?? v.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? 0));
  if (rot === 90 || rot === 270) [w, h] = [h, w];
  return { duration: Number(j.format?.duration ?? 0), width: w, height: h };
}

const GW = 160;
function grayFrame(file, t) {
  const buf = sh(["-ss", t.toFixed(3), "-i", file, "-frames:v", "1", "-vf", `scale=${GW}:-2,format=gray`, "-f", "rawvideo", "-"]);
  return { px: buf, h: Math.floor(buf.length / GW) };
}

/** mean luminance, share of crushed/clipped pixels, Laplacian variance (sharpness) */
export function frameStats(px, w, h) {
  let sum = 0, clip = 0;
  for (let i = 0; i < w * h; i++) { const v = px[i]; sum += v; if (v < 8 || v > 247) clip++; }
  const mean = sum / (w * h);
  let ls = 0, ls2 = 0, n = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const lap = px[i - w] + px[i + w] + px[i - 1] + px[i + 1] - 4 * px[i];
    ls += lap; ls2 += lap * lap; n++;
  }
  const lapVar = n ? ls2 / n - (ls / n) ** 2 : 0;
  return { mean, clipped: clip / (w * h), lapVar };
}

const diff = (a, b) => { let d = 0; const n = Math.min(a.length, b.length); for (let i = 0; i < n; i++) d += Math.abs(a[i] - b[i]); return d / Math.max(1, n); };

export function pickBestTime(file, samples = 20) {
  const { duration } = probe(file);
  if (!(duration > 0.5)) return { t: 0, reason: "short" };
  const cands = [];
  for (let k = 0; k < samples; k++) {
    const t = duration * (0.1 + (0.8 * k) / (samples - 1));
    try {
      const a = grayFrame(file, t);
      const b = grayFrame(file, Math.min(duration - 0.05, t + 0.2));
      const s = frameStats(a.px, GW, a.h);
      const change = diff(a.px, b.px);
      cands.push({ t, ...s, change });
    } catch { /* unreadable frame: skip */ }
  }
  const good = cands.filter((c) => c.mean > 38 && c.mean < 215 && c.clipped < 0.3 && c.change < 22);
  const pool = good.length ? good : cands.filter((c) => c.mean > 20) .length ? cands.filter((c) => c.mean > 20) : cands;
  if (!pool.length) return { t: duration * 0.5, reason: "fallback" };
  // sharpest wins; slight preference for well-exposed mid-tones
  pool.sort((x, y) => y.lapVar * (1 - Math.abs(y.mean - 120) / 400) - x.lapVar * (1 - Math.abs(x.mean - 120) / 400));
  return { t: pool[0].t, reason: good.length ? "sharpest" : "least-bad", stats: pool[0] };
}

/** Graded, sharpened still at time t. Landscape -> 1920 wide, portrait -> 1080 wide. */
export function renderPoster(file, t, out, { width, height } = probe(file)) {
  const W = width >= height ? 1920 : 1080;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  sh(["-y", "-ss", Math.max(0, t).toFixed(3), "-i", file, "-frames:v", "1", "-update", "1",
    "-vf", `scale=${W}:-2:flags=lanczos,eq=contrast=1.06:saturation=1.10:gamma=0.98,unsharp=5:5:0.55:5:5:0`, "-q:v", "2", out]);
  return out;
}

// ---------------------------------------------------------------- captions
export function cleanTitle(title = "") {
  return title
    .replace(/[_]+/g, " ")
    .replace(/\s*\d{8,}\s*$/, "")          // trailing export timestamps like 202607101846
    .replace(/\s*[-–]\s*(final|v\d+|copy|edit)\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[…]+$/, "")
    .trim();
}

export function draftCaption(title, brief) {
  const t = cleanTitle(title);
  const b = (brief ?? "").replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s/)[0]?.replace(/[.!?]$/, "") ?? "";
  let c = b ? `${b}` : t;
  if (c.length > 90) c = c.slice(0, 87).replace(/\s+\S*$/, "") + "…";
  return c;
}

// ---------------------------------------------------------------- cover cards (satori + resvg)
let fontsCache = null;
function fonts() {
  if (!fontsCache) {
    const f = (name) => fs.readFileSync(new URL(name, FONT_DIR));
    fontsCache = [
      { name: "Clash Display", data: f("ClashDisplay-600.woff"), weight: 600, style: "normal" },
      { name: "Satoshi", data: f("Satoshi-500.woff"), weight: 500, style: "normal" },
      { name: "Michroma", data: f("Michroma-400.woff"), weight: 400, style: "normal" },
    ];
  }
  return fontsCache;
}

const BLADE = "M200 18 L214 70 L219 150 L216 262 L209 330 L200 382 L191 330 L184 262 L181 150 L186 70 Z";
const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C84BFF"/><stop offset=".5" stop-color="#7C3AED"/><stop offset="1" stop-color="#2F6BFF"/></linearGradient><linearGradient id="c" x1="0" x2="1"><stop offset="0" stop-color="#5B5F73"/><stop offset=".3" stop-color="#F4F5F8"/><stop offset=".5" stop-color="#A7ACBE"/><stop offset=".72" stop-color="#fff"/><stop offset="1" stop-color="#4A4D5E"/></linearGradient></defs><circle cx="200" cy="200" r="150" fill="none" stroke="url(#g)" stroke-width="14"/><path d="${BLADE}" fill="url(#c)" transform="rotate(-42 200 200)"/><path d="${BLADE}" fill="url(#c)" transform="rotate(42 200 200)"/></svg>`;
const MARK_URI = `data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`;

const h = (type, props, ...children) => {
  const style = type === "div" ? { display: "flex", ...(props.style ?? {}) } : props.style;
  return { type, props: { ...props, style, children: children.flat().filter((c) => c !== null && c !== undefined && c !== false) } };
};

function card({ bg, W, H, title, caption, discipline }) {
  const ai = discipline === "ai";
  const s = Math.min(W, H) / 1080; // scale against a 1080 short side
  const tag = ai ? "AI VIDEO" : "VIDEO EDITING";
  const tagColor = ai ? "#2F6BFF" : "#C84BFF";
  const titleSize = Math.round((title.length > 34 ? 62 : 78) * s * (W < H ? 1.05 : 1));
  return h("div", { style: { width: W, height: H, display: "flex", position: "relative", backgroundColor: "#07060D", fontFamily: "Satoshi" } },
    h("img", { src: bg, width: W, height: H, style: { position: "absolute", top: 0, left: 0, width: W, height: H, objectFit: "cover" } }),
    h("div", { style: { position: "absolute", left: 0, right: 0, bottom: 0, height: Math.round(H * 0.62), display: "flex", backgroundImage: "linear-gradient(to bottom, rgba(7,6,13,0) 0%, rgba(7,6,13,0.55) 45%, rgba(7,6,13,0.94) 100%)" } }),
    h("div", { style: { position: "absolute", left: Math.round(64 * s), right: Math.round(64 * s), bottom: Math.round(60 * s), display: "flex", flexDirection: "column" } },
      h("div", { style: { display: "flex", alignItems: "center", marginBottom: Math.round(22 * s) } },
        h("div", { style: { display: "flex", alignItems: "center", padding: `${Math.round(9 * s)}px ${Math.round(18 * s)}px`, borderRadius: 999, border: `${Math.max(1, Math.round(2 * s))}px solid ${tagColor}`, backgroundColor: "rgba(7,6,13,0.55)", color: "#E6E8EE", fontFamily: "Michroma", fontSize: Math.round(17 * s), letterSpacing: Math.round(4 * s) } },
          h("div", { style: { width: Math.round(10 * s), height: Math.round(10 * s), borderRadius: 999, backgroundColor: tagColor, marginRight: Math.round(12 * s) } }), tag)),
      h("div", { style: { display: "flex", color: "#F2F3F7", fontFamily: "Clash Display", fontWeight: 600, fontSize: titleSize, lineHeight: 1.0, letterSpacing: -1, maxWidth: Math.round(W * 0.86) } }, title),
      caption ? h("div", { style: { display: "flex", marginTop: Math.round(18 * s), color: "rgba(230,232,238,0.86)", fontSize: Math.round(30 * s), lineHeight: 1.3, maxWidth: Math.round(W * 0.8) } }, caption) : null),
    h("div", { style: { position: "absolute", top: Math.round(36 * s), right: Math.round(40 * s), display: "flex", alignItems: "center", padding: `${Math.round(8 * s)}px ${Math.round(16 * s)}px ${Math.round(8 * s)}px ${Math.round(10 * s)}px`, borderRadius: 999, backgroundColor: "rgba(7,6,13,0.62)" } },
      h("img", { src: MARK_URI, width: Math.round(54 * s), height: Math.round(54 * s) }),
      h("div", { style: { display: "flex", marginLeft: Math.round(12 * s), color: "#E6E8EE", fontFamily: "Michroma", fontSize: Math.round(15 * s), letterSpacing: Math.round(5 * s) } }, "XPERIENCE")),
  );
}

async function renderCard(posterFile, out, W, H, meta) {
  const [{ default: satori }, { Resvg }] = await Promise.all([import("satori"), import("@resvg/resvg-js")]);
  // background built by ffmpeg (satori's objectFit is limited): cover-crop when the shapes are close;
  // otherwise (e.g. a 9:16 poster on a 1200x630 card) the whole frame sits on a blurred, darkened fill of itself.
  const { width: pw, height: ph } = probe(posterFile);
  const mismatch = Math.abs(Math.log((pw / ph) / (W / H))) > 0.35;
  const vf = mismatch
    ? `split[a][b];[a]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=28:2,eq=brightness=-0.18:saturation=0.85[bg];[b]scale=${W}:${H}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=x=(W-w)*0.78:y=(H-h)/2`
    : `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`;
  const bgBuf = sh(["-i", posterFile, "-filter_complex", vf, "-frames:v", "1", "-q:v", "3", "-f", "mjpeg", "-"]);
  const bg = `data:image/jpeg;base64,${bgBuf.toString("base64")}`;
  const svg = await satori(card({ bg, W, H, ...meta }), { width: W, height: H, fonts: fonts() });
  const png = new Resvg(svg, { fitTo: { mode: "original" } }).render().asPng();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const tmp = `${out}.png`;
  fs.writeFileSync(tmp, png);
  sh(["-y", "-i", tmp, "-q:v", "2", out]);
  fs.rmSync(tmp, { force: true });
  return out;
}

/** Cover card at the poster's own aspect (used as the poster when "Show caption on poster" is on). */
export async function renderCover(posterFile, out, meta) {
  const { width, height } = probe(posterFile);
  const W = width >= height ? 1920 : 1080;
  const H = Math.round((W * height) / width / 2) * 2;
  return renderCard(posterFile, out, W, H, meta);
}

/** 1200x630 share card for Open Graph / WhatsApp. */
export function renderShareCard(posterFile, out, meta) {
  return renderCard(posterFile, out, 1200, 630, meta);
}
