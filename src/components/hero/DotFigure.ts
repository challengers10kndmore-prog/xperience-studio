/**
 * Placeholder until the hero videos exist: a cheap 2D-canvas figure made of ~1,800 brand-gradient dots that
 * assembles / scatters with the same progress value the real frame sequence uses.
 */
type Dot = { hx: number; hy: number; sx: number; sy: number; d: number; r: number; c: string };

function silhouette(): ImageData {
  const c = document.createElement("canvas"); c.width = 200; c.height = 400;
  const g = c.getContext("2d")!; g.fillStyle = "#fff";
  const ell = (x: number, y: number, rx: number, ry: number, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); };
  const limb = (x1: number, y1: number, x2: number, y2: number, w: number) => { g.lineWidth = w; g.lineCap = "round"; g.strokeStyle = "#fff"; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
  ell(100, 42, 22, 27);                       // head
  limb(100, 66, 100, 80, 16);                 // neck
  ell(100, 128, 44, 54);                      // chest
  ell(100, 186, 34, 30);                      // hips
  limb(62, 92, 40, 170, 17); limb(40, 170, 30, 232, 14);     // left arm
  limb(138, 92, 160, 170, 17); limb(160, 170, 170, 232, 14); // right arm
  limb(86, 200, 80, 300, 22); limb(80, 300, 78, 384, 17);    // left leg
  limb(114, 200, 120, 300, 22); limb(120, 300, 122, 384, 17); // right leg
  return g.getImageData(0, 0, 200, 400);
}

const BRAND = ["#2F6BFF", "#5A4BF5", "#7C3AED", "#A142F6", "#C84BFF"];

export function makeDots(n: number): Dot[] {
  const img = silhouette(); const pts: [number, number][] = [];
  for (let y = 0; y < 400; y += 3) for (let x = 0; x < 200; x += 3) if (img.data[(y * 200 + x) * 4 + 3] > 128) pts.push([x / 200, y / 400]);
  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const [hx, hy] = pts[Math.floor(Math.random() * pts.length)];
    const a = Math.random() * Math.PI * 2, rr = 0.35 + Math.random() * 0.9;
    dots.push({
      hx: hx + (Math.random() - 0.5) * 0.012, hy: hy + (Math.random() - 0.5) * 0.006,
      sx: 0.5 + Math.cos(a) * rr, sy: 0.5 + Math.sin(a) * rr * 0.8,
      d: (1 - hy) * 0.45 + Math.random() * 0.25, // assemble feet-first
      r: 0.6 + Math.random() * 1.3,
      c: BRAND[Math.min(BRAND.length - 1, Math.floor((1 - hy) * BRAND.length))],
    });
  }
  return dots;
}

export function drawDots(ctx: CanvasRenderingContext2D, dots: Dot[], p: number, w: number, h: number, t: number, cx: number) {
  ctx.clearRect(0, 0, w, h);
  const figH = h * 0.78, figW = figH / 2;
  const ox = w * cx - figW / 2, oy = h * 0.12;
  ctx.globalCompositeOperation = "lighter";
  for (const d of dots) {
    const k = Math.min(1, Math.max(0, (p - d.d) / 0.3));
    const e = k * k * (3 - 2 * k);
    const breathe = e > 0.99 ? Math.sin(t * 1.4 + d.hy * 6) * 0.0025 : 0;
    const x = ox + (d.sx + (d.hx - d.sx) * e) * figW + Math.sin(t * 0.7 + d.r * 9) * (1 - e) * 8;
    const y = oy + (d.sy + (d.hy - d.sy) * e + breathe) * figH;
    ctx.globalAlpha = 0.35 + 0.65 * e;
    ctx.fillStyle = d.c;
    ctx.fillRect(x, y, d.r * (1 + e * 0.4), d.r * (1 + e * 0.4));
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}
