import { lazy, Suspense } from "react";
import { Hero } from "@/components/sections/Hero";

const BelowFold = lazy(() => import("./BelowFold"));

export default function Home() {
  return (
    <>
      <Hero />
      {/* stable wrapper: React inserts the lazy sections here, never next to a GSAP pin-spacer */}
      <div>
        <Suspense fallback={<div className="min-h-dvh" />}>
          <BelowFold />
        </Suspense>
      </div>
    </>
  );
}
