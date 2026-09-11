import { describe, expect, test } from "bun:test";
import {
  APPROVED_TABLES,
  EXCLUDED_TABLES,
  RESTORE_ORDER,
  orderApprovedToc,
  parseApprovedToc,
} from "./shadow-production-export.mjs";

describe("shadow production export inventory", () => {
  test("contains exactly the approved Neon-owned tables", () => {
    expect(APPROVED_TABLES).toHaveLength(20);
    expect(new Set(APPROVED_TABLES).size).toBe(20);
    expect(APPROVED_TABLES).toContain("private.ambience_asset_provenance");
    for (const excluded of EXCLUDED_TABLES) expect(APPROVED_TABLES).not.toContain(excluded);
  });

  test("parses table data and sequence entries without accepting unrelated TOC objects", () => {
    const toc = [
      "1; 0 1 TABLE DATA public scenes owner",
      "2; 0 2 SEQUENCE SET public scenes_id_seq owner",
      "3; 0 3 ACL public scenes owner",
      "4; 0 4 TABLE DATA private ambience_asset_provenance owner",
    ].join("\n");
    expect(parseApprovedToc(toc)).toEqual({
      tableData: ["private.ambience_asset_provenance", "public.scenes"],
      sequenceSets: ["public.scenes_id_seq"],
    });
  });

  test("orders table data according to foreign-key dependencies", () => {
    const toc = RESTORE_ORDER.map(
      (table, index) => `${index}; 0 ${index} TABLE DATA ${table.replace(".", " ")} owner`,
    )
      .reverse()
      .join("\n");
    const ordered = parseApprovedToc(orderApprovedToc(toc));
    expect(ordered.tableData).toEqual([...APPROVED_TABLES].sort());
    expect(orderApprovedToc(toc).indexOf("public app_admins")).toBeLessThan(
      orderApprovedToc(toc).indexOf("public admin_audit_log"),
    );
  });
});
