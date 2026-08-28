import type { Daypart } from "./dayparts";
import type { QueueItem } from "./rooms.functions";

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
