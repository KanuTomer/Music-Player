import { useNavigate } from "@tanstack/react-router";
import { Radio } from "lucide-react";
import { useState } from "react";
import type { Scene } from "@/lib/rooms.functions";

/** Physical tuning dial that swaps rooms without ever scrolling the page. */
export function RadioDialSwitcher({
  scenes,
  currentSlug,
}: {
  scenes: Scene[];
  currentSlug: string;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const index = Math.max(
    0,
    scenes.findIndex((s) => s.slug === currentSlug),
  );

  const goTo = (i: number) => {
    const target = scenes[(i + scenes.length) % scenes.length];
    if (target) void navigate({ to: "/room/$slug", params: { slug: target.slug } });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Switch room"
        aria-expanded={open}
        className="flex size-10 items-center justify-center rounded-full border border-border/70 bg-background/80 backdrop-blur transition-transform hover:rotate-45"
      >
        <Radio className="size-4" aria-hidden />
      </button>

      {open && (
        <div className="paper animate-in fade-in zoom-in-95 absolute top-12 right-0 z-40 w-60 rounded-xl border border-border/70 bg-popover p-2 shadow-lift">
          <p className="z-2 px-1 pb-1 text-[11px] tracking-wide text-muted-foreground uppercase">
            Tune to another room
          </p>
          <div className="z-2 grid grid-cols-1 gap-0.5">
            {scenes.slice(0, 8).map((s, i) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => {
                  setOpen(false);
                  goTo(i);
                }}
                className={`rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-accent/40 ${
                  s.slug === currentSlug ? "bg-accent/50 font-semibold" : ""
                }`}
              >
                {s.title_en}
                <span className="ml-1 text-[11px] text-muted-foreground">
                  {s.title_hi}
                </span>
              </button>
            ))}
          </div>
          <div className="z-2 mt-1 flex justify-between border-t border-border/60 pt-1">
            <button
              type="button"
              className="rounded px-2 py-1 text-xs hover:bg-accent/40"
              onClick={() => goTo(index - 1)}
            >
              ◀ Previous
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-xs hover:bg-accent/40"
              onClick={() => goTo(index + 1)}
            >
              Next ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
