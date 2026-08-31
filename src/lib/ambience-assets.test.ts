import { describe, expect, test } from "bun:test";

type Manifest = {
  format: { mimeType: string; sampleRate: number; channels: number; bitsPerSample: number };
  assets: Array<{
    storagePath: string;
    bytes: number;
    sha256: string;
    sources: Array<{ file: string; sha256: string; sourceUrl: string }>;
  }>;
};

describe("ambience asset manifest", () => {
  test("contains the approved optimized inventory and one shared highway object", async () => {
    const manifest = (await Bun.file(
      new URL("../../docs/ambience-assets.json", import.meta.url),
    ).json()) as Manifest;
    expect(manifest.format).toEqual({
      mimeType: "audio/wav",
      sampleRate: 32000,
      channels: 1,
      bitsPerSample: 16,
    });
    expect(manifest.assets).toHaveLength(20);
    expect(manifest.assets.flatMap((asset) => asset.sources)).toHaveLength(21);
    expect(
      manifest.assets.filter((asset) => asset.storagePath === "shared/indian-highway.wav"),
    ).toHaveLength(1);
    for (const asset of manifest.assets) {
      expect(asset.bytes).toBeLessThanOrEqual(12 * 1024 * 1024);
      expect(asset.sha256).toMatch(/^[A-F0-9]{64}$/);
      for (const source of asset.sources) {
        expect(source.sha256).toMatch(/^[A-F0-9]{64}$/);
        expect(source.sourceUrl).toStartWith("https://www.youtube.com/watch?v=");
      }
    }
  });

  test("records seven licensed, muted visual overlays", async () => {
    const manifest = (await Bun.file(
      new URL("../../docs/ambience-visual-assets.json", import.meta.url),
    ).json()) as {
      license: { commercialUse: boolean; url: string };
      processing: { audioRemoved: boolean; durationSeconds: number };
      assets: Array<{
        slug: string;
        sourcePage: string;
        sourceSha256: string;
        storagePath: string;
        bytes: number;
        sha256: string;
      }>;
    };
    expect(manifest.license.commercialUse).toBe(true);
    expect(manifest.license.url).toEndWith("#videoFree");
    expect(manifest.processing.audioRemoved).toBe(true);
    expect(manifest.processing.durationSeconds).toBe(12);
    expect(manifest.assets).toHaveLength(7);
    expect(new Set(manifest.assets.map((asset) => asset.slug)).size).toBe(7);
    for (const asset of manifest.assets) {
      expect(asset.sourcePage).toStartWith("https://mixkit.co/free-stock-video/");
      expect(asset.storagePath).toBe(`rooms/${asset.slug}/ambience/overlay.mp4`);
      expect(asset.bytes).toBeLessThan(15 * 1024 * 1024);
      expect(asset.sourceSha256).toMatch(/^[A-F0-9]{64}$/);
      expect(asset.sha256).toMatch(/^[A-F0-9]{64}$/);
    }
  });
});
