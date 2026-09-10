import { describe, expect, test } from "bun:test";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { createNeonOperationalWriteRepository } from "./rooms.operations.neon.server";

const VISIT_ID = "f6adb0b3-5e24-4799-b008-2ff909e97e6e";
const SOURCE_ID = "3d2d3988-2b25-41ea-812b-e08340426f72";

function recorder() {
  const statements: SQL[] = [];
  return {
    statements,
    database: {
      async execute(query: SQL) {
        statements.push(query);
        return [];
      },
    },
  };
}

function compiled(query: SQL) {
  return new PgDialect().sqlToQuery(query);
}

describe("Neon operational writes", () => {
  test("registers a live-scene visit with an atomic deduplicating statement", async () => {
    const { database, statements } = recorder();
    const repository = createNeonOperationalWriteRepository(database);

    await repository.registerRoomVisit({ visitId: VISIT_ID, sceneSlug: "officers-mess" });

    const query = compiled(statements[0]!);
    expect(query.sql).toContain('insert into "room_visits"');
    expect(query.sql).toContain('from "scenes"');
    expect(query.sql).toContain('"is_live" = true');
    expect(query.sql).toContain("on conflict");
    expect(query.sql).toContain("do nothing");
    expect(query.params).toEqual([VISIT_ID, "officers-mess"]);
  });

  test("records one atomic heartbeat increment for the matching live scene", async () => {
    const { database, statements } = recorder();
    const repository = createNeonOperationalWriteRepository(database);

    await repository.recordListening({
      visitId: VISIT_ID,
      sceneSlug: "officers-mess",
      seconds: 15,
    });

    const query = compiled(statements[0]!);
    expect(query.sql).toContain('update "room_visits"');
    expect(query.sql).toContain("coalesce");
    expect(query.sql).toContain('"listening_seconds" = "room_visits"."listening_seconds" +');
    expect(query.sql).toContain('from "scenes"');
    expect(query.params).toEqual([15, VISIT_ID, "officers-mess"]);
  });

  test("aggregates same-day playback failures through the composite conflict key", async () => {
    const { database, statements } = recorder();
    const repository = createNeonOperationalWriteRepository(database);

    expect(await repository.recordSourceFailure({ sourceId: SOURCE_ID, errorCode: 100 })).toEqual({
      recorded: true,
    });

    const query = compiled(statements[0]!);
    expect(query.sql).toContain('insert into "playback_source_failures"');
    expect(query.sql).toContain('"failed_on"');
    expect(query.sql).toContain("do update");
    expect(query.sql).toContain('"occurrence_count" =');
    expect(query.sql).toContain('"playback_source_failures"."occurrence_count" + 1');
    expect(query.params).toEqual([SOURCE_ID, 100]);
  });
});
