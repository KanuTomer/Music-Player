import { describe, expect, test } from "bun:test";
import {
  DEMO_LISTENER_MAX,
  DEMO_LISTENER_MIN,
  DEMO_LISTENER_STORAGE_KEY,
  combinedDemoListenerCount,
  createDemoListenerBaseline,
  getOrCreateDemoListenerBaseline,
} from "./demo-listeners";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("demo listener baseline", () => {
  test("generates inclusive values within 800–1200", () => {
    expect(createDemoListenerBaseline(() => 0)).toBe(DEMO_LISTENER_MIN);
    expect(createDemoListenerBaseline(() => 1)).toBe(DEMO_LISTENER_MAX);
    expect(createDemoListenerBaseline(() => 0.5)).toBeGreaterThanOrEqual(DEMO_LISTENER_MIN);
    expect(createDemoListenerBaseline(() => 0.5)).toBeLessThanOrEqual(DEMO_LISTENER_MAX);
  });

  test("reuses a valid baseline for the tab session", () => {
    const storage = memoryStorage({ [DEMO_LISTENER_STORAGE_KEY]: "917" });
    expect(getOrCreateDemoListenerBaseline(storage, () => 0)).toBe(917);
    expect(getOrCreateDemoListenerBaseline(storage, () => 1)).toBe(917);
  });

  test("replaces invalid and outdated stored values", () => {
    const invalid = memoryStorage({ [DEMO_LISTENER_STORAGE_KEY]: "1500" });
    expect(getOrCreateDemoListenerBaseline(invalid, () => 0.25)).toBe(900);
    expect(invalid.getItem(DEMO_LISTENER_STORAGE_KEY)).toBe("900");

    const outdated = memoryStorage({ "sd.demo.listener-baseline.v0": "850" });
    expect(getOrCreateDemoListenerBaseline(outdated, () => 0.75)).toBe(1100);
    expect(outdated.getItem(DEMO_LISTENER_STORAGE_KEY)).toBe("1100");
  });

  test("adds actual Realtime presence without changing the baseline", () => {
    expect(combinedDemoListenerCount(917, 1)).toBe(918);
    expect(combinedDemoListenerCount(917, 4)).toBe(921);
    expect(combinedDemoListenerCount(917, 0)).toBe(917);
  });
});
