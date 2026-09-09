import type { QueueItem } from "./rooms.functions";

export const PLAYBACK_CHECKPOINT_KEY = "sd.playback-checkpoint.v1";
export const PLAYBACK_CHECKPOINT_MAX_AGE_MS = 30 * 60 * 1000;

export type PlaybackCheckpoint = {
  version: 1;
  sceneSlug: string;
  queueItemId: string;
  trackId: string;
  positionSeconds: number;
  intendsToPlay: boolean;
  musicVolume: number;
  ambienceEnabled: boolean;
  queueShuffleSeed: string;
  updatedAt: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parsePlaybackCheckpoint(
  raw: string | null,
  sceneSlug: string,
  now = Date.now(),
): PlaybackCheckpoint | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PlaybackCheckpoint>;
    if (
      value.version !== 1 ||
      value.sceneSlug !== sceneSlug ||
      typeof value.queueItemId !== "string" ||
      !value.queueItemId ||
      typeof value.trackId !== "string" ||
      !value.trackId ||
      !isFiniteNumber(value.positionSeconds) ||
      value.positionSeconds < 0 ||
      value.positionSeconds > 12 * 60 * 60 ||
      typeof value.intendsToPlay !== "boolean" ||
      !isFiniteNumber(value.musicVolume) ||
      value.musicVolume < 0 ||
      value.musicVolume > 1 ||
      typeof value.ambienceEnabled !== "boolean" ||
      typeof value.queueShuffleSeed !== "string" ||
      !/^[0-9a-f]{32}$/i.test(value.queueShuffleSeed) ||
      !isFiniteNumber(value.updatedAt) ||
      value.updatedAt < 0 ||
      value.updatedAt > now + 60_000 ||
      now - value.updatedAt > PLAYBACK_CHECKPOINT_MAX_AGE_MS
    ) {
      return null;
    }
    return value as PlaybackCheckpoint;
  } catch {
    return null;
  }
}

export function readPlaybackCheckpoint(
  storage: Pick<Storage, "getItem">,
  sceneSlug: string,
  now = Date.now(),
): PlaybackCheckpoint | null {
  try {
    return parsePlaybackCheckpoint(storage.getItem(PLAYBACK_CHECKPOINT_KEY), sceneSlug, now);
  } catch {
    return null;
  }
}

export function findCheckpointQueueIndex(
  queue: QueueItem[],
  checkpoint: PlaybackCheckpoint | null,
  explicitTrackId?: string,
): number | null {
  if (!checkpoint || explicitTrackId) return null;
  const queueItemIndex = queue.findIndex((item) => item.id === checkpoint.queueItemId);
  const index =
    queueItemIndex >= 0
      ? queueItemIndex
      : queue.findIndex((item) => item.track.id === checkpoint.trackId);
  return index >= 0 ? index : null;
}

export function clampPlaybackPosition(positionSeconds: number, durationSeconds = 0): number {
  const position = Number.isFinite(positionSeconds) ? Math.max(0, positionSeconds) : 0;
  return durationSeconds > 0 ? Math.min(position, durationSeconds) : position;
}

export function isRoomPlaybackPath(pathname: string, sceneSlug: string): boolean {
  const normalized = pathname.replace(/\/+$/, "");
  const roomPath = `/room/${sceneSlug}`;
  return normalized === roomPath || normalized === `${roomPath}/cassette`;
}
