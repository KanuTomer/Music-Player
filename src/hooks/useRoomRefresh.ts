import { useEffect, useRef } from "react";
import { getRoom, type RoomPayload } from "@/lib/rooms.functions";
import { createRefreshScheduler, parseRoomRefreshPayload } from "@/lib/room-refresh";
import { roomPresenceController } from "@/lib/room-presence-runtime";

export function useRoomRefresh(
  sceneSlug: string,
  sceneId: string,
  onRefresh: (room: RoomPayload) => void,
) {
  const callback = useRef(onRefresh);
  callback.current = onRefresh;

  useEffect(() => {
    let disposed = false;
    const scheduler = createRefreshScheduler(async () => {
      const room = await getRoom({ data: { slug: sceneSlug } }).catch(() => null);
      if (!disposed && room?.scene.id === sceneId) callback.current(room);
    });
    const handle = roomPresenceController.acquire(sceneSlug, {
      trackViewer: false,
      onRoomRefresh: (value) => {
        const payload = parseRoomRefreshPayload(value);
        if (payload?.sceneId === sceneId) scheduler.schedule();
      },
    });
    return () => {
      disposed = true;
      scheduler.dispose();
      handle.release();
    };
  }, [sceneId, sceneSlug]);
}
