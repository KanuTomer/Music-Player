import { describe, expect, test } from "bun:test";
import { isSceneChatRoomKey, sceneChatRoomKey } from "./chat-room";

describe("scene chat room keys", () => {
  test("creates the canonical per-room key", () => {
    expect(sceneChatRoomKey("nai-ki-dukaan")).toBe("scene:nai-ki-dukaan");
  });

  test("rejects malformed slugs and the legacy global key", () => {
    expect(() => sceneChatRoomKey("Nai Ki Dukaan")).toThrow("Invalid scene slug");
    expect(isSceneChatRoomKey("global-chat")).toBe(false);
    expect(isSceneChatRoomKey("room:scene:nai-ki-dukaan")).toBe(false);
    expect(isSceneChatRoomKey("scene:nai-ki-dukaan")).toBe(true);
  });
});
