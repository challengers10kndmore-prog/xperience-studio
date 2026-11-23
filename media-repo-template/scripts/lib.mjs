// Pure helpers for the media sync (unit-tested from the site repo).

export const MAX_BYTES = 95 * 1024 * 1024;

/** Frame sequences: ~12 fps (96 frames for 8 s), capped, sized for each layout. */
export const FRAME_FPS = 12;
export const MAX_FRAMES = 120;
export const FRAME_SIZES = { desktop: { w: 1280, h: 720 }, mobile: { w: 540, h: 960 } };

/** ffmpeg args to cut a video into f001.webp, f002.webp, ... covering the frame (crop to the target aspect). */
export function frameArgs(input, dir, { w, h }, durationS) {
  const fps = Math.min(FRAME_FPS, MAX_FRAMES / Math.max(durationS, 0.1));
  return ["-y", "-hide_banner", "-loglevel", "error", "-i", input,
    "-vf", `fps=${fps.toFixed(4)},scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`,
    "-frames:v", String(MAX_FRAMES), "-an", "-c:v", "libwebp", "-quality", "68", "-compression_level", "4", `${dir}/f%03d.webp`];
}

/** Which inbox fields become which published files, per table. */
export function planJobs(table, row) {
  const inbox = { ...(row.inbox ?? {}) };
  if (table === "projects" && row.inbox_path && !inbox.video_url) inbox.video_url = row.inbox_path;
  const id = row.id ?? row.key;
  const jobs = [];
  for (const [field, src] of Object.entries(inbox)) {
    if (field.startsWith("_")) continue; // instructions (_poster, _cover), not files
    const isParts = src && typeof src === "object" && Array.isArray(src.parts) && src.parts.length > 0;
    if (!src || (typeof src !== "string" && !isParts)) continue;
    const j = jobFor(table, row, id, field, src);
    if (j) jobs.push(j);
  }
  return jobs;
}

function jobFor(table, row, id, field, src) {
  switch (table) {
    case "projects":
      if (field === "video_url") return { field, src, kind: "video", out: `v/${id}.mp4`, audio: true, poster: `p/${id}.jpg`, teaser: `t/${id}.mp4`, master: true };
      if (field === "poster_url") return { field, src, kind: "image", out: `p/${id}.jpg` };
      return null;
    case "section_media": {
      // The hero assembly video is also cut into a WebP frame sequence (scrubbed on a canvas); its poster is the END frame.
      const seq = id === "hero-assembly";
      if (field === "desktop_url") return { field, src, kind: "loop", out: `s/${id}-desktop.mp4`, poster: `s/${id}-desktop.jpg`, posterAtEnd: seq, frames: seq ? { variant: "desktop", dir: `s/${id}-desktop`, ...FRAME_SIZES.desktop } : undefined };
      if (field === "mobile_url") return { field, src, kind: "loop", out: `s/${id}-mobile.mp4`, poster: `s/${id}-mobile.jpg`, posterAtEnd: seq, frames: seq ? { variant: "mobile", dir: `s/${id}-mobile`, ...FRAME_SIZES.mobile } : undefined };
      if (field === "poster_url") return { field, src, kind: "image", out: `s/${id}-poster.jpg` };
      return null;
    }
    case "brands":
      if (field === "logo_url") return { field, src, kind: "logo", out: `b/${id}.png` };
      return null;
    case "testimonials":
      if (field === "video_url") return { field, src, kind: "video", out: `v/testimonial-${id}.mp4`, audio: true, poster: `p/testimonial-${id}.jpg` };
      return null;
    case "services":
      if (field === "loop_url") return { field, src, kind: "loop", out: `s/service-${row.slug ?? id}.mp4`, poster: `s/service-${row.slug ?? id}.jpg` };
      return null;
    case "before_after":
      if (field === "before_url") return { field, src, kind: "video", out: `v/ba-${id}-before.mp4`, audio: false };
      if (field === "after_url") return { field, src, kind: "video", out: `v/ba-${id}-after.mp4`, audio: false, poster: `p/ba-${id}.jpg` };
      return null;
    default:
      return null;
  }
}

/** Max 1080p on the short side, even dimensions, never upscale. */
export const SCALE_1080 = "scale='if(gte(iw,ih),-2,min(1080,iw))':'if(gte(iw,ih),min(1080,ih),-2)'";

export function ffmpegArgs({ input, output, audio, loop = false, teaser = false, videoKbps = null }) {
  const a = ["-y", "-hide_banner", "-loglevel", "error", "-i", input];
  if (teaser) a.push("-ss", "0", "-t", "6");
  a.push("-map", "0:v:0");
  a.push("-vf", teaser ? `${SCALE_1080.replace(/1080/g, "720")},fps=30` : SCALE_1080);
  a.push("-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-preset", "veryfast");
  if (videoKbps) a.push("-b:v", `${videoKbps}k`, "-maxrate", `${Math.round(videoKbps * 1.3)}k`, "-bufsize", `${videoKbps * 2}k`);
  else a.push("-crf", teaser ? "26" : "23");
  if (audio && !loop && !teaser) a.push("-map", "0:a:0?", "-c:a", "aac", "-b:a", "128k");
  else a.push("-an");
  a.push("-movflags", "+faststart", output);
  return a;
}

/** Video bitrate (kbps) that keeps a file under MAX_BYTES for a given duration, with 5% headroom. */
export function bitrateFor(durationS, audio, maxBytes = MAX_BYTES) {
  const totalKbps = ((maxBytes * 8) / 1000 / Math.max(1, durationS)) * 0.95;
  return Math.max(300, Math.floor(totalKbps - (audio ? 128 : 0)));
}

export function posterArgs(input, output, atS, fromEnd = false) {
  const seek = fromEnd ? ["-sseof", "-0.25"] : ["-ss", String(atS)];
  return ["-y", "-hide_banner", "-loglevel", "error", ...seek, "-i", input, "-update", "1", "-frames:v", "1", "-vf", "scale='min(1600,iw)':-2", "-q:v", "3", output];
}

/** Shape the published snapshot. Keeps maintenance from the previous manifest. */
export function buildManifest(tables, previous) {
  return {
    version: 1,
    generated_at: new Date().toISOString(),
    maintenance: previous?.maintenance ?? { enabled: false, message: null },
    data: tables,
  };
}
