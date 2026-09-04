import { describe, expect, test } from "bun:test";
import { youtubeVideoId } from "./admin.server";

describe("admin YouTube source validation", () => {
  test("accepts supported YouTube forms and raw video IDs", () => {
    expect(youtubeVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeVideoId("https://youtu.be/dQw4w9WgXcQ?t=4")).toBe("dQw4w9WgXcQ");
    expect(youtubeVideoId("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  test("rejects malformed IDs and lookalike hosts", () => {
    expect(youtubeVideoId("too-short")).toBeNull();
    expect(youtubeVideoId("https://youtube.example/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(youtubeVideoId("https://example.com/?v=dQw4w9WgXcQ")).toBeNull();
  });
});
