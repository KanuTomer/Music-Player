import { describe, expect, test } from "bun:test";
import {
  chooseStart,
  circularIndex,
  snapshotQueue,
  sourceFailureAction,
  upcomingQueue,
} from "./queue";
import type { QueueItem } from "./rooms.functions";

const item = (id: string, daypart_tag = "all"): QueueItem => ({
  id,
  position: Number(id),
  daypart_tag,
  track: { id: `track-${id}`, title: `Title ${id}`, artist: `Artist ${id}`, year: null },
  sources: [
    {
      id: `source-${id}`,
      provider: "youtube",
      provider_item_id: id,
      source_url: `https://youtube.test/${id}`,
      provider_title: null,
      provider_channel: null,
      priority: 0,
    },
  ],
});

describe("authoritative queue", () => {
  test("chooses a deterministic random start without immediately repeating", () => {
    expect(chooseStart(4, -1, () => 0.5)).toBe(2);
    expect(chooseStart(4, 2, () => 0.5)).toBe(3);
  });
  test("takes a stable daypart snapshot", () => {
    const source = [item("1", "morning"), item("2", "night"), item("3")];
    const snapshot = snapshotQueue(source, "morning");
    expect(snapshot.map((entry) => entry.id)).toEqual(["1", "3"]);
    expect(snapshotQueue(source, "night").map((entry) => entry.id)).toEqual(["2", "3"]);
    expect(snapshot.map((entry) => entry.id)).toEqual(["1", "3"]);
  });
  test("uses circular previous, next, and upcoming order", () => {
    const queue = [item("1"), item("2"), item("3")];
    expect(circularIndex(0, -1, queue.length)).toBe(2);
    expect(circularIndex(2, 1, queue.length)).toBe(0);
    expect(upcomingQueue(queue, 2).map((entry) => entry.id)).toEqual(["3", "1", "2"]);
  });
});

describe("source failure decisions", () => {
  const base = {
    eventGeneration: 2,
    currentGeneration: 2,
    isCurrentTarget: true,
    alreadyFailed: false,
    hasFallback: false,
    failedItemCount: 0,
    queueLength: 3,
  };
  test("uses another source before advancing", () =>
    expect(sourceFailureAction({ ...base, hasFallback: true })).toBe("fallback"));
  test("advances once when the current track has no source left", () =>
    expect(sourceFailureAction(base)).toBe("advance"));
  test("stops after one complete queue pass", () =>
    expect(sourceFailureAction({ ...base, failedItemCount: 2 })).toBe("stop"));
  test("ignores stale generations and duplicate errors", () => {
    expect(sourceFailureAction({ ...base, eventGeneration: 1 })).toBe("ignore");
    expect(sourceFailureAction({ ...base, alreadyFailed: true })).toBe("ignore");
  });
});
