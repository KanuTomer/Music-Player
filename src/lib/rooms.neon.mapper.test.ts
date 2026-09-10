import { describe, expect, test } from "bun:test";
import { mapNeonAmbience, mapNeonOneLiners, mapNeonQueue, mapNeonScene } from "./rooms.neon.mapper";

const storageUrl = (bucket: string, path: string | null | undefined) =>
  path ? `https://storage.test/${bucket}/${path}` : null;

describe("Neon room mapping", () => {
  test("maps scene fields and public background URL", () => {
    const scene = mapNeonScene(
      {
        id: "scene-1",
        slug: "demo",
        titleEn: "Demo",
        titleHi: "डेमो",
        hook: "Hook",
        description: null,
        region: null,
        category: "tier1",
        palette: { accent: "#ffffff" },
        artKey: "demo",
        backgroundStoragePath: "rooms/demo/background/file.webp",
        foregroundTextColor: "",
        isDark: false,
        chatMode: "open",
        gagLabel: null,
        sortOrder: 1,
        tags: ["demo"],
      },
      storageUrl,
    );

    expect(scene.background_url).toBe(
      "https://storage.test/scene-media/rooms/demo/background/file.webp",
    );
    expect(scene.foreground_text_color).toBe("#FFF3D6");
    expect(scene.title_en).toBe("Demo");
  });

  test("uses Hindi first for display text and falls back to English", () => {
    expect(
      mapNeonOneLiners([
        { id: "1", textEn: "English", textHi: "हिन्दी", daypartTag: "all" },
        { id: "2", textEn: "Fallback", textHi: null, daypartTag: "night" },
      ]).map((line) => line.display_text),
    ).toEqual(["हिन्दी", "Fallback"]);
  });

  test("groups playback sources by track and sorts them by priority", () => {
    const queue = mapNeonQueue(
      [
        {
          id: "membership-1",
          position: 1,
          daypartTag: "all",
          trackId: "track-1",
          title: "Track",
          artist: null,
          year: null,
        },
      ],
      [
        {
          id: "source-2",
          trackId: "track-1",
          provider: "youtube",
          providerItemId: "second",
          sourceUrl: "https://example.test/second",
          providerTitle: null,
          providerChannel: null,
          priority: 2,
        },
        {
          id: "source-1",
          trackId: "track-1",
          provider: "youtube",
          providerItemId: "first",
          sourceUrl: "https://example.test/first",
          providerTitle: null,
          providerChannel: null,
          priority: 1,
        },
      ],
    );

    expect(queue[0]?.sources.map((source) => source.provider_item_id)).toEqual(["first", "second"]);
  });

  test("returns null for disabled ambience and maps active ambience values", () => {
    expect(mapNeonAmbience(undefined, [], [], storageUrl)).toBeNull();

    const ambience = mapNeonAmbience(
      {
        id: "profile-1",
        maxMasterGain: "0.30",
        musicDuckRatio: "0.40",
        fadeOutMs: 700,
        fadeInMs: 900,
        audioTheme: {},
        visualTheme: { overlay_path: "rooms/demo/overlay/file.webp" },
      },
      [
        {
          id: "stem-1",
          assetId: "asset-1",
          name: "Rain",
          role: "base",
          storagePath: "rooms/demo/ambience/file.mp3",
          defaultVolume: "0.4",
          minGain: "0.05",
          maxGain: "0.20",
          crossfadeMs: 2500,
          loopStartSeconds: "1.250",
          loopEndSeconds: "9.500",
          eventMinSeconds: null,
          eventMaxSeconds: null,
        },
      ],
      [
        {
          assetId: "asset-1",
          source_url: "https://source.test/two",
          source_title: "Second",
          source_order: 2,
        },
        {
          assetId: "asset-1",
          source_url: "https://source.test/one",
          source_title: "First",
          source_order: 1,
        },
      ],
      storageUrl,
    );

    expect(ambience?.max_master_gain).toBe(0.3);
    expect(ambience?.music_duck_ratio).toBe(0.4);
    expect(ambience?.visual_theme.overlay_url).toBe(
      "https://storage.test/scene-media/rooms/demo/overlay/file.webp",
    );
    expect(ambience?.stems[0]?.loop_start_seconds).toBe(1.25);
    expect(ambience?.stems[0]?.sources.map((source) => source.source_title)).toEqual([
      "First",
      "Second",
    ]);
  });
});
