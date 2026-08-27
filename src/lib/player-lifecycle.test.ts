import { describe, expect, test } from "bun:test";
import { playlistLifecycleAction } from "./player-lifecycle";

describe("playlistLifecycleAction", () => {
  test("builds when there is no player", () => {
    expect(
      playlistLifecycleAction({
        requestedPlaylistId: "playlist-b",
        loadedPlaylistId: null,
        hasPlayer: false,
        isReady: false,
      }),
    ).toBe("build");
  });

  test("builds once when the requested playlist changes", () => {
    expect(
      playlistLifecycleAction({
        requestedPlaylistId: "playlist-b",
        loadedPlaylistId: "playlist-a",
        hasPlayer: true,
        isReady: true,
      }),
    ).toBe("build");
  });

  test("waits instead of rebuilding while the matching player initializes", () => {
    expect(
      playlistLifecycleAction({
        requestedPlaylistId: "playlist-b",
        loadedPlaylistId: "playlist-b",
        hasPlayer: true,
        isReady: false,
      }),
    ).toBe("wait");
  });

  test("controls the matching player only after it is ready", () => {
    expect(
      playlistLifecycleAction({
        requestedPlaylistId: "playlist-b",
        loadedPlaylistId: "playlist-b",
        hasPlayer: true,
        isReady: true,
      }),
    ).toBe("control");
  });
});
