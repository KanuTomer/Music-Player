import { describe, expect, test } from "bun:test";
import { hasAdminDraftChanges, sameAdminDraft } from "./admin-drafts";

describe("admin draft helpers", () => {
  test("detects field changes and treats an exact reset as clean", () => {
    const saved = { enabled: true, musicDuckRatio: 0.4, audioTheme: { base: { peak_q: 1 } } };
    expect(sameAdminDraft(saved, { ...saved })).toBe(true);
    expect(sameAdminDraft(saved, { ...saved, musicDuckRatio: 0.25 })).toBe(false);
  });

  test("only warns for editable drafts, not view state", () => {
    expect(
      hasAdminDraftChanges({
        songInput: "",
        songDraftCount: 0,
        songEditChanged: false,
        ambienceChanged: false,
      }),
    ).toBe(false);
    expect(
      hasAdminDraftChanges({
        songInput: "https://youtu.be/example",
        songDraftCount: 0,
        songEditChanged: false,
        ambienceChanged: false,
      }),
    ).toBe(true);
  });
});
