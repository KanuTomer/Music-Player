import { useEffect, useState } from "react";
import {
  CONNECTING_ROOM_PRESENCE,
  type RoomPresenceSnapshot,
} from "@/lib/room-presence";
import { roomPresenceController } from "@/lib/room-presence-runtime";

type PresenceScene = { id: string; slug: string };

export function useRoomPresenceTracker(sceneSlug: string | null): void {
  useEffect(() => {
    if (!sceneSlug) return;
    const handle = roomPresenceController.acquire(sceneSlug, { trackViewer: true });
    return handle.release;
  }, [sceneSlug]);
}

export function useAdminRoomPresence(
  scenes: PresenceScene[],
  enabled: boolean,
): Record<string, RoomPresenceSnapshot> {
  const sceneKey = JSON.stringify(scenes.map(({ id, slug }) => ({ id, slug })));
  const [snapshots, setSnapshots] = useState<Record<string, RoomPresenceSnapshot>>({});

  useEffect(() => {
    const activeScenes = JSON.parse(sceneKey) as PresenceScene[];
    if (!enabled || !activeScenes.length) {
      setSnapshots({});
      return;
    }

    setSnapshots(
      Object.fromEntries(
        activeScenes.map((scene) => [scene.id, { ...CONNECTING_ROOM_PRESENCE }]),
      ),
    );

    const handles = activeScenes.map((scene) =>
      roomPresenceController.acquire(scene.slug, {
        trackViewer: false,
        onPresence: (snapshot) => {
          setSnapshots((current) => ({
            ...current,
            [scene.id]: snapshot,
          }));
        },
      }),
    );

    return () => {
      for (const handle of handles) handle.release();
    };
  }, [enabled, sceneKey]);

  return snapshots;
}
