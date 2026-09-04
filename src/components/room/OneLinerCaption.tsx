import { useEffect, useRef, useState } from "react";
import type { OneLiner } from "@/lib/rooms.functions";

export function OneLinerCaption({
  lines,
  active,
  trackKey,
}: {
  lines: OneLiner[];
  active: boolean;
  /** Changes whenever a new song starts — retriggers the line. */
  trackKey?: string | null;
}) {
  const [current, setCurrent] = useState<OneLiner | null>(null);
  const lastIndex = useRef(-1);

  const pickNext = () => {
    if (lines.length === 0) return null;
    let i = Math.floor(Math.random() * lines.length);
    if (lines.length > 1 && i === lastIndex.current) i = (i + 1) % lines.length;
    lastIndex.current = i;
    return lines[i] ?? null;
  };

  // Show a line whenever the song changes.
  useEffect(() => {
    if (!active || lines.length === 0) {
      setCurrent(null);
      return;
    }
    const show = window.setTimeout(() => setCurrent(pickNext()), 600);
    const hide = window.setTimeout(() => setCurrent(null), 16000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, trackKey, lines]);

  // Slow idle cycle so the room still talks between songs.
  useEffect(() => {
    if (!active || lines.length === 0) return;
    const timer = window.setInterval(() => {
      setCurrent(pickNext());
      window.setTimeout(() => setCurrent(null), 15000);
    }, 45000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, lines]);

  if (!current) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute top-[clamp(9rem,38dvh,21rem)] left-1/2 z-20 w-[min(94vw,48rem)] -translate-x-1/2 -translate-y-1/2 px-3 text-center"
    >
      <div className="animate-in fade-in zoom-in-95 duration-700">
        <p
          lang="hi"
          className="font-vintage-deva text-[clamp(1.6rem,5.8dvh,4.2rem)] leading-[1.18] font-black text-cream text-glow-dark"
        >
          {current.text_hi}
        </p>
      </div>
    </div>
  );
}
