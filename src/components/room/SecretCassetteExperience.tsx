import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AmbienceControl } from "@/components/player/AmbienceControl";
import { PhysicalCassettePlayer } from "@/components/player/PhysicalCassettePlayer";
import { useLiveScenes } from "@/hooks/useLiveScenes";
import { useRoomPresenceTracker } from "@/hooks/useRoomPresence";
import { backgroundFor } from "@/lib/scene-art";
import { isLightTextColor } from "@/lib/scene-presentation";
import { usePlayer } from "@/lib/player";
import type { RoomPayload, Scene } from "@/lib/rooms.functions";

export function SecretCassetteExperience({ room, scenes }: { room: RoomPayload; scenes: Scene[] }) {
  const player = usePlayer();
  const openRoom = player.openRoom;
  const liveScenes = useLiveScenes(scenes);
  const scene = liveScenes.find((item) => item.id === room.scene.id) ?? room.scene;
  const lightText = isLightTextColor(scene.foreground_text_color);
  useRoomPresenceTracker(scene.slug);

  useEffect(() => {
    openRoom(room);
  }, [openRoom, room]);

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-night p-4 text-cream sm:p-5">
      <img
        src={backgroundFor(scene)}
        alt=""
        className="absolute inset-0 size-full object-cover"
        width={1536}
        height={1024}
      />
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" aria-hidden />
      <div
        className={`absolute inset-0 ${lightText ? "bg-gradient-to-b from-black/55 via-transparent to-black/65" : "bg-gradient-to-b from-white/25 via-transparent to-white/10"}`}
        aria-hidden
      />
      <Link
        to="/room/$slug"
        params={{ slug: room.scene.slug }}
        className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4 z-20 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-black/55 px-4 text-sm font-semibold text-white backdrop-blur transition hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to room
      </Link>
      <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-20">
        <AmbienceControl
          available={player.ambienceAvailable}
          enabled={player.ambienceEnabled}
          active={player.ambienceActive}
          status={player.ambienceStatus}
          onToggle={player.toggleAmbience}
        />
      </div>
      <section className="relative z-10 flex w-full items-center justify-center">
        <PhysicalCassettePlayer />
      </section>
    </main>
  );
}
