import { describe, expect, test } from "bun:test";
import {
  afterCommittedRoomMutation,
  createRefreshScheduler,
  parseRoomRefreshPayload,
  reconcileRefreshedQueue,
} from "./room-refresh";
import type { QueueItem } from "./rooms.functions";

const item = (id: string, title = id): QueueItem => ({
  id,
  position: 1,
  daypart_tag: "all",
  track: { id: `track-${id}`, title, artist: null, year: null },
  sources: [],
});

describe("room refresh", () => {
  test("accepts only an authoritative refresh marker", () => {
    const sceneId = crypto.randomUUID();
    expect(
      parseRoomRefreshPayload({ sceneId, committedAt: new Date().toISOString() })?.sceneId,
    ).toBe(sceneId);
    expect(parseRoomRefreshPayload({ sceneId: "bad", committedAt: "now" })).toBeNull();
  });

  test("preserves surviving order, refreshes metadata, and appends new entries", () => {
    const result = reconcileRefreshedQueue(
      [item("b"), item("a")],
      [item("a", "updated"), item("b"), item("c")],
      "a",
    );
    expect(result.playlist.map((entry) => entry.id)).toEqual(["b", "a", "c"]);
    expect(result.playlist[1]?.track.title).toBe("updated");
    expect(result.preservedIndex).toBe(1);
  });

  test("reports a removed current item so the player can select the nearest survivor", () => {
    const result = reconcileRefreshedQueue([item("a"), item("b")], [item("a")], "b");
    expect(result.playlist.map((entry) => entry.id)).toEqual(["a"]);
    expect(result.preservedIndex).toBe(-1);
  });

  test("never notifies for a rejected mutation", async () => {
    let notified = 0;
    await expect(
      afterCommittedRoomMutation(
        async () => {
          throw new Error("rollback");
        },
        async () => {
          notified += 1;
        },
      ),
    ).rejects.toThrow("rollback");
    expect(notified).toBe(0);
  });

  test("notifies exactly once after a committed mutation", async () => {
    const events: string[] = [];
    const result = await afterCommittedRoomMutation(
      async () => {
        events.push("commit");
        return "scene-id";
      },
      async (sceneId) => {
        events.push(`notify:${sceneId}`);
      },
    );
    expect(result).toBe("scene-id");
    expect(events).toEqual(["commit", "notify:scene-id"]);
  });

  test("coalesces events received during an in-flight refresh", async () => {
    let runs = 0;
    let release: (() => void) | undefined;
    const scheduler = createRefreshScheduler(
      () =>
        new Promise<void>((resolve) => {
          runs += 1;
          release = resolve;
        }),
      0,
    );
    scheduler.schedule();
    await new Promise((resolve) => setTimeout(resolve, 5));
    scheduler.schedule();
    scheduler.schedule();
    release?.();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(runs).toBe(2);
    release?.();
    scheduler.dispose();
  });
});
