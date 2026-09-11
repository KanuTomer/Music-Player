import { describe, expect, test } from "bun:test";
import { isNeonAdminData, resolveAdminDataBackend } from "./admin-data";

describe("administrator data backend", () => {
  test("defaults missing and empty values to Supabase", () => {
    expect(resolveAdminDataBackend(undefined)).toBe("supabase");
    expect(resolveAdminDataBackend("")).toBe("supabase");
  });

  test("accepts only exact supported values", () => {
    expect(resolveAdminDataBackend("supabase")).toBe("supabase");
    expect(resolveAdminDataBackend("neon")).toBe("neon");
    expect(isNeonAdminData("neon")).toBe(true);
    expect(() => resolveAdminDataBackend("Neon")).toThrow("ADMIN_DATA_BACKEND");
    expect(() => resolveAdminDataBackend("other")).toThrow("ADMIN_DATA_BACKEND");
  });
});
