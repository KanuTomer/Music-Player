import type { CSSProperties } from "react";
import type { AmbienceProfile } from "@/lib/rooms.functions";

type AmbienceBackdropProps = {
  active: boolean;
  level: number;
  eventPulse: number;
  profile: AmbienceProfile | null;
};

export function AmbienceBackdrop({ active, level, eventPulse, profile }: AmbienceBackdropProps) {
  const theme = profile?.visual_theme;
  const style = {
    "--ambience-accent": theme?.accent ?? "#e59f32",
    "--ambience-haze": theme?.haze ?? "#4f3828",
    "--ambience-strength": String(Math.min(0.62, Math.max(0, level) / 165)),
  } as CSSProperties;

  return (
    <div
      aria-hidden
      data-active={active ? "true" : "false"}
      data-pattern={theme?.pattern ?? "dust"}
      className="ambience-backdrop pointer-events-none absolute inset-0 z-10 overflow-hidden"
      style={style}
    >
      <span className="ambience-haze absolute inset-[-18%]" />
      <span className="ambience-pattern absolute inset-0" />
      <span className="ambience-grain absolute inset-0" />
      {eventPulse > 0 ? (
        <span key={eventPulse} className="ambience-event absolute inset-0" />
      ) : null}
    </div>
  );
}
