import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { MeshReflectorMaterial, PerspectiveCamera, View } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Logo3D } from "./Logo3D";
import { StudioLights } from "./StudioLights";

function Glow() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d")!; const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, "rgba(124,58,237,0.9)"); gr.addColorStop(0.35, "rgba(47,107,255,0.35)"); gr.addColorStop(1, "rgba(7,6,13,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return <sprite scale={[6.5, 6.5, 1]} position={[0, 0, -0.6]}><spriteMaterial map={tex} blending={THREE.AdditiveBlending} transparent depthWrite={false} /></sprite>;
}

function Scene({ assembly, pointer }: { assembly: MutableRefObject<number>; pointer: MutableRefObject<{ x: number; y: number }> }) {
  const shown = useRef(0);
  useFrame((_, dt) => { shown.current = THREE.MathUtils.damp(shown.current, assembly.current, 2.2, dt); });
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.6, 7.2]} fov={36} />
      <fog attach="fog" args={["#07060d", 7, 15]} />
      <StudioLights />
      <group position={[0, 0.55, 0]} scale={0.85}>
        <Glow />
        <Logo3D assembly={shown} pointer={pointer} />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.25, 0]}>
        <planeGeometry args={[40, 40]} />
        <MeshReflectorMaterial blur={[300, 80]} resolution={512} mixBlur={1} mixStrength={18} roughness={0.85} depthScale={1.1}
          minDepthThreshold={0.4} maxDepthThreshold={1.4} color="#0b0914" metalness={0.6} mirror={0.6} />
      </mesh>
      <pointLight position={[0, -0.6, 1.5]} intensity={8} color="#7c3aed" distance={6} />
      <pointLight position={[2.5, -0.8, 0]} intensity={5} color="#2f6bff" distance={6} />
    </>
  );
}

export default function Footer3D({ assembly, pointer }: { assembly: MutableRefObject<number>; pointer: MutableRefObject<{ x: number; y: number }> }) {
  return (
    <View className="absolute inset-0">
      <Scene assembly={assembly} pointer={pointer} />
    </View>
  );
}
