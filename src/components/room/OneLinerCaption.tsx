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
  const currentRef = useRef<OneLiner | null>(null);

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

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fadeDuration = reducedMotion ? 0 : 900;

    const clearCurrent = () => {
      currentRef.current = null;
      setCurrent(null);
    };

    const fadeOut = (after?: () => void) => {
      setVisible(false);
      schedule(() => {
        clearCurrent();
        after?.();
      }, fadeDuration + 20);
    };

    const showNext = () => {
      let index = Math.floor(Math.random() * lines.length);
      if (lines.length > 1 && index === lastIndex.current) index = (index + 1) % lines.length;
      lastIndex.current = index;
      const next = lines[index] ?? null;
      currentRef.current = next;
      setCurrent(next);
      setVisible(false);
      const firstFrame = window.requestAnimationFrame(() => {
        frames.delete(firstFrame);
        const secondFrame = window.requestAnimationFrame(() => {
          frames.delete(secondFrame);
          if (!disposed) setVisible(true);
        });
        frames.add(secondFrame);
      });
      frames.add(firstFrame);
      schedule(fadeOut, 15000);
    };

    if (!active || lines.length === 0) {
      if (currentRef.current) fadeOut();
    } else {
      if (currentRef.current) fadeOut(() => schedule(showNext, 600));
      else schedule(showNext, 600);
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
        className={`max-w-[21ch] transition-opacity duration-[900ms] ease-in-out motion-reduce:transition-none sm:max-w-none ${visible ? "opacity-100" : "opacity-0"}`}
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
