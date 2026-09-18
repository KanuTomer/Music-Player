import type { QueueItem } from "./rooms.functions";

export type RoomRefreshPayload = {
  sceneId: string;
  committedAt: string;
};

export function parseRoomRefreshPayload(value: unknown): RoomRefreshPayload | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Record<string, unknown>;
  if (
    typeof payload["sceneId"] !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      payload["sceneId"],
    ) ||
    typeof payload["committedAt"] !== "string" ||
    !Number.isFinite(Date.parse(payload["committedAt"]))
  ) {
    return null;
  }
  return { sceneId: payload["sceneId"], committedAt: payload["committedAt"] };
}

export function reconcileRefreshedQueue(
  current: QueueItem[],
  incoming: QueueItem[],
  currentId: string | null,
) {
  const incomingById = new Map(incoming.map((item) => [item.id, item]));
  const surviving = current
    .filter((item) => incomingById.has(item.id))
    .map((item) => incomingById.get(item.id)!);
  const existingIds = new Set(surviving.map((item) => item.id));
  const playlist = [...surviving, ...incoming.filter((item) => !existingIds.has(item.id))];
  const preservedIndex = currentId ? playlist.findIndex((item) => item.id === currentId) : -1;
  return { playlist, preservedIndex };
}

export function createRefreshScheduler(run: () => Promise<void>, delayMs = 750) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let trailing = false;

  const execute = async () => {
    if (running) {
      trailing = true;
      return;
    }
    running = true;
    try {
      await run();
    } finally {
      running = false;
      if (trailing) {
        trailing = false;
        schedule();
      }
    }
  };
  const schedule = () => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      void execute();
    }, delayMs);
  };
  const dispose = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    trailing = false;
  };
  return { schedule, dispose };
}

export async function afterCommittedRoomMutation<T>(
  mutate: () => Promise<T>,
  notify: (result: T) => Promise<void>,
) {
  const result = await mutate();
  await notify(result);
  return result;
}
