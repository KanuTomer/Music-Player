import { describe, expect, test } from "bun:test";
import { resolveRetiredRoomSlug } from "./room-route";

describe("room route aliases", () => {
  test("preserves retired redirects for standard and cassette loaders", () => {
    expect(resolveRetiredRoomSlug("raat-ki-bus")).toBe("bus-driver");
    expect(resolveRetiredRoomSlug("sainik-dhaba")).toBeNull();
  });
});
