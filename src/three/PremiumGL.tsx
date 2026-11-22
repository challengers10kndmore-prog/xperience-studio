import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera, View } from "@react-three/drei";
import * as THREE from "three";
import type { SiteProject } from "@/data/placeholders";

const vert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uA; uniform sampler2D uB;
uniform vec2 uSizeA; uniform vec2 uSizeB; uniform vec2 uRes;
uniform float uP; uniform float uMode; uniform float uTime;

vec2 cover(vec2 uv, vec2 size) {
  float rs = uRes.x / uRes.y, ri = size.x / max(size.y, 1.0);
  vec2 s = rs < ri ? vec2(rs / ri, 1.0) : vec2(1.0, ri / rs);
  return (uv - 0.5) * s + 0.5;
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; } return v; }

void main() {
  vec2 uv = vUv; float p = clamp(uP, 0.0, 1.0); vec3 col;
  if (uMode < 0.5) {
    // AI: liquid light. Flow-field displacement + noisy dissolve front.
    float n = fbm(uv * 3.0 + vec2(uTime * 0.05, -uTime * 0.03));
    vec2 flow = vec2(fbm(uv * 4.0 + 7.3), fbm(uv * 4.0 + 1.7)) - 0.5;
    vec4 a = texture2D(uA, cover(uv + flow * 0.5 * p, uSizeA));
    vec4 b = texture2D(uB, cover(uv - flow * 0.5 * (1.0 - p), uSizeB));
    float front = smoothstep(p - 0.12, p + 0.12, n * 0.7 + (1.0 - uv.y) * 0.3);
    col = mix(b.rgb, a.rgb, front);
    float edge = 1.0 - abs(front - 0.5) * 2.0;
    col += vec3(0.32, 0.18, 1.0) * pow(edge, 6.0) * 0.9 * step(0.001, p) * step(p, 0.999);
  } else {
    // Editing: hard cut in horizontal slices with staggered timing and chromatic edge.
    float slices = 14.0; float row = floor(uv.y * slices);
    float d = hash(vec2(row, 3.1)) * 0.45;
    float lp = clamp((p - d) / 0.55, 0.0, 1.0);
    lp = lp * lp * (3.0 - 2.0 * lp);
    float off = (1.0 - lp) * 0.25;
    vec2 ua = cover(uv + vec2(lp * 0.15, 0.0), uSizeA);
    vec2 ub = cover(uv - vec2(off, 0.0), uSizeB);
    bool showB = uv.x < lp;
    vec3 a = texture2D(uA, ua).rgb;
    vec3 b = vec3(texture2D(uB, ub + vec2(0.004 * (1.0 - lp), 0.0)).r, texture2D(uB, ub).g, texture2D(uB, ub - vec2(0.004 * (1.0 - lp), 0.0)).b);
    col = showB ? b : a;
    float e = smoothstep(0.012, 0.0, abs(uv.x - lp)) * step(0.001, lp) * step(lp, 0.999);
    col += vec3(0.78, 0.29, 1.0) * e * 1.4;
  }
  gl_FragColor = vec4(col, 1.0);
}`;

function artTexture(p: SiteProject) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 288;
  const g = c.getContext("2d")!;
  let h = 0; for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  g.fillStyle = "#07060D"; g.fillRect(0, 0, 512, 288);
  const blob = (x: number, y: number, r: number, color: string) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, color); gr.addColorStop(1, "rgba(7,6,13,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 512, 288);
  };
  const x = 100 + (h % 300), y = 60 + ((h >> 3) % 160);
  blob(x, y, 260, p.discipline === "ai" ? "rgba(47,107,255,0.55)" : "rgba(200,75,255,0.5)");
  blob(512 - x, 288 - y, 220, "rgba(124,58,237,0.45)");
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Quad({ films, videos, progress }: Props) {
  const { size } = useThree();
  const art = useMemo(() => films.map(artTexture), [films]);
  const vtex = useRef<(THREE.VideoTexture | null)[]>([]);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, depthTest: false, depthWrite: false,
    uniforms: { uA: { value: null }, uB: { value: null }, uSizeA: { value: new THREE.Vector2(16, 9) }, uSizeB: { value: new THREE.Vector2(16, 9) }, uRes: { value: new THREE.Vector2(1, 1) }, uP: { value: 0 }, uMode: { value: 0 }, uTime: { value: 0 } },
  }), []);

  useEffect(() => () => { art.forEach((t) => t.dispose()); vtex.current.forEach((t) => t?.dispose()); mat.dispose(); }, [art, mat]);

  const tex = (i: number): [THREE.Texture, THREE.Vector2] => {
    const v = videos.current[i];
    if (v && v.readyState >= 2 && v.videoWidth) {
      let t = vtex.current[i];
      if (!t || t.image !== v) { t?.dispose(); t = new THREE.VideoTexture(v); t.colorSpace = THREE.SRGBColorSpace; vtex.current[i] = t; }
      return [t, new THREE.Vector2(v.videoWidth, v.videoHeight)];
    }
    return [art[i], new THREE.Vector2(512, 288)];
  };

  useFrame((s) => {
    const n = films.length;
    const sp = THREE.MathUtils.clamp(progress.current, 0, n - 1);
    const i = Math.min(Math.floor(sp), n - 2);
    const [a, sa] = tex(i); const [b, sb] = tex(i + 1);
    const u = mat.uniforms;
    u.uA.value = a; u.uB.value = b; u.uSizeA.value.copy(sa); u.uSizeB.value.copy(sb);
    u.uP.value = sp - i; u.uMode.value = films[i + 1].discipline === "ai" ? 0 : 1;
    u.uRes.value.set(size.width, size.height); u.uTime.value = s.clock.elapsedTime;
  });

  return <mesh material={mat} frustumCulled={false}><planeGeometry args={[2, 2]} /></mesh>;
}

type Props = { films: SiteProject[]; videos: MutableRefObject<(HTMLVideoElement | null)[]>; progress: MutableRefObject<number> };

export default function PremiumGL(props: Props) {
  return (
    <View className="absolute inset-0" style={{ zIndex: 15 }}>
      <OrthographicCamera makeDefault position={[0, 0, 1]} />
      <Quad {...props} />
    </View>
  );
}
