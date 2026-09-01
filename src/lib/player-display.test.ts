import { describe, expect, test } from "bun:test";
import {
  getPlayerDisplay,
  nextAmbienceToggle,
  normalizeAmbienceLevel,
  readableTitle,
} from "./player-display";
import type { NowPlaying } from "./player";

const empty: NowPlaying = {
  videoId: null,
  title: null,
  channel: null,
  position: 0,
  duration: 0,
  index: 0,
  total: 0,
};

describe("player display", () => {
  test("uses the tuning fallback without leaking stale metadata", () => {
    expect(getPlayerDisplay({ nowPlaying: empty, track: null, musicBlocked: false })).toEqual({
      title: "Tuning in…",
      subtitle: "गीत की जानकारी आ रही है…",
      coverId: null,
      status: "loading",
    });
  });

  test("cleans provider noise from verified metadata", () => {
    expect(readableTitle("Challa Official Video | Jab Tak Hai Jaan | T-Series")).toBe("Challa");
  });

  test("marks blocked playback without replacing verified details", () => {
    const nowPlaying = { ...empty, videoId: "abc", title: "Challa", channel: "YRF" };
    expect(getPlayerDisplay({ nowPlaying, track: null, musicBlocked: true })).toMatchObject({
      title: "Challa",
      subtitle: "YRF",
      coverId: "abc",
      status: "unavailable",
    });
  });
});

describe("normalizeAmbienceLevel", () => {
  test("normalizes preview values to an integer percentage", () => {
    expect(normalizeAmbienceLevel(-3)).toBe(0);
    expect(normalizeAmbienceLevel(49.6)).toBe(50);
    expect(normalizeAmbienceLevel(120)).toBe(100);
    expect(normalizeAmbienceLevel(Number.NaN)).toBe(65);
  });
});

describe("nextAmbienceToggle", () => {
  test("turns ambience on and off without coupling it to the slider panel", () => {
    expect(nextAmbienceToggle(false, 65)).toEqual({ enabled: true, level: 65 });
    expect(nextAmbienceToggle(true, 65)).toEqual({ enabled: false, level: 65 });
  });

  test("restores an audible default when enabling from zero", () => {
    expect(nextAmbienceToggle(false, 0)).toEqual({ enabled: true, level: 65 });
  });
});
