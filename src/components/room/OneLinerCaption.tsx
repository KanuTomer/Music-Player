import { useEffect, useState } from "react";
import type { OneLiner } from "@/lib/rooms.functions";

export function OneLinerCaption({
  lines,
  active,
}: {
  lines: OneLiner[];
  active: boolean;
}) {
  const [current, setCurrent] = useState<OneLiner | null>(null);

  useEffect(() => {
    if (!active || lines.length === 0) {
      setCurrent(null);
      return;
    }
    let timeout: number;
    const cycle = () => {
      const pick = lines[Math.floor(Math.random() * lines.length)];
      setCurrent(pick ?? null);
      timeout = window.setTimeout(() => {
        setCurrent(null);
        timeout = window.setTimeout(cycle, 6000 + Math.random() * 6000);
      }, 7000);
    };
    timeout = window.setTimeout(cycle, 2500);
    return () => window.clearTimeout(timeout);
  }, [active, lines]);

  if (!current) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute top-16 left-1/2 z-20 w-[min(92vw,32rem)] -translate-x-1/2 px-2"
    >
      <div className="animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-cream/20 bg-night/60 px-3.5 py-2 text-center shadow-lift backdrop-blur-sm duration-700">
        <p className="text-[13px] leading-snug font-medium text-cream">{current.text_en}</p>
        {current.text_hi && (
          <p className="font-deva text-[12px] leading-snug text-cream/65">
            {current.text_hi}
          </p>
        )}
      </div>
    </div>
  );
}
