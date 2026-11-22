import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type VideoHTMLAttributes } from "react";
import { useInView } from "@/hooks/useInView";
import { isPlayableUrl, mediaUrl } from "@/lib/media";

type Props = Omit<VideoHTMLAttributes<HTMLVideoElement>, "src" | "poster"> & {
  src?: string | null;
  poster?: string | null;
  /** Autoplay (muted) while visible, pause when off-screen. */
  autoPlayInView?: boolean;
  /** Start loading this far before entering the viewport. */
  margin?: string;
  play?: boolean;
};

/**
 * Below-the-fold friendly <video>: preload="none", poster first, src attached only near the viewport,
 * paused off-screen. Never uses release-asset URLs (served as octet-stream).
 */
export const LazyVideo = forwardRef<HTMLVideoElement, Props>(function LazyVideo(
  { src, poster, autoPlayInView = true, margin = "300px", play, className, ...rest }, ref,
) {
  const v = useRef<HTMLVideoElement>(null);
  useImperativeHandle(ref, () => v.current as HTMLVideoElement);
  const near = useInView(v, margin);
  const visible = useInView(v, "0px");
  const [armed, setArmed] = useState(false);
  const url = mediaUrl(src);
  const playable = url && isPlayableUrl(url) ? url : undefined;

  useEffect(() => { if (near) setArmed(true); }, [near]);

  useEffect(() => {
    const el = v.current;
    if (!el || !armed || !playable) return;
    const shouldPlay = play ?? (autoPlayInView && visible);
    if (shouldPlay) el.play().catch(() => {});
    else el.pause();
  }, [armed, visible, play, autoPlayInView, playable]);

  return (
    <video
      ref={v}
      className={className}
      src={armed ? playable : undefined}
      poster={mediaUrl(poster)}
      muted
      playsInline
      loop
      preload="none"
      disablePictureInPicture
      {...rest}
    />
  );
});
