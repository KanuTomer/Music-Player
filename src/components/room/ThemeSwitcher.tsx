import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";
import type { Scene } from "@/lib/rooms.functions";
import { usePlayer } from "@/lib/player";

export function ThemeSwitcher({ scenes, currentSlug }: { scenes: Scene[]; currentSlug: string }) {
  const player = usePlayer();
  const navigate = useNavigate();
  const [transitioning, setTransitioning] = useState(false);
  const currentScene = scenes.find((s) => s.slug === currentSlug);

  return (
    <div className="relative w-full min-w-0 sm:w-auto">
      <select
        aria-label="Theme"
        aria-busy={transitioning}
        value={currentSlug}
        disabled={transitioning}
        onChange={(event) => {
          const slug = event.currentTarget.value;
          if (slug === currentSlug) return;
          setTransitioning(true);
          // client-side navigation keeps the player alive, so playback never
          // resets back to the "press play" gate
          void player.fadeForThemeChange().then(async () => {
            await navigate({ to: "/room/$slug", params: { slug } });
            setTransitioning(false);
          });
        }}
        className="h-11 w-full min-w-0 max-w-full cursor-pointer appearance-none truncate rounded-full border border-cream/25 bg-night/55 px-3.5 pr-9 text-[13px] leading-none font-semibold text-cream outline-none backdrop-blur transition-colors hover:bg-night/70 focus-visible:ring-2 focus-visible:ring-accent/70 disabled:cursor-progress disabled:opacity-70 sm:h-10 sm:w-[13rem] sm:text-sm"
      >
        {scenes.map((scene) => (
          <option key={scene.slug} value={scene.slug} className="bg-night text-cream">
            {scene.title_en}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-cream/70"
        aria-hidden
      >
        {transitioning ? (
          <Loader2 className="size-4 animate-spin text-accent" />
        ) : (
          <ChevronDown className="size-4" />
        )}
      </span>
      <span className="sr-only" role="status">
        {transitioning ? "Theme badal raha hai…" : (currentScene?.title_en ?? "")}
      </span>
    </div>
  );
}
