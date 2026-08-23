import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Scene } from "@/lib/rooms.functions";
import { artFor } from "@/lib/scene-art";

/** Single "Change Theme" button — the room list stays hidden until asked for. */
export function ThemeSwitcher({
  scenes,
  currentSlug,
}: {
  scenes: Scene[];
  currentSlug: string;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-cream/25 bg-night/45 px-4 py-2 text-[13px] font-semibold text-cream backdrop-blur transition-colors hover:bg-night/70"
      >
        Change Theme
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-night/80 backdrop-blur-sm"
          />
          <div className="animate-in fade-in zoom-in-95 relative flex max-h-[82dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-cream/15 bg-night/85 p-4 shadow-lift duration-300">
            <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
              <div>
                <p className="signage-text text-base leading-tight text-cream">
                  Kaunsa kamra?
                </p>
                <p className="text-[11.5px] text-cream/60">
                  {scenes.length} themes live · tap to switch
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close theme picker"
                className="flex size-9 items-center justify-center rounded-full border border-cream/25 text-cream transition-colors hover:bg-cream/15"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-2 gap-2.5 overflow-y-auto pr-0.5 sm:grid-cols-3">
              {scenes.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (s.slug !== currentSlug) {
                      void navigate({ to: "/room/$slug", params: { slug: s.slug } });
                    }
                  }}
                  className={`group relative aspect-[4/3] overflow-hidden rounded-xl border text-left transition-transform hover:scale-[1.02] ${
                    s.slug === currentSlug ? "border-accent" : "border-cream/15"
                  }`}
                >
                  <img
                    src={artFor(s.art_key)}
                    alt={`${s.title_en} scene`}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                  <span
                    className="absolute inset-0 bg-gradient-to-t from-night/90 via-night/25 to-transparent"
                    aria-hidden
                  />
                  <span className="absolute inset-x-0 bottom-0 px-2.5 pb-2">
                    <span className="font-deva block truncate text-[13px] font-semibold text-cream">
                      {s.title_hi}
                    </span>
                    <span className="block truncate text-[10px] tracking-[0.12em] text-cream/60 uppercase">
                      {s.title_en}
                    </span>
                  </span>
                  {s.slug === currentSlug && (
                    <span className="absolute top-2 right-2 rounded-full bg-accent px-2 py-[2px] text-[9px] font-bold tracking-[0.14em] text-accent-foreground uppercase">
                      now
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
