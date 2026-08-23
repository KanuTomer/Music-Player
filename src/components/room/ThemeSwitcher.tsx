import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Scene } from "@/lib/rooms.functions";
import { artFor } from "@/lib/scene-art";
import { usePlayer } from "@/lib/player";

/** Single "Change Theme" button — the room list stays hidden until asked for. */
export function ThemeSwitcher({
  scenes,
  currentSlug,
}: {
  scenes: Scene[];
  currentSlug: string;
}) {
  const navigate = useNavigate();
  const player = usePlayer();
  const [open, setOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const currentIndex = Math.max(0, scenes.findIndex((scene) => scene.slug === currentSlug));
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(currentIndex);
    window.requestAnimationFrame(() => {
      const carousel = carouselRef.current;
      const slide = carousel?.children.item(currentIndex) as HTMLElement | null;
      slide?.scrollIntoView({ inline: "center", block: "nearest" });
    });
  }, [currentIndex, open]);

  const updateActiveSlide = () => {
    const carousel = carouselRef.current;
    if (!carousel || carousel.clientWidth === 0) return;
    setActiveIndex(Math.round(carousel.scrollLeft / carousel.clientWidth));
  };

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cinema px-3 py-4 sm:px-6 sm:py-8">
          <button
            type="button"
            aria-label="Close theme picker"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-cinema"
          />
          <div className="animate-in fade-in zoom-in-95 relative h-[calc(100dvh-2rem)] w-full max-w-md overflow-hidden rounded-[2.5rem] border-[10px] border-cinema-clay/25 bg-cinema shadow-lift duration-300 sm:h-[82dvh] sm:rounded-[3rem] sm:border-[12px]">
            <div
              ref={carouselRef}
              onScroll={updateActiveSlide}
              className="no-scrollbar flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth"
            >
              {scenes.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  disabled={transitioning}
                  onClick={async () => {
                    if (s.slug === currentSlug) {
                      setOpen(false);
                      return;
                    }
                    setTransitioning(true);
                    await player.fadeForThemeChange();
                    await navigate({ to: "/room/$slug", params: { slug: s.slug } });
                  }}
                  className="group relative h-full w-full shrink-0 snap-center overflow-hidden text-left"
                >
                  <img
                    src={artFor(s.art_key)}
                    alt={`${s.title_en} scene`}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                  />
                  <span
                    className="absolute inset-0 bg-gradient-to-t from-cinema via-transparent to-cinema/20"
                    aria-hidden
                  />
                  <span className="absolute inset-x-0 bottom-20 px-7 text-center sm:bottom-24">
                    <span className="font-cinema-display block text-4xl leading-none text-cinema-cream sm:text-5xl">
                      {s.title_hi}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-8 flex items-center justify-center gap-2" aria-hidden>
              {scenes.map((scene, index) => (
                <span
                  key={scene.slug}
                  className={`h-1 rounded-full transition-[width,background-color] duration-300 ${
                    index === activeIndex ? "w-8 bg-cinema-cream" : "w-2 bg-cinema-cream/25"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close theme picker"
              className="absolute top-5 right-5 flex size-11 items-center justify-center rounded-full border border-cinema-cream/20 bg-cinema/35 text-cinema-cream backdrop-blur-md transition-colors hover:bg-cinema/65"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          {transitioning && (
            <div className="theme-transition-cover pointer-events-auto fixed inset-0 z-[70] bg-night" aria-label="Changing theme" />
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
