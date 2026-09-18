import { createRoomPresenceController } from "@/lib/room-presence";
import { renderRealtimeClient } from "@/lib/render-realtime.client";

export const roomPresenceController = createRoomPresenceController(renderRealtimeClient);
