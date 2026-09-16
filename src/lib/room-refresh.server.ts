import type { RoomRefreshPayload } from "./room-refresh";
import { broadcastRoomRefreshRealtime } from "./room-realtime.server";

type BroadcastChannel = {
  httpSend(event: string, payload: RoomRefreshPayload): PromiseLike<{ success: true } | { success: false; status: number; error: string }>;
};
export type RoomRefreshBroadcastClient = {
  channel(topic: string): BroadcastChannel;
  removeChannel(channel: BroadcastChannel): PromiseLike<unknown>;
};
export async function sendRoomRefresh(client: RoomRefreshBroadcastClient, sceneSlug: string, payload: RoomRefreshPayload) {
  const channel = client.channel(`room:scene:${sceneSlug}`);
  try {
    const result = await channel.httpSend("room_refresh", payload);
    if (!result.success) throw new Error("Realtime server did not acknowledge the refresh");
  } finally { await client.removeChannel(channel); }
}

export async function broadcastRoomRefresh(sceneSlug: string, sceneId: string) {
  try {
    const payload: RoomRefreshPayload = {
      sceneId,
      committedAt: new Date().toISOString(),
    };
    broadcastRoomRefreshRealtime(sceneSlug, payload);
  } catch (error) {
    console.warn("[room-refresh] delivery failed", {
      sceneId,
      error: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
