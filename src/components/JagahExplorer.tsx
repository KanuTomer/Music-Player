import { Check, ChevronDown, Heart, Lightbulb, Loader2 } from "lucide-react";
import type { RefObject } from "react";
import type { Scene } from "@/lib/rooms.functions";
import { artFor } from "@/lib/scene-art";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { CompactCassettePlayer } from "@/components/player/CassettePlayers";

type JagahExplorerProps = {
  scenes: Scene[];
  activeSlug: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (scene: Scene) => void | Promise<void>;
  onPlaceholder: (kind: "suggest" | "support") => void;
  switchingSlug?: string | null;
  triggerRef?: RefObject<HTMLButtonElement | null>;
};

export function JagahExplorer({
  scenes,
  activeSlug,
  open,
  onOpenChange,
  onSelect,
  onPlaceholder,
  switchingSlug = null,
  triggerRef,
}: JagahExplorerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        id="jagah-explorer-sheet"
        side="bottom"
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          if (!triggerRef?.current) return;
          event.preventDefault();
          triggerRef.current.focus();
        }}
        className="mx-auto grid h-[92dvh] w-[calc(100%-1rem)] max-w-[54rem] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-t-2xl border-cream/15 bg-charcoal p-0 text-cream shadow-2xl motion-reduce:transition-none motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none sm:h-[calc(100dvh-2rem)]"
      >
        <div className="border-b border-cream/10 px-4 pt-5 pb-4 sm:px-7 sm:pt-6">
          <div className="pr-10">
            <SheetTitle className="font-signage text-2xl text-cream sm:text-3xl">
              Jagah Explorer
            </SheetTitle>
            <SheetDescription className="mt-1 text-sm text-cream/60">
              Pick a familiar corner. Your music keeps playing while you look around.
            </SheetDescription>
          </div>
          <SheetClose
            aria-label="Close Jagah Explorer"
            className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-full border border-cream/15 bg-cream/5 text-cream/70 outline-none transition-colors hover:bg-cream/10 hover:text-cream focus-visible:ring-2 focus-visible:ring-ember sm:top-3 sm:right-3 sm:size-10"
          >
            <ChevronDown className="size-5" aria-hidden />
          </SheetClose>
        </div>

        <div className="overflow-y-auto overscroll-contain px-4 py-5 sm:px-7 sm:py-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  className={`group relative min-h-44 overflow-hidden rounded-2xl border text-left shadow-lg transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember disabled:cursor-progress ${
                    active
                      ? "border-ember"
                      : "border-cream/10 hover:-translate-y-0.5 hover:border-cream/30"
                  }`}
                >
                    <img
                      src={artFor(scene.art_key)}
                      alt=""
                      width={720}
                      height={480}
                      loading="lazy"
                      className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <span
                      className="absolute inset-0 bg-gradient-to-t from-night via-night/35 to-transparent"
                      aria-hidden
                    />
                    <span className="relative flex min-h-44 flex-col justify-end p-4">
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
                    </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-cream/10 bg-night/45">
          <CompactCassettePlayer className="rounded-none border-x-0 border-t-0 border-b border-cream/10" />
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="text-xs leading-relaxed text-cream/50">
              Missing a familiar corner, or want to help keep the radio running?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onPlaceholder("suggest");
                }}
                className="flex min-h-11 items-center gap-2 rounded-full border border-cream/15 px-4 text-xs font-semibold text-cream/75 transition-colors hover:bg-cream/10 hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
              >
                <Lightbulb className="size-4 text-ember" aria-hidden />
                Suggest a Jagah
                <span className="text-[9px] tracking-wide text-cream/40 uppercase">Soon</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onPlaceholder("support");
                }}
                className="flex min-h-11 items-center gap-2 rounded-full border border-cream/15 px-4 text-xs font-semibold text-cream/75 transition-colors hover:bg-cream/10 hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
              >
                <Heart className="size-4 text-ember" aria-hidden />
                Support Us
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
