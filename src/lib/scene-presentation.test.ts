import { describe, expect, test } from "bun:test";
import {
  BACKGROUND_SOURCE_LIMIT,
  DARK_SCENE_TEXT,
  LIGHT_SCENE_TEXT,
  chooseReadableTextColor,
  effectLabel,
  normalizeHexColor,
  validateBackgroundSource,
} from "./scene-presentation";

describe("scene presentation", () => {
  test("validates six-digit colors", () => {
    expect(normalizeHexColor(" #fff3d6 ")).toBe(LIGHT_SCENE_TEXT);
    expect(() => normalizeHexColor("cream")).toThrow("six-digit");
  });

  test("chooses the candidate with the strongest worst-case contrast", () => {
    expect(chooseReadableTextColor([0.92, 0.8])).toBe(DARK_SCENE_TEXT);
    expect(chooseReadableTextColor([0.01, 0.04])).toBe(LIGHT_SCENE_TEXT);
  });

  test("accepts supported originals and rejects invalid or oversized input", () => {
    expect(() => validateBackgroundSource({ type: "image/avif", size: 1024 })).not.toThrow();
    expect(() => validateBackgroundSource({ type: "image/gif", size: 1024 })).toThrow("JPEG");
    expect(() =>
      validateBackgroundSource({ type: "image/png", size: BACKGROUND_SOURCE_LIMIT + 1 }),
    ).toThrow("15 MiB");
  });

  test("uses a readable fallback for an empty effect label", () => {
    expect(effectLabel("  ")).toContain("Jagah");
    expect(effectLabel("  Horn bajao  ")).toBe("Horn bajao");
  });
});
