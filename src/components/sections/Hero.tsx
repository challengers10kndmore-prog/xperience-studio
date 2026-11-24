// The hero is video-driven, no three.js. Once the hero film (intro + loop) is uploaded it takes over;
// until then the frame-sequence "Assembly" hero runs exactly as before.
import { useSiteData } from "@/data/DataProvider";
import { usePlayer } from "@/components/media/Player";
import { HeroVideo } from "@/components/hero/HeroVideo";
import { HeroFilm, hasHeroFilm } from "@/components/hero/HeroFilm";

export function Hero() {
  const { sectionMedia } = useSiteData();
  const open = usePlayer();
  return hasHeroFilm(sectionMedia) ? <HeroFilm onOpen={open} /> : <HeroVideo />;
}
