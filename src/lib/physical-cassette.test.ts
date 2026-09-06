import { describe, expect, test } from "bun:test";
import {
  cassetteMixHex,
  cassettePrinted,
  cassetteReadableInk,
  cassetteReelRotationSeconds,
  cassetteTapeRadii,
  clampCassetteProgress,
  physicalCassetteLabels,
} from "./physical-cassette";

describe("physical cassette progress", () => {
  test("clamps invalid progress and winds tape between the two reels", () => {
    expect(clampCassetteProgress(Number.NaN)).toBe(0);
    expect(clampCassetteProgress(-1)).toBe(0);
    expect(clampCassetteProgress(2)).toBe(1);

    expect(cassetteTapeRadii(0)).toEqual({ left: 150, right: 82 });
    expect(cassetteTapeRadii(1)).toEqual({ left: 82, right: 150 });
    const halfway = cassetteTapeRadii(0.5);
    expect(halfway.left).toBeCloseTo(halfway.right);

    expect(cassetteReelRotationSeconds(82)).toBe(3.2);
    expect(cassetteReelRotationSeconds(150)).toBeCloseTo(5.85, 2);
    expect(cassetteReelRotationSeconds(Number.NaN)).toBe(3.2);
  });
});

describe("physical cassette labels", () => {
  test("uses loading and unavailable copy without leaking stale metadata", () => {
    expect(
      physicalCassetteLabels({
        jagah: "Sainik Dhaba",
        display: { title: "Old title", subtitle: "Old artist", status: "loading" },
        transitioning: false,
      }),
    ).toEqual({ title: "Sainik Dhaba is loading…", artist: "Cassette tuning" });

    expect(
      physicalCassetteLabels({
        jagah: "Sainik Dhaba",
        display: { title: "Challa", subtitle: "Gurdas Maan", status: "unavailable" },
        transitioning: false,
      }),
    ).toEqual({ title: "Track unavailable", artist: "Gurdas Maan" });
  });

  test("truncates printed labels and provides stable palette fallbacks", () => {
    expect(cassettePrinted("A title that is far too long", "Fallback", 12)).toBe("A title tha…");
    expect(cassetteMixHex(undefined, [255, 247, 218], 0)).toBe("#d6bd80");
    expect(cassetteReadableInk("#101010")).toBe("#f4e7c8");
    expect(cassetteReadableInk("#f5e6c8")).toBe("#2d1b12");
  });
});
