import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import type { AmbienceStatus } from "@/lib/ambience";

type AmbienceControlProps = {
  level: number;
  onLevelChange: (level: number) => void;
  compact?: boolean;
  enabled?: boolean;
  active?: boolean;
  status?: AmbienceStatus;
  onToggle: () => void;
};

export function AmbienceControl({
  level,
  onLevelChange,
  compact = false,
  enabled = false,
  active = false,
  status = "idle",
  onToggle,
}: AmbienceControlProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`ambience-control-shell flex h-8 sm:h-8.5 shrink-0 items-center overflow-hidden rounded-full border shadow-xs transition-[background-color,border-color,max-width] motion-reduce:transition-none ${
        open
          ? compact
            ? "max-w-[min(15rem,72vw)] border-teal-deep/80 bg-teal-deep/30 ring-1 ring-teal-500/20"
            : "max-w-56 border-teal-deep/80 bg-teal-deep/30 ring-1 ring-teal-500/20"
          : enabled
            ? "max-w-28 border-teal-500/40 bg-teal-950/40 hover:border-teal-500/60"
            : "max-w-28 border-cream/20 bg-cream/5 hover:border-cream/35 hover:bg-cream/10"
      }`}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          onToggle();
          if (!enabled) setOpen(true);
          else setOpen(false);
        }}
        aria-pressed={enabled}
        aria-expanded={open}
        aria-label={enabled ? "Turn Ambience off" : "Turn Ambience on"}
        className={`flex h-8 sm:h-8.5 shrink-0 items-center rounded-full px-2.5 text-[10.5px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ember ${
          enabled ? "text-emerald-300" : "text-cream/80 hover:text-cream"
        }`}
      >
        Ambience
        <span
          className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[7.5px] font-bold tracking-[0.08em] uppercase ${
            enabled
              ? active
                ? "bg-emerald-400/25 text-emerald-300 ring-1 ring-emerald-400/30"
                : "bg-teal-deep/60 text-emerald-200"
              : status === "unavailable"
                ? "bg-red-400/15 text-red-300"
                : "bg-cream/10 text-cream/50"
          }`}
          aria-hidden
        >
          {enabled ? "ON" : "OFF"}
        </span>
      </button>
      {!open && enabled ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Adjust Ambience"
          className="mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-cream/65 outline-none hover:bg-cream/10 hover:text-cream focus-visible:ring-2 focus-visible:ring-ember"
        >
          <SlidersHorizontal className="size-3.5" aria-hidden />
        </button>
      ) : null}
      <div
        data-open={open ? "true" : "false"}
        aria-hidden={!open}
        inert={!open}
        className="ambience-control-details flex min-w-0 items-center gap-1.5 overflow-hidden"
      >
        <Slider
          value={[level]}
          max={100}
          step={1}
          aria-label={`Ambience level, ${level} percent`}
          onValueChange={(value) => onLevelChange(value[0] ?? 0)}
          className="min-w-16 flex-1"
        />
        <span className="w-7 text-right text-[9px] tabular-nums text-cream/55">{level}</span>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            window.requestAnimationFrame(() => triggerRef.current?.focus());
          }}
          aria-label="Close Ambience"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-cream/55 outline-none hover:text-cream focus-visible:ring-2 focus-visible:ring-ember"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
