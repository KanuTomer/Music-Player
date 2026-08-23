import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { Scene } from "@/lib/rooms.functions";
import { usePlayer } from "@/lib/player";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ThemeSwitcher({
  scenes,
  currentSlug,
}: {
  scenes: Scene[];
  currentSlug: string;
}) {
  const navigate = useNavigate();
  const player = usePlayer();
  const [transitioning, setTransitioning] = useState(false);

  return (
    <Select
      value={currentSlug}
      disabled={transitioning}
      onValueChange={async (slug) => {
        if (slug === currentSlug) return;
        setTransitioning(true);
        await player.fadeForThemeChange();
        await navigate({ to: "/room/$slug", params: { slug } });
      }}
    >
      <SelectTrigger
        aria-label="Change theme"
        className="h-10 w-[9.75rem] rounded-full border-cream/25 bg-night/45 px-3 text-xs font-semibold text-cream shadow-none backdrop-blur hover:bg-night/70 sm:w-[12.5rem] sm:text-sm [&>svg]:text-cream/70"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-cream/15 bg-night/95 text-cream backdrop-blur-xl">
        {scenes.map((scene) => (
          <SelectItem
            key={scene.slug}
            value={scene.slug}
            className="py-2.5 font-medium focus:bg-accent focus:text-accent-foreground"
          >
            {scene.title_en}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
