import { Pause, Play, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { ambienceEngineEnabled } from "@/hooks/useAmbienceEngine";
import type { AmbienceStatus } from "@/lib/ambience";

type AmbienceControlProps = {
  level: number;
  onLevelChange: (level: number) => void;
  compact?: boolean;
  enabled?: boolean;
  active?: boolean;
  status?: AmbienceStatus;
  soloPlaying?: boolean;
  musicPlaying?: boolean;
  onToggle: () => void;
  onSoloToggle?: () => void;
};

export function AmbienceControl({
  level,
  onLevelChange,
  compact = false,
  enabled = false,
  active = false,
  status = "idle",
  soloPlaying = false,
  musicPlaying = false,
  onToggle,
  onSoloToggle,
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

  if (!ambienceEngineEnabled) return null;

  return (
    <div
      ref={rootRef}
      className={`ambience-control-shell flex min-h-11 shrink-0 items-center overflow-hidden rounded-full border transition-[background-color,border-color] motion-reduce:transition-none ${
        open
          ? compact
            ? "max-w-[min(15rem,72vw)] border-teal-deep/80 bg-teal-deep/25"
            : "max-w-60 border-teal-deep/80 bg-teal-deep/25"
          : "max-w-28 border-teal-deep/70 bg-teal-deep/20"
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
        className={`flex min-h-11 shrink-0 items-center rounded-full px-3 text-[11px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ember ${
          enabled ? "text-emerald-200" : "text-cream"
        }`}
      >
        Ambience
        <span
          className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[8px] tracking-[0.08em] ${
            enabled
              ? active
                ? "bg-emerald-400/20 text-emerald-200"
                : "bg-teal-deep/55 text-emerald-200"
              : status === "unavailable"
                ? "bg-red-400/15 text-red-300"
                : "bg-cream/10 text-cream/45"
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
        {onSoloToggle && !musicPlaying ? (
          <button
            type="button"
            onClick={onSoloToggle}
            aria-pressed={soloPlaying}
            aria-label={soloPlaying ? "Pause ambience test" : "Play ambience without music"}
            title="Test ambience only"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-cream/15 text-cream/70 outline-none hover:bg-cream/10 hover:text-cream focus-visible:ring-2 focus-visible:ring-ember"
          >
            {soloPlaying ? (
              <Pause className="size-3.5" aria-hidden />
            ) : (
              <Play className="size-3.5" aria-hidden />
            )}
          </button>
        ) : null}
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
