import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { artFor } from "@/lib/scene-art";
import type { Scene } from "@/lib/rooms.functions";

export function SceneCard({ scene }: { scene: Scene }) {
  return (
    <Link
      to="/room/$slug"
      params={{ slug: scene.slug }}
      className="group relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-ink/15 bg-card text-left shadow-tile transition-all duration-300 hover:-translate-y-0.5 hover:border-accent hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {/* painted awning strip */}
      <span
        className="absolute inset-x-0 top-0 z-3 h-[3px] bg-gradient-to-r from-terracotta via-mustard to-terracotta"
        aria-hidden
      />

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <img
          src={artFor(scene.art_key)}
          alt={`${scene.title_en} scene illustration`}
          loading="lazy"
          width={1024}
          height={1024}
          className="size-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
        />
        <span
          className="halftone pointer-events-none absolute inset-0 opacity-15 mix-blend-multiply"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-night/85 via-night/25 to-transparent"
          aria-hidden
        />

        <span className="ticket absolute top-3 left-2 z-2 bg-cream/90 px-2.5 py-[3px] text-[9.5px] font-semibold tracking-[0.14em] text-ink uppercase">
          {scene.region ?? scene.category}
        </span>

        <span
          className="absolute top-2.5 right-2 z-2 flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground opacity-0 shadow-tile transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        >
          <Play className="size-3.5 translate-x-[1px]" />
        </span>

        {/* title sits on the art, signage-style */}
        <div className="absolute inset-x-0 bottom-0 z-2 px-3 pb-2">
          <p className="signage-text truncate text-[15px] leading-tight text-cream sm:text-base">
            {scene.title_en}
          </p>
          <p className="font-deva truncate text-[11px] leading-tight text-cream/70">
            {scene.title_hi}
          </p>
        </div>
      </div>

      <div className="relative shrink-0 border-t border-ink/10 px-3 py-2">
        <p className="line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">
          {scene.hook}
        </p>
      </div>
    </Link>
  );
}
