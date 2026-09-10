import { describe, expect, test } from "bun:test";
import {
  normalizePlaybackSourceFailureInput,
  normalizeRoomListeningInput,
  normalizeRoomVisitInput,
} from "./rooms.operations";

const UUID = "f6adb0b3-5e24-4799-b008-2ff909e97e6e";

describe("room operational write validation", () => {
  test("accepts valid room visits and trims scene slugs", () => {
    expect(normalizeRoomVisitInput(UUID, "  officers-mess  ")).toEqual({
      visitId: UUID,
      sceneSlug: "officers-mess",
    });
  });

  test("rejects invalid visit identifiers and empty scene slugs", () => {
    expect(() => normalizeRoomVisitInput("not-a-uuid", "room")).toThrow("Invalid visit identifier");
    expect(() => normalizeRoomVisitInput(UUID, "   ")).toThrow("Invalid scene slug");
    expect(() => normalizeRoomVisitInput(UUID, undefined)).toThrow("Invalid scene slug");
  });

  test("normalizes finite heartbeat durations to an integer from 1 through 60", () => {
    expect(normalizeRoomListeningInput(UUID, "room", 12.9).seconds).toBe(12);
    expect(normalizeRoomListeningInput(UUID, "room", 0).seconds).toBe(1);
    expect(normalizeRoomListeningInput(UUID, "room", 90).seconds).toBe(60);
    expect(() => normalizeRoomListeningInput(UUID, "room", Number.NaN)).toThrow(
      "Invalid listening duration",
    );
  });

  test("accepts only supported playback failure codes and valid source UUIDs", () => {
    expect(normalizePlaybackSourceFailureInput(UUID, 153)).toEqual({
      sourceId: UUID,
      errorCode: 153,
    });
    expect(() => normalizePlaybackSourceFailureInput(UUID, 500)).toThrow("Invalid player error");
    expect(() => normalizePlaybackSourceFailureInput("bad", 2)).toThrow(
      "Invalid source identifier",
    );
  });
});
