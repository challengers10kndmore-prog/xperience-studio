import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

/** 83.4 -> "01:23" ; 3725 -> "1:02:05" */
export function formatDuration(s?: number | null) {
  if (s == null || !Number.isFinite(s)) return "--:--";
  const t = Math.max(0, Math.round(s));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  const mm = String(m).padStart(2, "0"), ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** SMPTE-style timecode HH:MM:SS:FF */
export function timecode(seconds: number, fps = 24) {
  const t = Math.max(0, seconds);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60), f = Math.floor((t % 1) * fps);
  return [h, m, s, f].map((n) => String(n).padStart(2, "0")).join(":");
}

export function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  const u = ["KB", "MB", "GB"]; let i = -1; let v = b;
  do { v /= 1024; i++; } while (v >= 1024 && i < u.length - 1);
  return `${v.toFixed(v < 10 ? 1 : 0)} ${u[i]}`;
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
