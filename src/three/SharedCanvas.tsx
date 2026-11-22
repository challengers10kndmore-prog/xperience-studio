import { Canvas } from "@react-three/fiber";
import { View, Preload } from "@react-three/drei";
import * as THREE from "three";

/**
 * The ONE WebGL renderer for the whole site. Sections render <View> elements that draw into this canvas
 * with scissoring, so the hero particles, premium transitions and footer logo share one GL context.
 * Views that scroll off-screen are skipped by drei automatically.
 */
export default function SharedCanvas({ mobile }: { mobile: boolean }) {
  return (
    <Canvas
      eventSource={document.getElementById("root")!}
      eventPrefix="client"
      dpr={[1, mobile ? 1.5 : 2]}
      gl={{ antialias: !mobile, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 5 }}
      aria-hidden
    >
      <View.Port />
      <Preload all />
    </Canvas>
  );
}
