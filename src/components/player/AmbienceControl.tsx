import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";

export const ambiencePreviewEnabled = import.meta.env["VITE_ENABLE_AMBIENCE_PREVIEW"] === "true";

type AmbienceControlProps = {
  level: number;
  onLevelChange: (level: number) => void;
  compact?: boolean;
};

export function AmbienceControl({ level, onLevelChange, compact = false }: AmbienceControlProps) {
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

  if (!ambiencePreviewEnabled) return null;

  return (
    <div
      ref={rootRef}
      className={`flex min-h-11 shrink-0 items-center rounded-full border transition-[width,background-color] motion-reduce:transition-none ${
        open
          ? compact
            ? "w-[min(13rem,60vw)] border-teal-deep/80 bg-teal-deep/25 px-2"
            : "w-52 border-teal-deep/80 bg-teal-deep/25 px-2"
          : "w-auto border-teal-deep/70 bg-teal-deep/20"
      }`}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? "Collapse Ambience preview" : "Expand Ambience preview"}
        className="flex min-h-11 shrink-0 items-center rounded-full px-3 text-[11px] font-semibold text-cream outline-none focus-visible:ring-2 focus-visible:ring-ember"
      >
        Ambience
        {!open ? (
          <span className="ml-1.5 text-[8px] tracking-wide text-cream/40 uppercase">Preview</span>
        ) : null}
      </button>
      {open ? (
        <>
          <Slider
            value={[level]}
            max={100}
            step={1}
            aria-label={`Ambience preview level, ${level} percent`}
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
            aria-label="Close Ambience preview"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-cream/55 outline-none hover:text-cream focus-visible:ring-2 focus-visible:ring-ember"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </>
      ) : null}
    </div>
  );
}
