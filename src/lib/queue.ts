import type { Daypart } from "./dayparts";
import type { QueueItem } from "./rooms.functions";

export function createQueueSessionSeed(
  fill = (values: Uint32Array) => crypto.getRandomValues(values),
) {
  return Array.from(fill(new Uint32Array(4)), (value) => value.toString(16).padStart(8, "0")).join(
    "",
  );
}

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleQueueForSession<T>(items: T[], sessionSeed: string, sceneSlug: string) {
  const shuffled = [...items];
  const random = seededRandom(hashSeed(`${sessionSeed}:${sceneSlug}`));
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index]!;
    shuffled[index] = shuffled[swapIndex]!;
    shuffled[swapIndex] = current;
  }
  return shuffled;
}

export function avoidRepeatedFirst<T>(
  items: T[],
  previousKey: string | null,
  keyOf: (item: T) => string,
) {
  if (items.length < 2 || !previousKey || keyOf(items[0] as T) !== previousKey) return items;
  const adjusted = [...items];
  const first = adjusted[0]!;
  adjusted[0] = adjusted[1]!;
  adjusted[1] = first;
  return adjusted;
}

export function isConfirmedPlaying(
  playerState: number,
  reportedVideoId: string | undefined,
  expectedVideoId: string | null,
) {
  return playerState === 1 && Boolean(expectedVideoId && reportedVideoId === expectedVideoId);
}

export function shouldRetryExpectedPlayback(
  intendsToPlay: boolean,
  playerState: number,
  reportedVideoId: string | undefined,
  expectedVideoId: string | null,
) {
  return (
    intendsToPlay &&
    Boolean(expectedVideoId && reportedVideoId === expectedVideoId) &&
    [-1, 2, 3, 5].includes(playerState)
  );
}

export function snapshotQueue(items: QueueItem[], daypart: Daypart) {
  const eligible = items.filter(
    (item) => item.daypart_tag === "all" || item.daypart_tag === daypart,
  );
  return eligible.length ? eligible : items;
}

export function chooseStart(length: number, previous = -1, random = Math.random) {
  if (length <= 1) return 0;
  let next = Math.min(length - 1, Math.floor(random() * length));
  if (next === previous) next = (next + 1) % length;
  return next;
}

export function circularIndex(index: number, delta: number, length: number) {
  if (length <= 0) return 0;
  return (index + delta + length) % length;
}

export function upcomingQueue(items: QueueItem[], currentIndex: number) {
  return items.map((_, offset) => items[(currentIndex + offset) % items.length]).filter(Boolean);
}

export function sourceFailureAction({
  eventGeneration,
  currentGeneration,
  isCurrentTarget,
  alreadyFailed,
  hasFallback,
  failedItemCount,
  queueLength,
}: {
  eventGeneration: number;
  currentGeneration: number;
  isCurrentTarget: boolean;
  alreadyFailed: boolean;
  hasFallback: boolean;
  failedItemCount: number;
  queueLength: number;
}): "ignore" | "fallback" | "advance" | "stop" {
  if (eventGeneration !== currentGeneration || !isCurrentTarget || alreadyFailed) return "ignore";
  if (hasFallback) return "fallback";
  return failedItemCount + 1 >= queueLength ? "stop" : "advance";
}
