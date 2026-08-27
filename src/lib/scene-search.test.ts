import { describe, expect, test } from "bun:test";
import type { Scene } from "./rooms.functions";
import { filterScenes, normalizeSceneSearch, sceneSelectionAction } from "./scene-search";

function scene(overrides: Partial<Scene> & Pick<Scene, "slug" | "title_en">): Scene {
  return {
    id: overrides.slug,
    slug: overrides.slug,
    title_en: overrides.title_en,
    title_hi: "जगह",
    hook: "A familiar corner",
    description: null,
    region: null,
    category: "everyday",
    palette: {},
    art_key: "rail-yatra",
    is_dark: false,
    chat_mode: "off",
    gag_label: null,
    sort_order: 0,
    tags: [],
    ...overrides,
  };
}

const scenes = [
  scene({
    slug: "rail-yatra",
    title_en: "Rail Yatra",
    title_hi: "रेल यात्रा",
    hook: "Window seat nostalgia",
    description: "A long train journey",
    region: "North India",
    tags: ["safar", "yaadein"],
    sort_order: 1,
  }),
  scene({
    slug: "sarkari-daftar",
    title_en: "Sarkari Daftar",
    title_hi: "सरकारी दफ़्तर",
    region: "Delhi",
    tags: ["kaam", "yaadein"],
    sort_order: 2,
  }),
  scene({ slug: "future-room", title_en: "Future Room", sort_order: 3 }),
];

describe("Jagah Explorer filtering", () => {
  test("normalizes whitespace, case, and Unicode", () => {
    expect(normalizeSceneSearch("  RAIL YATRA  ")).toBe("rail yatra");
    expect(normalizeSceneSearch("रेल यात्रा")).toBe("रेल यात्रा");
  });

  test("searches English, Hindi, region, hook, description, and tags", () => {
    for (const query of ["rail", "रेल", "north india", "nostalgia", "journey", "safar"]) {
      expect(filterScenes(scenes, query, "all").map((item) => item.slug)).toEqual(["rail-yatra"]);
    }
  });

  test("combines chip and text filters", () => {
    expect(filterScenes(scenes, "yaadein", "kaam").map((item) => item.slug)).toEqual([
      "sarkari-daftar",
    ]);
    expect(filterScenes(scenes, "rail", "kaam")).toEqual([]);
  });

  test("keeps input ordering stable", () => {
    expect(filterScenes(scenes, "", "all").map((item) => item.slug)).toEqual([
      "rail-yatra",
      "sarkari-daftar",
      "future-room",
    ]);
  });

  test("keeps untagged future scenes under All and searchable", () => {
    expect(filterScenes(scenes, "future", "all").map((item) => item.slug)).toEqual(["future-room"]);
    expect(filterScenes(scenes, "future", "safar")).toEqual([]);
  });

  test("closes on the active scene and distinguishes entering from switching", () => {
    expect(sceneSelectionAction("rail-yatra", "rail-yatra", true)).toBe("close");
    expect(sceneSelectionAction("rail-yatra", null, false)).toBe("enter");
    expect(sceneSelectionAction("rail-yatra", "sainik-dhaba", true)).toBe("switch");
  });
});
