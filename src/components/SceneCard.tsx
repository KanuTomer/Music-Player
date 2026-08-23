import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { artFor } from "@/lib/scene-art";
import type { Scene } from "@/lib/rooms.functions";

export function SceneCard({ scene }: { scene: Scene }) {
  return (
    <Link
      to="/room/$slug"
      params={{ slug: scene.slug }}
      className="paper group relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-card text-left shadow-tile transition-transform duration-300 hover:-rotate-[0.6deg] hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <img
          src={artFor(scene.art_key)}
          alt={`${scene.title_en} scene illustration`}
          loading="lazy"
          width={1024}
          height={1024}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <span className="absolute top-1.5 left-1.5 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
          {scene.region ?? scene.category}
        </span>
      </div>
      <div className="z-2 shrink-0 px-2.5 py-2">
        <p className="font-signage truncate text-[13px] leading-tight font-bold sm:text-sm">
          {scene.title_en}
        </p>
        <p className="truncate text-[11px] leading-tight text-muted-foreground">
          {scene.title_hi}
        </p>
        <p className="mt-1 line-clamp-2 hidden text-[11px] leading-snug text-muted-foreground sm:block">
          {scene.hook}
        </p>
      </div>
    </Link>
  );
}

export function GenerateCard() {
  return (
    <Link
      to="/generate"
      className="paper group relative flex h-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-primary/50 bg-accent/25 p-3 text-center shadow-tile transition-transform hover:-rotate-[0.6deg] hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Sparkles className="z-2 size-6 text-primary" aria-hidden />
      <p className="font-signage z-2 text-[13px] leading-tight font-bold sm:text-sm">
        Generate your own room
      </p>
      <p className="z-2 text-[11px] leading-tight text-muted-foreground">
        अपना कमरा बनाइए
      </p>
    </Link>
  );
}
