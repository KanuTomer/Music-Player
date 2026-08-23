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
    const hide = window.setTimeout(() => setCurrent(null), 9000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, trackKey, lines]);

  // Slow idle cycle so the room still talks between songs.
  useEffect(() => {
    if (!active || lines.length === 0) return;
    const timer = window.setInterval(
      () => {
        setCurrent(pickNext());
        window.setTimeout(() => setCurrent(null), 8000);
      },
      45000,
    );
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, lines]);

  if (!current) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute top-1/2 left-1/2 z-20 w-[min(94vw,44rem)] -translate-x-1/2 -translate-y-1/2 px-3 text-center"
    >
      <div className="animate-in fade-in zoom-in-95 duration-700">
        <p className="font-display text-[clamp(1.7rem,7vw,3.4rem)] leading-[1.05] text-cream drop-shadow-[0_3px_18px_rgba(0,0,0,0.85)]">
          {current.text_en}
        </p>
        {current.text_hi && (
          <p className="font-deva mt-2 text-[clamp(1.05rem,4vw,1.9rem)] leading-tight text-cream/75 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            {current.text_hi}
          </p>
        )}
      </div>
    </div>
  );
}
