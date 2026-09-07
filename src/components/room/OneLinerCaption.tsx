import { useEffect, useRef, useState } from "react";
import type { OneLiner } from "@/lib/rooms.functions";

export function OneLinerCaption({
  lines,
  active,
  trackKey,
  textColor,
  textShadow,
}: {
  lines: OneLiner[];
  active: boolean;
  /** Changes whenever a new song starts — retriggers the line. */
  trackKey?: string | null;
  textColor: string;
  textShadow: string;
}) {
  const [current, setCurrent] = useState<OneLiner | null>(null);
  const [visible, setVisible] = useState(false);
  const lastIndex = useRef(-1);

  useEffect(() => {
    const timeouts = new Set<number>();
    const frames = new Set<number>();
    let idleTimer: number | null = null;
    let disposed = false;

    const schedule = (callback: () => void, delay: number) => {
      const timer = window.setTimeout(() => {
        timeouts.delete(timer);
        if (!disposed) callback();
      }, delay);
      timeouts.add(timer);
      return timer;
    };

    const fadeOut = () => {
      setVisible(false);
      schedule(() => setCurrent(null), 900);
    };

    const showNext = () => {
      let index = Math.floor(Math.random() * lines.length);
      if (lines.length > 1 && index === lastIndex.current) index = (index + 1) % lines.length;
      lastIndex.current = index;
      setCurrent(lines[index] ?? null);
      setVisible(false);
      const frame = window.requestAnimationFrame(() => {
        frames.delete(frame);
        if (!disposed) setVisible(true);
      });
      frames.add(frame);
      schedule(fadeOut, 15000);
    };

    if (!active || lines.length === 0) {
      fadeOut();
    } else {
      schedule(showNext, 600);
      idleTimer = window.setInterval(showNext, 45000);
    }

    return () => {
      disposed = true;
      for (const timer of timeouts) window.clearTimeout(timer);
      for (const frame of frames) window.cancelAnimationFrame(frame);
      if (idleTimer !== null) window.clearInterval(idleTimer);
    };
  }, [active, trackKey, lines]);

  if (!current) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none w-full px-2 text-center flex justify-center"
    >
      <div
        className={`max-w-[21ch] transition-[opacity,transform] ease-out motion-reduce:transition-none sm:max-w-none ${
          visible
            ? "scale-100 translate-y-0 opacity-100 duration-700"
            : "scale-[0.98] translate-y-1 opacity-0 duration-[900ms]"
        }`}
      >
        <p
          lang="hi"
          className="font-vintage-deva text-[clamp(2rem,7.6vw,3.6rem)] leading-[1.18] font-black sm:text-5xl md:text-[clamp(2.5rem,6dvh,4rem)]"
          style={{ color: textColor, textShadow }}
        >
          {current.display_text}
        </p>
      </div>
    </div>
  );
}
