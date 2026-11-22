import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, PerspectiveCamera, View } from "@react-three/drei";
import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { SiteProject } from "@/data/placeholders";
import { mediaUrl, isPlayableUrl } from "@/lib/media";
import { standInHumanoid, normaliseModel } from "./standIn";

export type HeroSignals = {
  /** 0..1 assembly target set by interaction (damped inside). */
  energy: MutableRefObject<number>;
  /** 0..1 scroll-out progress of the hero. */
  scroll: MutableRefObject<number>;
  pointer: MutableRefObject<{ x: number; y: number }>;
};

const MODEL_URL = "/models/daniel.glb";

// ---------------------------------------------------------------- model
type Model = { geometry: THREE.BufferGeometry; scene: THREE.Object3D | null; animations: THREE.AnimationClip[] };

function useModel(): Model | null {
  const [model, setModel] = useState<Model | null>(null);
  const { gl } = useThree();
  useEffect(() => {
    let alive = true;
    const fallback = () => alive && setModel({ geometry: standInHumanoid(), scene: null, animations: [] });
    fetch(MODEL_URL, { method: "HEAD" })
      .then((r) => {
        const type = r.headers.get("content-type") ?? "";
        if (!r.ok || type.includes("text/html")) return fallback();
        const ktx2 = new KTX2Loader().setTranscoderPath("https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/libs/basis/").detectSupport(gl);
        const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(ktx2);
        loader.load(MODEL_URL, (gltf) => {
          const geometry = normaliseModel(gltf.scene);
          if (!geometry) return fallback();
          // put the visible mesh in the same frame as the sampled geometry
          const box = new THREE.Box3().setFromObject(gltf.scene); const size = box.getSize(new THREE.Vector3()); const c = box.getCenter(new THREE.Vector3());
          const s = 3.2 / size.y; gltf.scene.position.set(-c.x * s, -box.min.y * s - 1.6, -c.z * s); gltf.scene.scale.setScalar(s);
          if (alive) setModel({ geometry, scene: gltf.scene, animations: gltf.animations });
        }, undefined, fallback);
      })
      .catch(fallback);
    return () => { alive = false; };
  }, [gl]);
  return model;
}

// ---------------------------------------------------------------- particles
const pVert = /* glsl */ `
uniform float uProgress; uniform float uScroll; uniform float uTime; uniform float uSize; uniform float uPixelRatio;
attribute vec3 aHome; attribute vec3 aScatter; attribute float aDelay; attribute float aRand;
varying float vT; varying float vH; varying float vA;
void main() {
  float t = smoothstep(aDelay, aDelay + 0.3, uProgress);
  vec3 drift = vec3(sin(uTime * 0.6 + aRand * 40.0), cos(uTime * 0.5 + aRand * 30.0), sin(uTime * 0.4 + aRand * 20.0)) * 0.12 * (1.0 - t);
  vec3 p = mix(aScatter + drift, aHome, t);
  p.y += uScroll * (2.0 + aRand * 6.0);           // disperse upward on scroll-out
  p.xz *= 1.0 + uScroll * aRand * 1.5;
  vT = t; vH = clamp((aHome.y + 1.6) / 3.2, 0.0, 1.0);
  vA = (1.0 - uScroll) * mix(0.55, 1.0, t);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPixelRatio * (0.6 + aRand * 0.8) * (1.0 / -mv.z);
}`;
const pFrag = /* glsl */ `
precision highp float;
uniform float uFade; varying float vT; varying float vH; varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5; float d = length(c);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d);
  vec3 mag = vec3(0.784, 0.294, 1.0), vio = vec3(0.486, 0.227, 0.929), blu = vec3(0.184, 0.42, 1.0);
  vec3 col = vH < 0.5 ? mix(blu, vio, vH * 2.0) : mix(vio, mag, (vH - 0.5) * 2.0);
  col += vec3(0.25) * vT * a;
  gl_FragColor = vec4(col * a, a * vA * uFade);
}`;

