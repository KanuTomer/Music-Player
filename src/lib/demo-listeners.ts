export const DEMO_LISTENER_MIN = 800;
export const DEMO_LISTENER_MAX = 1300;
export const DEMO_LISTENER_FALLBACK = 1050;
export const DEMO_LISTENER_STORAGE_KEY = "sd.demo.listener-baseline.v2";

type DemoListenerStorage = Pick<Storage, "getItem" | "setItem">;

function isValidBaseline(value: number) {
  return Number.isInteger(value) && value >= DEMO_LISTENER_MIN && value <= DEMO_LISTENER_MAX;
}

export function createDemoListenerBaseline(random: () => number = Math.random) {
  const value = random();
  const normalized = Number.isFinite(value)
    ? Math.min(Math.max(value, 0), 1 - Number.EPSILON)
    : 0.5;
  return DEMO_LISTENER_MIN + Math.floor(normalized * (DEMO_LISTENER_MAX - DEMO_LISTENER_MIN + 1));
}

export function getOrCreateDemoListenerBaseline(
  storage?: DemoListenerStorage | null,
  roomKey?: string | null,
  random: () => number = Math.random,
) {
  const key = roomKey ? `${DEMO_LISTENER_STORAGE_KEY}:${roomKey}` : DEMO_LISTENER_STORAGE_KEY;
  if (!storage) {
    return createDemoListenerBaseline(random);
  }
  try {
    const stored = Number(storage.getItem(key));
    if (isValidBaseline(stored)) return stored;
  } catch {
    return createDemoListenerBaseline(random);
  }

  const baseline = createDemoListenerBaseline(random);
  try {
    storage.setItem(key, String(baseline));
  } catch {
    // A usable in-memory value is enough when session storage is unavailable.
  }
  return baseline;
}

export function combinedDemoListenerCount(baseline: number, presenceCount: number) {
  return Math.min(
    DEMO_LISTENER_MAX,
    Math.max(DEMO_LISTENER_MIN, baseline + Math.max(0, Math.floor(presenceCount) - 1))
  );
}
