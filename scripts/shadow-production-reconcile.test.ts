import { describe, expect, test } from "bun:test";
import { APPROVED_TABLES } from "./shadow-production-export.mjs";
import { compareMetrics } from "./shadow-production-reconcile.mjs";

describe("shadow production reconciliation", () => {
  test("accepts exact metrics and reports deterministic mismatches", () => {
    const expected = Object.fromEntries(
      APPROVED_TABLES.map((table) => [table, { count: 1, primaryKey: ["id"], sha256: "abc" }]),
    );
    expect(compareMetrics(expected, structuredClone(expected))).toEqual([]);
    const actual = structuredClone(expected);
    actual[APPROVED_TABLES[0]].sha256 = "different";
    expect(compareMetrics(expected, actual)).toEqual([`${APPROVED_TABLES[0]}: sha256 mismatch`]);
  });
});
