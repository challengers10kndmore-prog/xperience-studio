import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { XperienceLogo } from "@/components/brand/XperienceLogo";
import { Logo3D } from "@/three/Logo3D";
import { StudioLights } from "@/three/StudioLights";

/** Dev-only page for brand comparison screenshots (docs/brand). */
export default function BrandPreview() {
  return (
    <div className="grid min-h-dvh grid-cols-1 gap-8 bg-void p-8 md:grid-cols-2">
      <div className="grid place-items-center rounded-xl border border-line"><XperienceLogo className="w-[360px]" data-testid="logo-2d" /></div>
      <div className="h-[560px] rounded-xl border border-line" data-testid="logo-3d">
        <Canvas camera={{ position: [0, 0, 6], fov: 35 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <color attach="background" args={["#07060d"]} />
          <StudioLights />
          <Logo3D spin={false} />
          <EffectComposer><Bloom intensity={0.8} luminanceThreshold={0.85} mipmapBlur /></EffectComposer>
        </Canvas>
      </div>
    </div>
  );
}
