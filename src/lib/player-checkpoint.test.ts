import { describe, expect, test } from "bun:test";
import {
  PLAYBACK_CHECKPOINT_MAX_AGE_MS,
  clampPlaybackPosition,
  findCheckpointQueueIndex,
  isRoomPlaybackPath,
  parsePlaybackCheckpoint,
  type PlaybackCheckpoint,
} from "./player-checkpoint";
import type { QueueItem } from "./rooms.functions";

const now = 2_000_000_000_000;
const checkpoint: PlaybackCheckpoint = {
  version: 1,
  sceneSlug: "sainik-dhaba",
  queueItemId: "queue-2",
  trackId: "track-2",
  positionSeconds: 73.5,
  intendsToPlay: true,
  musicVolume: 0.45,
  ambienceEnabled: false,
  queueShuffleSeed: "0123456789abcdef0123456789abcdef",
  updatedAt: now,
};
const queue = [
  { id: "queue-1", track: { id: "track-1" } },
  { id: "queue-2", track: { id: "track-2" } },
] as QueueItem[];

describe("playback checkpoint", () => {
  test("restores a valid checkpoint with volume and ambience preference", () => {
    const parsed = parsePlaybackCheckpoint(JSON.stringify(checkpoint), "sainik-dhaba", now);
    expect(parsed).toEqual(checkpoint);
    expect(parsed?.musicVolume).toBe(0.45);
    expect(parsed?.ambienceEnabled).toBe(false);
  });

  test("rejects malformed, wrong-room, future, and expired values", () => {
    expect(parsePlaybackCheckpoint("not-json", "sainik-dhaba", now)).toBeNull();
    expect(parsePlaybackCheckpoint(JSON.stringify(checkpoint), "papa-ke-gaane", now)).toBeNull();
    expect(
      parsePlaybackCheckpoint(
        JSON.stringify({ ...checkpoint, updatedAt: now - PLAYBACK_CHECKPOINT_MAX_AGE_MS - 1 }),
        "sainik-dhaba",
        now,
      ),
    ).toBeNull();
    expect(
      parsePlaybackCheckpoint(
        JSON.stringify({ ...checkpoint, positionSeconds: 12 * 60 * 60 + 1 }),
        "sainik-dhaba",
        now,
      ),
    ).toBeNull();
    expect(
      parsePlaybackCheckpoint(
        JSON.stringify({ ...checkpoint, updatedAt: now + 60_001 }),
        "sainik-dhaba",
        now,
      ),
    ).toBeNull();
  });

  test("restores the queue item unless an explicit track takes precedence", () => {
    expect(findCheckpointQueueIndex(queue, checkpoint)).toBe(1);
    expect(findCheckpointQueueIndex(queue, checkpoint, "track-1")).toBeNull();
  });

  test("clamps restored seeks and scopes checkpoints to room presentations", () => {
    expect(clampPlaybackPosition(-10, 100)).toBe(0);
    expect(clampPlaybackPosition(120, 100)).toBe(100);
    expect(clampPlaybackPosition(42, 100)).toBe(42);
    expect(isRoomPlaybackPath("/room/sainik-dhaba", "sainik-dhaba")).toBe(true);
    expect(isRoomPlaybackPath("/room/sainik-dhaba/cassette/", "sainik-dhaba")).toBe(true);
    expect(isRoomPlaybackPath("/", "sainik-dhaba")).toBe(false);
  });
});
