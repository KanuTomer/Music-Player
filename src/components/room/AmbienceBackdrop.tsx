import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { AmbienceProfile } from "@/lib/rooms.functions";

type AmbienceBackdropProps = {
  active: boolean;
  level: number;
  eventPulse: number;
  profile: AmbienceProfile | null;
  sceneSlug: string;
};

export function AmbienceBackdrop({
  active,
  level,
  eventPulse,
  profile,
  sceneSlug,
}: AmbienceBackdropProps) {
  const theme = profile?.visual_theme;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const constructionDust = sceneSlug === "raj-mistri";
  const normalizedLevel = Math.min(100, Math.max(0, level)) / 100;
  const opacityFloor = theme?.opacity_floor ?? 0.34;
  const opacityCeiling = theme?.opacity_ceiling ?? 0.66;
  const style = {
    "--ambience-accent": theme?.accent ?? "#e59f32",
    "--ambience-haze": theme?.haze ?? "#4f3828",
    "--ambience-strength": String(0.38 + normalizedLevel * 0.38),
    "--ambience-overlay-opacity": String(
      opacityFloor + (opacityCeiling - opacityFloor) * normalizedLevel,
    ),
    "--ambience-overlay-blend": theme?.blend_mode ?? "screen",
  } as CSSProperties;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = theme?.playback_rate ?? 1;
    if (active && !reducedMotion) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [active, reducedMotion, theme?.playback_rate, theme?.overlay_url]);

  return (
    <div
      aria-hidden
      data-active={active ? "true" : "false"}
      data-pattern={constructionDust ? "construction-dust" : (theme?.pattern ?? "dust")}
      data-scene={sceneSlug}
      className="ambience-backdrop pointer-events-none absolute inset-0 z-10 overflow-hidden"
      style={style}
    >
      {theme?.overlay_url && !constructionDust ? (
        <video
          ref={videoRef}
          key={theme.overlay_url}
          className="ambience-overlay absolute inset-0 size-full object-cover"
          src={theme.overlay_url}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
        />
      ) : null}
      <span className="ambience-haze absolute inset-[-18%]" />
      <span className="ambience-pattern absolute inset-0" />
      {constructionDust ? <span className="ambience-construction-dust absolute inset-0" /> : null}
      <span className="ambience-grain absolute inset-0" />
      {eventPulse > 0 ? (
        <span key={eventPulse} className="ambience-event absolute inset-0" />
      ) : null}
    </div>
  );
}
