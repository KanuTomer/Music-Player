import { describe, expect, test } from "bun:test";
import { collectRollbackScope, validateRollbackActions } from "./neon-rollback-scope.mjs";

describe("Neon rollback scope", () => {
  test("fails closed for an unrecognized administrator mutation", () => {
    expect(() => validateRollbackActions(["scene.presentation.save", "unknown.write"])).toThrow(
      "Unknown administrator audit actions: unknown.write",
    );
  });

  test("summarizes affected aggregates without returning object paths", async () => {
    const results = [
      {
        rows: [
          { action: "scene.presentation.save", slug: "demo", count: 2 },
          { action: "songs.bulk_add", slug: "demo", count: 1 },
        ],
      },
      { rows: [{ visits: 3, listening_seconds: "45" }] },
      { rows: [{ source_failures: 1, reservations: 2, cleanup_rows: 4 }] },
      { rows: [{ backgrounds: 1, ambience_objects: 3 }] },
    ];
    const database = {
      async query() {
        return results.shift()!;
      },
    };

    const scope = await collectRollbackScope(database, "2026-09-11T00:00:00.000Z");
    expect(scope.affectedScenes).toEqual(["demo"]);
    expect(scope.operational).toEqual({
      visits: 3,
      listeningSeconds: 45,
      sourceFailures: 1,
      reservations: 2,
      cleanupRows: 4,
    });
    expect(scope.referencedStorage).toEqual({ backgrounds: 1, ambienceObjects: 3 });
    expect(JSON.stringify(scope)).not.toContain("objectPath");
  });
});
