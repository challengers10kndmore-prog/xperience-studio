/**
 * In-browser compression before upload (adapted from the reference site's compressor).
 * Keeps the Supabase inbox (1 GB free) small and uploads fast. The sync Action re-encodes for the web afterwards,
 * so this pass aims for "visually lossless at 1080p" rather than smallest size.
 */
import type { FFmpeg } from "@ffmpeg/ffmpeg";

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
export const COMPRESS_THRESHOLD_BYTES = 45 * 1024 * 1024;
/** ffmpeg.wasm runs in a 2 GB heap; bigger inputs are uploaded as-is. */
export const WASM_INPUT_LIMIT = 1.6 * 1024 * 1024 * 1024;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi|wmv|mpe?g|m2ts|mts|3gp|ogv)$/i;

export class VideoCompressionError extends Error {
  constructor(message: string, readonly stage: "load" | "encode") { super(message); }
}

export const isVideoFile = (f: File) => f.type.startsWith("video/") || (!f.type && VIDEO_EXT.test(f.name));
export const shouldCompress = (f: File) => isVideoFile(f) && f.size > COMPRESS_THRESHOLD_BYTES && f.size < WASM_INPUT_LIMIT;

export const contentTypeFor = (f: File) => {
  if (f.type) return f.type;
  const ext = f.name.split(".").pop()?.toLowerCase();
  if (ext === "webm") return "video/webm";
  if (ext && VIDEO_EXT.test(f.name)) return "video/mp4";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "svg") return "image/svg+xml";
  return "application/octet-stream";
};

let loading: Promise<FFmpeg> | null = null;
async function load() {
  if (!loading) {
    loading = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
      const ff = new FFmpeg();
      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      ]);
      await ff.load({ coreURL, wasmURL });
      return ff;
    })().catch((e) => {
      loading = null;
      throw new VideoCompressionError(`Couldn't load the compressor (${e instanceof Error ? e.message : "network"}). The original file will be uploaded instead.`, "load");
    });
  }
  return loading;
}

export async function compressVideo(file: File, onProgress?: (r: number) => void, opts: { loop?: boolean } = {}): Promise<File> {
  if (!shouldCompress(file)) return file;
  const ff = await load();
  const { fetchFile } = await import("@ffmpeg/util");
  const handler = ({ progress }: { progress: number }) => Number.isFinite(progress) && onProgress?.(Math.min(1, Math.max(0, progress)));
  ff.on("progress", handler);
  try {
    await ff.writeFile("in", await fetchFile(file));
    const code = await ff.exec([
      "-i", "in",
      "-vf", "scale='if(gte(iw,ih),-2,min(1080,iw))':'if(gte(iw,ih),min(1080,ih),-2)'",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
      ...(opts.loop ? ["-an"] : ["-c:a", "aac", "-b:a", "160k"]),
      "-movflags", "+faststart", "out.mp4",
    ]);
    if (code !== 0) throw new VideoCompressionError(`Compressor exited with code ${code}.`, "encode");
    const data = (await ff.readFile("out.mp4")) as Uint8Array;
    if (data.byteLength < 1024) throw new VideoCompressionError("Compressor produced an empty file.", "encode");
    if (data.byteLength >= file.size) return file; // already efficient
    return new File([data.slice().buffer as ArrayBuffer], file.name.replace(/\.[^.]+$/, "") + "-web.mp4", { type: "video/mp4" });
  } finally {
    ff.off("progress", handler);
    await Promise.all([ff.deleteFile("in").catch(() => {}), ff.deleteFile("out.mp4").catch(() => {})]);
  }
}
