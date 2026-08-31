import { Pause, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { ambienceEngineEnabled } from "@/hooks/useAmbienceEngine";
import type { AmbienceStatus } from "@/lib/ambience";

type AmbienceControlProps = {
  level: number;
  onLevelChange: (level: number) => void;
  compact?: boolean;
  active?: boolean;
  status?: AmbienceStatus;
  soloPlaying?: boolean;
  musicPlaying?: boolean;
  onSoloToggle?: () => void;
};

export function AmbienceControl({
  level,
  onLevelChange,
  compact = false,
  active = false,
  status = "idle",
  soloPlaying = false,
  musicPlaying = false,
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
      className={`flex min-h-11 shrink-0 items-center rounded-full border transition-[width,background-color] motion-reduce:transition-none ${
        open
          ? compact
            ? "w-[min(15rem,72vw)] border-teal-deep/80 bg-teal-deep/25 px-2"
            : "w-60 border-teal-deep/80 bg-teal-deep/25 px-2"
          : "w-auto border-teal-deep/70 bg-teal-deep/20"
      }`}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? "Collapse Ambience" : "Expand Ambience"}
        className="flex min-h-11 shrink-0 items-center rounded-full px-3 text-[11px] font-semibold text-cream outline-none focus-visible:ring-2 focus-visible:ring-ember"
      >
        Ambience
        {!open ? (
          <span
            className={`ml-1.5 size-1.5 rounded-full ${active ? "animate-bulb bg-emerald-400" : status === "unavailable" ? "bg-red-400" : "bg-cream/30"}`}
            aria-hidden
          />
        ) : null}
      </button>
      {open ? (
        <>
          <Slider
            value={[level]}
            max={100}
            step={1}
            aria-label={`Ambience level, ${level} percent`}
            onValueChange={(value) => onLevelChange(value[0] ?? 0)}
            className="min-w-16 flex-1"
          />
          <span className="w-7 text-right text-[9px] tabular-nums text-cream/55">{level}</span>
          {onSoloToggle ? (
            <button
              type="button"
              onClick={onSoloToggle}
              disabled={musicPlaying}
              aria-pressed={soloPlaying}
              aria-label={soloPlaying ? "Pause ambience test" : "Play ambience without music"}
              title={
                musicPlaying ? "Pause music to use solo ambience testing" : "Test ambience only"
              }
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-cream/15 text-cream/70 outline-none hover:bg-cream/10 hover:text-cream focus-visible:ring-2 focus-visible:ring-ember disabled:cursor-not-allowed disabled:opacity-35"
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
        </>
      ) : null}
    </div>
  );
}
