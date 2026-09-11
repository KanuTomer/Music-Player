import { describe, expect, test } from "bun:test";
import { sendRoomRefresh, type RoomRefreshBroadcastClient } from "./room-refresh.server";

describe("room refresh broadcast", () => {
  test("uses the room topic, REST event, and removes the channel", async () => {
    const calls: unknown[] = [];
    const channel = {
      async httpSend(event: string, payload: { sceneId: string; committedAt: string }) {
        calls.push([event, Object.keys(payload).sort()]);
        return { success: true } as const;
      },
    };
    const client: RoomRefreshBroadcastClient = {
      channel(topic) {
        calls.push(topic);
        return channel;
      },
      async removeChannel(value) {
        calls.push(value === channel ? "removed" : "wrong");
      },
    };
    await sendRoomRefresh(client, "demo", {
      sceneId: crypto.randomUUID(),
      committedAt: new Date().toISOString(),
    });
    expect(calls).toEqual([
      "room:scene:demo",
      ["room_refresh", ["committedAt", "sceneId"]],
      "removed",
    ]);
  });

  test("removes the temporary channel when delivery fails", async () => {
    let removed = false;
    const channel = {
      async httpSend() {
        throw new Error("offline");
      },
    };
    const client: RoomRefreshBroadcastClient = {
      channel: () => channel,
      async removeChannel() {
        removed = true;
      },
    };
    await expect(
      sendRoomRefresh(client, "demo", {
        sceneId: crypto.randomUUID(),
        committedAt: new Date().toISOString(),
      }),
    ).rejects.toThrow("offline");
    expect(removed).toBe(true);
  });

  test("rejects an unsuccessful Realtime REST acknowledgement", async () => {
    let removed = false;
    const channel = {
      async httpSend() {
        return { success: false, status: 503, error: "unavailable" } as const;
      },
    };
    const client: RoomRefreshBroadcastClient = {
      channel: () => channel,
      async removeChannel() {
        removed = true;
      },
    };

    await expect(
      sendRoomRefresh(client, "demo", {
        sceneId: crypto.randomUUID(),
        committedAt: new Date().toISOString(),
      }),
    ).rejects.toThrow("did not acknowledge");
    expect(removed).toBe(true);
  });
});
