import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { BLADE_PATH, MARK } from "@/components/brand/logoGeometry";

/** Builds the extruded blade geometry from the same SVG path the 2D logo uses. */
function useBladeGeometry() {
  return useMemo(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${BLADE_PATH}"/></svg>`;
    const data = new SVGLoader().parse(svg);
    const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: 2, bevelEnabled: true, bevelThickness: 9, bevelSize: 11, bevelOffset: -9, bevelSegments: 8, curveSegments: 8,
    });
    // SVG is y-down: centre on the mark, then rotate 180° about X (flips y without inverting face winding).
    geo.translate(-MARK.cx, -MARK.cy, -1);
    geo.rotateX(Math.PI);
    geo.scale(1 / 100, 1 / 100, 1 / 100);
    geo.computeVertexNormals();
    return geo;
  }, []);
}

export type Logo3DHandle = { assemble: () => void };

type Props = {
  /** 0 = blades apart (off to the corners), 1 = assembled. */
  assembly?: React.MutableRefObject<number>;
  /** Normalised pointer (-1..1) for tilt. */
  pointer?: React.MutableRefObject<{ x: number; y: number }>;
  spin?: boolean;
};

export function Logo3D({ assembly, pointer, spin = true }: Props) {
  const group = useRef<THREE.Group>(null);
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const blade = useBladeGeometry();

  const chrome = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#dfe2ea"),
        metalness: 1,
        roughness: 0.2,
        iridescence: 0.55,
        iridescenceIOR: 1.6,
        iridescenceThicknessRange: [260, 520],
        clearcoat: 0.6,
        clearcoatRoughness: 0.15,
        envMapIntensity: 1,
      }),
    [],
  );
  const ringMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#7c3aed", emissive: new THREE.Color("#7c3aed"), emissiveIntensity: 2.4, metalness: 0.4, roughness: 0.3, toneMapped: false }),
    [],
  );

  const angle = THREE.MathUtils.degToRad(MARK.bladeAngle);

  useFrame((state, dt) => {
    const a = assembly ? assembly.current : 1;
    const e = 1 - Math.pow(1 - THREE.MathUtils.clamp(a, 0, 1), 3);
    if (left.current && right.current) {
      const off = (1 - e) * 4.2;
      left.current.position.set(-off, off, 0);
      right.current.position.set(off, off, 0);
      left.current.rotation.set(0, 0.35, angle + (1 - e) * 0.9);
      right.current.rotation.set(0, -0.35, -angle - (1 - e) * 0.9);
    }
    if (ring.current) {
      ring.current.scale.setScalar(0.6 + 0.4 * e);
      ringMat.emissiveIntensity = 0.3 + 1.1 * e + Math.sin(state.clock.elapsedTime * 1.4) * 0.25;
      // hue drift violet -> blue
      ringMat.emissive.setHSL(0.74 - 0.1 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 0.5)), 0.9, 0.42);
    }
    if (group.current) {
      const p = pointer?.current ?? { x: 0, y: 0 };
      const targetY = p.x * 0.45 + (spin ? Math.sin(state.clock.elapsedTime * 0.35) * 0.15 : 0);
      const targetX = -p.y * 0.3 + 0.12;
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, targetY, 4, dt);
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, targetX, 4, dt);
    }
  });

  return (
    <group ref={group}>
      <mesh ref={ring} material={ringMat}>
        <torusGeometry args={[MARK.ringR / 100, MARK.ringW / 200, 24, 160]} />
      </mesh>
      <mesh ref={left} geometry={blade} material={chrome} rotation={[0, 0, angle]} />
      <mesh ref={right} geometry={blade} material={chrome} rotation={[0, 0, -angle]} position={[0, 0, 0.12]} />
    </group>
  );
}
