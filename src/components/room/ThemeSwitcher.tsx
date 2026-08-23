import { useNavigate } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { Scene } from "@/lib/rooms.functions";
import { usePlayer } from "@/lib/player";

export function ThemeSwitcher({
  scenes,
  currentSlug,
}: {
  scenes: Scene[];
  currentSlug: string;
}) {
  const player = usePlayer();
  const navigate = useNavigate();
  const [transitioning, setTransitioning] = useState(false);
  const currentScene = scenes.find((s) => s.slug === currentSlug);

  return (
    <div className="relative">
      <select
        aria-label="Theme"
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

        className="h-10 w-[9.75rem] appearance-none rounded-full border border-cream/25 bg-night/45 px-3 pr-8 text-xs font-semibold text-cream outline-none backdrop-blur transition-colors hover:bg-night/70 focus:ring-2 focus:ring-accent/70 disabled:opacity-60 sm:w-[12.5rem] sm:text-sm"
      >
        {scenes.map((scene) => (
          <option key={scene.slug} value={scene.slug} className="bg-night text-cream">
            {scene.title_en}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-cream/70" aria-hidden />
      {currentScene && (
        <span className="sr-only">{currentScene.title_en}</span>
      )}
    </div>
  );
}
