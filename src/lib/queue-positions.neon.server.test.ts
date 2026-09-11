import { describe, expect, test } from "bun:test";
import { type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { normalizeQueuePositions } from "./queue-positions.neon.server";

const QUEUE_ID = "5400ffac-b870-4d13-a77a-1740d1bac747";

describe("Neon queue position normalization", () => {
  test("moves positions beyond the occupied range before compacting them", async () => {
    const statements: SQL[] = [];
    await normalizeQueuePositions(
      {
        async execute(query) {
          statements.push(query);
          return { rows: [] };
        },
      },
      QUEUE_ID,
    );

    expect(statements).toHaveLength(2);
    const [temporary, compacted] = statements.map((statement) =>
      new PgDialect().sqlToQuery(statement),
    );
    expect(temporary!.sql).toContain("coalesce(max(position), 0)");
    expect(temporary!.sql).toContain("membership.position + bounds.offset");
    expect(compacted!.sql).toContain("row_number() over(order by position, id)");
    expect(temporary!.params).toEqual([QUEUE_ID, QUEUE_ID]);
    expect(compacted!.params).toEqual([QUEUE_ID]);
  });
});
