import { describe, expect, test } from "bun:test";
import { ALLOWED_SLUGS, getThemeInfo, isAllowedSlug } from "./theme-data";
import { videoForScene } from "./scene-media";

const expectedSlugs = [
  "sainik-dhaba",
  "nai-ki-dukaan",
  "bus-driver",
  "bartan-time",
  "raj-mistri",
  "papa-ke-gaane",
  "corporate-majdoor",
] as const;

describe("seven-Jagah launch catalogue", () => {
  test("contains exactly the agreed launch slugs", () => {
    expect(new Set(ALLOWED_SLUGS)).toEqual(new Set(expectedSlugs));
    expect(ALLOWED_SLUGS).toHaveLength(7);
  });

  test("rejects retired public routes", () => {
    expect(isAllowedSlug("raat-ki-bus")).toBe(false);
    expect(isAllowedSlug("chai-ki-tapri")).toBe(false);
    expect(isAllowedSlug("doordarshan-shaam")).toBe(false);
  });

  test("provides theme metadata and video media for every launch room", () => {
    for (const slug of expectedSlugs) {
      expect(getThemeInfo(slug)?.displayName).toBeTruthy();
      const video = videoForScene(slug);
      if (video) {
        expect(video).toMatch(/^https:\/\//);
      }
    }
  });
});