function Particles({ geometry, count, signals, progress }: { geometry: THREE.BufferGeometry; count: number; signals: HeroSignals; progress: MutableRefObject<number> }) {
  const { gl } = useThree();
  const geo = useMemo(() => {
    const mesh = new THREE.Mesh(geometry);
    const sampler = new MeshSurfaceSampler(mesh).build();
    const home = new Float32Array(count * 3), scatter = new Float32Array(count * 3), delay = new Float32Array(count), rand = new Float32Array(count);
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      sampler.sample(v);
      home.set([v.x, v.y, v.z], i * 3);
      const r = 2.5 + Math.random() * 4.5, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      scatter.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.7 + 0.4, r * Math.sin(ph) * Math.sin(th) - 1], i * 3);
      delay[i] = ((v.y + 1.6) / 3.2) * 0.55 + Math.random() * 0.15; // assemble feet-first
      rand[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(home, 3));
    g.setAttribute("aHome", new THREE.BufferAttribute(home, 3));
    g.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
    g.setAttribute("aDelay", new THREE.BufferAttribute(delay, 1));
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);
    return g;
  }, [geometry, count]);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: pVert, fragmentShader: pFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uProgress: { value: 0 }, uScroll: { value: 0 }, uTime: { value: 0 }, uSize: { value: 26 }, uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) }, uFade: { value: 1 } },
  }), [gl]);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  useFrame((s) => {
    const u = mat.uniforms;
    u.uProgress.value = progress.current;
    u.uScroll.value = signals.scroll.current;
    u.uTime.value = s.clock.elapsedTime;
    // particles thin out once the solid figure has taken over
    u.uFade.value = 1 - THREE.MathUtils.smoothstep(progress.current, 0.94, 1.0) * 0.75;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

// ---------------------------------------------------------------- solid figure (rim light + scan line)
const sVert = /* glsl */ `
varying vec3 vN; varying vec3 vV; varying float vY;
void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vY = wp.y; vN = normalize(normalMatrix * normal); vec4 mv = viewMatrix * wp; vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const sFrag = /* glsl */ `
precision highp float;
uniform float uOpacity; uniform float uScan; uniform float uTime;
varying vec3 vN; varying vec3 vV; varying float vY;
void main() {
  float fres = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.5);
  vec3 base = vec3(0.06, 0.05, 0.1) + vec3(0.12, 0.12, 0.16) * max(dot(normalize(vN), normalize(vec3(0.4, 0.8, 0.6))), 0.0);
  vec3 rim = mix(vec3(0.184, 0.42, 1.0), vec3(0.784, 0.294, 1.0), clamp((vY + 1.6) / 3.2, 0.0, 1.0)) * fres * 2.2;
  float scanY = mix(-1.8, 1.9, uScan);
  float band = smoothstep(0.08, 0.0, abs(vY - scanY));
  float lines = 0.5 + 0.5 * sin(vY * 140.0 + uTime * 4.0);
  vec3 col = base + rim + vec3(0.7, 0.55, 1.0) * band * 1.6 + vec3(0.1, 0.08, 0.2) * lines * 0.15;
  gl_FragColor = vec4(col, uOpacity);
}`;

function Solid({ model, progress, pointer }: { model: Model; progress: MutableRefObject<number>; pointer: HeroSignals["pointer"] }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: sVert, fragmentShader: sFrag, transparent: true, uniforms: { uOpacity: { value: 0 }, uScan: { value: 0 }, uTime: { value: 0 } } }), []);
  const scan = useRef(0);
  const mixer = useMemo(() => (model.scene && model.animations.length ? new THREE.AnimationMixer(model.scene) : null), [model]);
  const head = useMemo(() => { let h: THREE.Object3D | null = null; model.scene?.traverse((o) => { if (!h && /head/i.test(o.name) && (o as THREE.Bone).isBone) h = o; }); return h as THREE.Object3D | null; }, [model]);
  useEffect(() => {
    model.scene?.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.userData.orig = m.material; m.material = mat; } });
    if (mixer) mixer.clipAction(model.animations.find((a) => /idle|breath/i.test(a.name)) ?? model.animations[0]).play();
    return () => { mat.dispose(); mixer?.stopAllAction(); };
  }, [model, mat, mixer]);
  useFrame((s, dt) => {
    const k = THREE.MathUtils.smoothstep(progress.current, 0.9, 1.0);
    mat.uniforms.uOpacity.value = k;
    scan.current = k > 0.01 ? Math.min(1, scan.current + dt * 0.45) : 0;
    mat.uniforms.uScan.value = scan.current; mat.uniforms.uTime.value = s.clock.elapsedTime;
    mixer?.update(dt);
    if (head) { head.rotation.y = THREE.MathUtils.damp(head.rotation.y, pointer.current.x * 0.5, 4, dt); head.rotation.x = THREE.MathUtils.damp(head.rotation.x, pointer.current.y * 0.2, 4, dt); }
  });
  if (model.scene) return <primitive object={model.scene} />;
  return <mesh geometry={model.geometry} material={mat} />;
}

// ---------------------------------------------------------------- video shards
function Shard({ p, i, n, appear, scroll, onOpen }: { p: SiteProject; i: number; n: number; appear: MutableRefObject<number>; scroll: MutableRefObject<number>; onOpen: (p: SiteProject) => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  const tex = useMemo(() => {
    const url = mediaUrl(p.teaser_url || p.video_url);
    if (url && isPlayableUrl(url)) {
      const v = document.createElement("video");
      Object.assign(v, { src: url, muted: true, loop: true, playsInline: true, crossOrigin: "anonymous", preload: "auto" });
      v.play().catch(() => {});
      const t = new THREE.VideoTexture(v); t.colorSpace = THREE.SRGBColorSpace; return t;
    }
    const c = document.createElement("canvas"); c.width = 320; c.height = 180;
    const g = c.getContext("2d")!; g.fillStyle = "#07060D"; g.fillRect(0, 0, 320, 180);
    const gr = g.createRadialGradient(100 + i * 30, 60, 0, 100 + i * 30, 60, 220);
    gr.addColorStop(0, p.discipline === "ai" ? "rgba(47,107,255,.8)" : "rgba(200,75,255,.8)"); gr.addColorStop(1, "rgba(7,6,13,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 320, 180);
    g.fillStyle = "rgba(230,232,238,.9)"; g.font = "600 22px 'Clash Display', sans-serif"; g.fillText(p.title, 16, 160);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [p, i]);
  useEffect(() => () => { (tex.image as HTMLVideoElement)?.pause?.(); tex.dispose(); }, [tex]);
  useFrame((s, dt) => {
    const m = ref.current; if (!m) return;
    const a = appear.current;
    const t = s.clock.elapsedTime * 0.18 + (i / n) * Math.PI * 2;
    const r = 1.35 + (i % 2) * 0.3;
    m.position.set(Math.cos(t) * r, 0.2 + Math.sin(t * 1.7 + i) * 0.5 + (i % 3) * 0.25 - 0.25, Math.sin(t) * r * 0.5 + scroll.current * 9);
    m.lookAt(0, m.position.y, 6);
    // shards passing in front of the copy (left of the figure, near the camera) fade back
    const front = THREE.MathUtils.smoothstep(m.position.z, 0.2, 0.7) * THREE.MathUtils.smoothstep(-m.position.x, 0.4, 1.2);
    const target = a * (hover ? 1.18 : 1) * (1 - front * 0.6);
    m.scale.setScalar(THREE.MathUtils.damp(m.scale.x, target, 6, dt));
    (m.material as THREE.MeshBasicMaterial).opacity = a * (1 - scroll.current);
  });
  return (
    <mesh ref={ref} scale={0} onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.dataset.cursorHint = "play"; }}
      onPointerOut={() => { setHover(false); delete document.body.dataset.cursorHint; }} onClick={(e) => { e.stopPropagation(); onOpen(p); }}>
      <planeGeometry args={p.aspect_ratio === "9:16" ? [0.42, 0.75] : [0.78, 0.44]} />
      <meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} toneMapped={false} />
      {hover && <Html center position={[0, -0.45, 0]} className="pointer-events-none whitespace-nowrap rounded-full bg-void/80 px-3 py-1 font-label text-[0.55rem] tracking-[0.2em] text-chrome backdrop-blur">{p.title.toUpperCase()}</Html>}
    </mesh>
  );
}

// ---------------------------------------------------------------- scene
function Scene({ signals, shards, mobile, onOpen }: { signals: HeroSignals; shards: SiteProject[]; mobile: boolean; onOpen: (p: SiteProject) => void }) {
  const model = useModel();
  const progress = useRef(0);
  const appear = useRef(0);
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    progress.current = THREE.MathUtils.damp(progress.current, signals.energy.current, 1.6, dt);
    appear.current = THREE.MathUtils.damp(appear.current, progress.current > 0.95 ? 1 : 0, 3, dt);
    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, signals.pointer.current.x * 0.35, 3, dt);
      group.current.position.x = mobile ? 0 : 2.35;
    }
  });
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.1, 7]} fov={mobile ? 48 : 38} />
      <group ref={group}>
        {model && <Particles geometry={model.geometry} count={mobile ? 40000 : 60000} signals={signals} progress={progress} />}
        {model && <Solid model={model} progress={progress} pointer={signals.pointer} />}
        {shards.map((p, i) => <Shard key={p.id} p={p} i={i} n={shards.length} appear={appear} scroll={signals.scroll} onOpen={onOpen} />)}
      </group>
    </>
  );
}

export default function HeroAssembly(props: { signals: HeroSignals; shards: SiteProject[]; mobile: boolean; onOpen: (p: SiteProject) => void }) {
  return (
    <View className="absolute inset-0">
      <Scene {...props} />
    </View>
  );
}
