import { lazy, Suspense } from "react";
import { Hero } from "@/components/sections/Hero";
import { useSite } from "@/data/DataProvider";

const BelowFold = lazy(() => import("./BelowFold"));

export default function Home() {
  // wait for the saved section order before mounting the sections (pinned sections must not be reordered after mount)
  const { isLoading } = useSite();
  return (
    <>
      <Hero />
      {/* stable wrapper: React inserts the lazy sections here, never next to a GSAP pin-spacer */}
      <div>
        <Suspense fallback={<div className="min-h-dvh" />}>
          {isLoading ? <div className="min-h-dvh" /> : <BelowFold />}
        </Suspense>
      </div>
    </>
  );
}
