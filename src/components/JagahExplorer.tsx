import { Check, Loader2 } from "lucide-react";
import type { RefObject } from "react";
import type { Scene } from "@/lib/rooms.functions";
import { artFor } from "@/lib/scene-art";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type JagahExplorerProps = {
  scenes: Scene[];
  activeSlug: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (scene: Scene) => void | Promise<void>;
  onPlaceholder?: (kind: "suggest" | "support") => void;
  switchingSlug?: string | null;
  triggerRef?: RefObject<HTMLButtonElement | null>;
};

export function JagahExplorer({
  scenes,
  activeSlug,
  open,
  onOpenChange,
  onSelect,
  switchingSlug = null,
  triggerRef,
}: JagahExplorerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="jagah-explorer-sheet"
        onCloseAutoFocus={(event) => {
          if (!triggerRef?.current) return;
          event.preventDefault();
          triggerRef.current.focus();
        }}
        className="flex max-h-[88dvh] w-[min(94vw,54rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border-cream/15 bg-charcoal p-0 text-cream shadow-2xl"
      >
        <div className="border-b border-cream/10 px-4 pt-4 pb-3 sm:px-7 sm:pt-6 sm:pb-4">
          <div className="pr-10">
            <DialogTitle className="font-signage text-xl sm:text-3xl text-cream">
              Jagah Explorer
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-xs sm:text-sm text-cream/60">
              Pick a familiar corner. Your music keeps playing while you look around.
            </DialogDescription>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-7 sm:py-6">
          <div className="grid grid-cols-1 gap-1.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scenes.map((scene) => {
              const active = scene.slug === activeSlug;
              const switching = scene.slug === switchingSlug;
              return (
                <button
                  key={scene.slug}
                  type="button"
                  disabled={Boolean(switchingSlug)}
                  onClick={() => void onSelect(scene)}
                  aria-current={active ? "location" : undefined}
                  className={`group relative overflow-hidden rounded-lg sm:rounded-2xl border text-left shadow-xs sm:shadow-md transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember disabled:cursor-progress ${
                    active
                      ? "border-ember bg-charcoal/90 sm:bg-transparent"
                      : "border-cream/10 bg-night/60 sm:bg-transparent hover:-translate-y-0.5 hover:border-cream/30"
                  }`}
                >
                  {/* Image: hidden on mobile, visible on desktop/tablet */}
                  <img
                    src={artFor(scene.art_key)}
                    alt=""
                    width={720}
                    height={480}
                    loading="lazy"
                    className="hidden sm:block absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <span
                    className="hidden sm:block absolute inset-0 bg-gradient-to-t from-night via-night/35 to-transparent"
                    aria-hidden
                  />

                  {/* Mobile View: Balanced theme row without image */}
                  <div className="flex sm:hidden min-h-[3.25rem] items-center justify-between gap-3 px-3.5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-deva text-[17px] font-semibold text-cream leading-tight">
                          {scene.title_hi}
                        </span>
                        <span className="text-xs text-cream/70 font-medium truncate">
                          {scene.title_en}
                        </span>
                      </div>
                      {switching && (
                        <span className="mt-0.5 flex items-center gap-1 text-[11px] text-ember">
                          <Loader2 className="size-3 animate-spin" aria-hidden /> Changing Jagah…
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="rounded-full border border-cream/15 bg-charcoal/80 px-2 py-0.5 text-[9.5px] font-semibold text-cream/70">
                        {scene.region ?? scene.category}
                      </span>
                      {active && (
                        <span className="flex items-center gap-1 rounded-full bg-ember px-2 py-0.5 text-[9.5px] font-bold text-charcoal">
                          <Check className="size-2.5" aria-hidden /> Active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Desktop View: Full Rich Image Card */}
                  <div className="hidden sm:flex relative min-h-44 flex-col justify-end p-4">
                    <span className="mb-auto flex items-center justify-between gap-2">
                      <span className="rounded-full border border-cream/15 bg-charcoal/65 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-cream/75 backdrop-blur">
                        {scene.region ?? scene.category}
                      </span>
                      {active && (
                        <span className="flex items-center gap-1 rounded-full bg-ember px-2.5 py-1 text-[10px] font-bold text-charcoal">
                          <Check className="size-3" aria-hidden /> Active
                        </span>
                      )}
                    </span>
                    <span className="font-deva text-xl font-semibold text-cream">
                      {scene.title_hi}
                    </span>
                    <span className="text-sm font-semibold text-cream">{scene.title_en}</span>
                    <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-cream/65">
                      {scene.hook}
                    </span>
                    {switching && (
                      <span className="mt-2 flex items-center gap-1.5 text-xs text-ember">
                        <Loader2 className="size-3.5 animate-spin" aria-hidden /> Changing Jagah…
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
