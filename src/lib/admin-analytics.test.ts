import { describe, expect, test } from "bun:test";
import { analyticsSince, retainComparedSceneIds, sortComparedAnalytics } from "./admin-analytics";

describe("admin analytics helpers", () => {
  test("calculates a stable period boundary", () => {
    const now = new Date("2026-09-05T12:00:00.000Z");
    expect(analyticsSince("7d", now)).toBe("2026-08-29T12:00:00.000Z");
    expect(analyticsSince("30d", now)).toBe("2026-08-06T12:00:00.000Z");
    expect(analyticsSince("all", now)).toBeUndefined();
  });

  test("keeps valid comparison choices through period refreshes", () => {
    expect(retainComparedSceneIds(["a", "b"], ["a", "b", "c"], "c")).toEqual(["a", "b"]);
    expect(retainComparedSceneIds([], ["a", "b"], "b")).toEqual(["b"]);
    expect(retainComparedSceneIds(["gone"], ["a"], "a")).toEqual(["a"]);
  });

  test("sorts selected Jagahs by listening time then name", () => {
    const rows = [
      { sceneId: "a", title: "Zebra", listeningSeconds: 20 },
      { sceneId: "b", title: "Alpha", listeningSeconds: 20 },
      { sceneId: "c", title: "Ignored", listeningSeconds: 60 },
    ];
    expect(sortComparedAnalytics(rows, ["a", "b"]).map((row) => row.sceneId)).toEqual(["b", "a"]);
  });
});
