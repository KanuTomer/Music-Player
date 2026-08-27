import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Scene } from "@/lib/rooms.functions";
import { usePlayer } from "@/lib/player";
import { sceneSelectionAction } from "@/lib/scene-search";

export function useJagahNavigation({
  activeSlug,
  closeExplorer,
}: {
  activeSlug: string | null;
  closeExplorer: () => void;
}) {
  const navigate = useNavigate();
  const player = usePlayer();
  const [switchingSlug, setSwitchingSlug] = useState<string | null>(null);

  const selectScene = async (scene: Scene) => {
    const hasPlaybackSession = Boolean(player.room && !player.needsGate);
    const action = sceneSelectionAction(scene.slug, activeSlug, hasPlaybackSession);
    if (action === "close") {
      closeExplorer();
      return;
    }

    setSwitchingSlug(scene.slug);
    try {
      if (action === "switch" && player.isPlaying) {
        await player.fadeForThemeChange();
      }
      await navigate({ to: "/room/$slug", params: { slug: scene.slug } });
      closeExplorer();
    } finally {
      setSwitchingSlug(null);
    }
  };

  return { selectScene, switchingSlug };
}
