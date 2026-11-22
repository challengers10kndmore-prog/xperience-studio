import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Procedural stand-in humanoid (A-pose, ~3.2 units tall, feet at y=-1.6). Replaced by /models/daniel.glb when present. */
export function standInHumanoid(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, x: number, y: number, z = 0, rz = 0, rx = 0, sx = 1, sy = 1, sz = 1) => {
    g.scale(sx, sy, sz);
    g.rotateX(rx); g.rotateZ(rz);
    g.translate(x, y, z);
    parts.push(g.toNonIndexed());
  };
  // head + neck
  add(new THREE.SphereGeometry(0.2, 32, 24), 0, 1.36, 0, 0, 0, 0.92, 1.12, 1);
  add(new THREE.CylinderGeometry(0.075, 0.09, 0.18, 16), 0, 1.12);
  // torso (chest + waist) and hips
  add(new THREE.CapsuleGeometry(0.27, 0.42, 8, 24), 0, 0.72, 0, 0, 0, 1.15, 1, 0.68);
  add(new THREE.CapsuleGeometry(0.22, 0.12, 8, 20), 0, 0.28, 0, 0, 0, 1.2, 1, 0.75);
  // shoulders
  add(new THREE.SphereGeometry(0.11, 16, 12), -0.33, 0.98); add(new THREE.SphereGeometry(0.11, 16, 12), 0.33, 0.98);
  // arms in A-pose (upper, fore, hand)
  for (const s of [-1, 1]) {
    add(new THREE.CapsuleGeometry(0.075, 0.42, 6, 14), s * 0.44, 0.74, 0, s * 0.38);
    add(new THREE.CapsuleGeometry(0.065, 0.4, 6, 14), s * 0.62, 0.32, 0.02, s * 0.3);
    add(new THREE.SphereGeometry(0.07, 12, 10), s * 0.72, 0.03, 0.03, 0, 0, 0.8, 1.3, 0.6);
    // legs
    add(new THREE.CapsuleGeometry(0.11, 0.6, 6, 16), s * 0.14, -0.26, 0, s * -0.04);
    add(new THREE.CapsuleGeometry(0.085, 0.6, 6, 16), s * 0.17, -0.98, 0, s * -0.02);
    add(new THREE.BoxGeometry(0.13, 0.08, 0.3, 4, 2, 6), s * 0.18, -1.56, 0.07);
  }
  const g = mergeGeometries(parts.map((p) => { const q = new THREE.BufferGeometry(); q.setAttribute("position", p.getAttribute("position")); q.setAttribute("normal", p.getAttribute("normal")); return q; }))!;
  g.computeBoundingBox();
  return g;
}

/** Centre a loaded model's merged geometry, put feet at -1.6 and scale to 3.2 units tall. Drops tiny floaters. */
export function normaliseModel(root: THREE.Object3D): THREE.BufferGeometry | null {
  root.updateMatrixWorld(true);
  const geos: THREE.BufferGeometry[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry?.getAttribute("position")) return;
    const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone());
    const q = new THREE.BufferGeometry();
    q.setAttribute("position", g.getAttribute("position"));
    if (g.getAttribute("normal")) q.setAttribute("normal", g.getAttribute("normal")); else q.computeVertexNormals();
    q.applyMatrix4(m.matrixWorld);
    q.computeBoundingBox();
    geos.push(q);
  });
  if (!geos.length) return null;
  const sizes = geos.map((g) => g.boundingBox!.getSize(new THREE.Vector3()).length());
  const max = Math.max(...sizes);
  const kept = geos.filter((_, i) => sizes[i] > max * 0.05); // floaters
  const g = mergeGeometries(kept)!;
  g.computeBoundingBox();
  const bb = g.boundingBox!; const size = bb.getSize(new THREE.Vector3()); const c = bb.getCenter(new THREE.Vector3());
  const s = 3.2 / Math.max(size.y, 1e-6);
  g.translate(-c.x, -bb.min.y, -c.z); g.scale(s, s, s); g.translate(0, -1.6, 0);
  g.computeBoundingBox();
  return g;
}
