import { describe, expect, test } from "bun:test";
import {
  chooseStart,
  getOrCreateQueueSessionSeed,
  isConfirmedPlaying,
  circularIndex,
  queueSessionSeedKey,
  shouldRetryExpectedPlayback,
  shuffleQueueForSession,
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

describe("session queue shuffle", () => {
  const seed = "0123456789abcdef0123456789abcdef";

  test("keeps one deterministic permutation per session and Jagah", () => {
    const queue = [item("1"), item("2"), item("3"), item("4"), item("5")];
    const first = shuffleQueueForSession(queue, seed, "sainik-dhaba");
    const revisit = shuffleQueueForSession(queue, seed, "sainik-dhaba");
    expect(revisit.map(({ id }) => id)).toEqual(first.map(({ id }) => id));
    expect(new Set(first.map(({ id }) => id))).toEqual(new Set(queue.map(({ id }) => id)));
    expect(shuffleQueueForSession(queue, "f".repeat(32), "sainik-dhaba")).not.toEqual(first);
  });

  test("reuses a valid tab seed and replaces an invalid one", () => {
    const values = new Map<string, string>([[queueSessionSeedKey, seed]]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
    };
    expect(getOrCreateQueueSessionSeed(storage, () => "a".repeat(32))).toBe(seed);
    values.set(queueSessionSeedKey, "invalid");
    expect(getOrCreateQueueSessionSeed(storage, () => "a".repeat(32))).toBe("a".repeat(32));
  });
});

describe("confirmed playback state", () => {
  test("shows playing only for the expected confirmed video", () => {
    expect(isConfirmedPlaying(1, "current", "current")).toBe(true);
    expect(isConfirmedPlaying(1, "stale", "current")).toBe(false);
    expect(isConfirmedPlaying(3, "current", "current")).toBe(false);
  });

  test("retries only a current expected video with active play intent", () => {
    expect(shouldRetryExpectedPlayback(true, 5, "current", "current")).toBe(true);
    expect(shouldRetryExpectedPlayback(true, 2, "stale", "current")).toBe(false);
    expect(shouldRetryExpectedPlayback(false, 2, "current", "current")).toBe(false);
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
