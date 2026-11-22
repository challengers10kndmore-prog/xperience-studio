import { Environment, Lightformer } from "@react-three/drei";

/** Procedural studio environment (no HDR download): violet / blue / magenta softboxes for chrome reflections. */
export function StudioLights() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <Environment resolution={256} frames={1} environmentIntensity={1.3}>
        <color attach="background" args={["#07060d"]} />
        <Lightformer form="rect" intensity={2.2} color="#7c3aed" position={[-5, 2, 3]} scale={[4, 8, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#2f6bff" position={[5, -1, 3]} scale={[4, 8, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#c84bff" position={[0, 5, -2]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#ffffff" position={[3, 3, 5]} rotation={[0, -0.5, 0.6]} scale={[0.6, 8, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#ffffff" position={[-4, -2, 5]} rotation={[0, 0.6, -0.4]} scale={[0.4, 6, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#dfe3ff" position={[0, 1.5, 6]} scale={[8, 2.2, 1]} />
        <Lightformer form="rect" intensity={0.7} color="#7c3aed" position={[0, -2, 6]} scale={[8, 1.6, 1]} />
        <Lightformer form="ring" intensity={1} color="#e6e8ee" position={[0, -4, 2]} scale={3} />
      </Environment>
    </>
  );
}
