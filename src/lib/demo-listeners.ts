export const DEMO_LISTENER_MIN = 800;
export const DEMO_LISTENER_MAX = 1200;
export const DEMO_LISTENER_FALLBACK = 1000;
export const DEMO_LISTENER_STORAGE_KEY = "sd.demo.listener-baseline.v1";

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
  storage: DemoListenerStorage,
  random: () => number = Math.random,
) {
  try {
    const stored = Number(storage.getItem(DEMO_LISTENER_STORAGE_KEY));
    if (isValidBaseline(stored)) return stored;
  } catch {
    return createDemoListenerBaseline(random);
  }

  const baseline = createDemoListenerBaseline(random);
  try {
    storage.setItem(DEMO_LISTENER_STORAGE_KEY, String(baseline));
  } catch {
    // A usable in-memory value is enough when session storage is unavailable.
  }
  return baseline;
}

export function combinedDemoListenerCount(baseline: number, presenceCount: number) {
  return baseline + Math.max(0, Math.floor(presenceCount));
}
