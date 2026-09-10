import { describe, expect, test } from "bun:test";
import {
  resolveDataBackend,
  resolveOperationalWriteBackend,
  selectOperationalWriteRepository,
  selectRoomReadRepository,
} from "./rooms.backend.server";

describe("room data backend selection", () => {
  test("defaults missing and empty values to Supabase", () => {
    expect(resolveDataBackend(undefined)).toBe("supabase");
    expect(resolveDataBackend("")).toBe("supabase");
  });

  test("accepts only the exact supported values", () => {
    expect(resolveDataBackend("supabase")).toBe("supabase");
    expect(resolveDataBackend("neon")).toBe("neon");
    expect(() => resolveDataBackend("Neon")).toThrow("DATA_BACKEND");
    expect(() => resolveDataBackend("other")).toThrow("DATA_BACKEND");
  });

  test("does not load Neon when Supabase is selected", async () => {
    let neonLoads = 0;
    const supabaseRepository = { provider: "supabase" };
    const selected = await selectRoomReadRepository(
      supabaseRepository,
      async () => {
        neonLoads += 1;
        return { provider: "neon" };
      },
      "supabase",
    );

    expect(selected).toBe(supabaseRepository);
    expect(neonLoads).toBe(0);
  });

  test("loads Neon lazily when Neon is selected", async () => {
    let neonLoads = 0;
    const selected = await selectRoomReadRepository(
      { provider: "supabase" },
      async () => {
        neonLoads += 1;
        return { provider: "neon" };
      },
      "neon",
    );

    expect(selected.provider).toBe("neon");
    expect(neonLoads).toBe(1);
  });

  test("selects operational writes independently and defaults to Supabase", async () => {
    expect(resolveOperationalWriteBackend(undefined)).toBe("supabase");
    expect(resolveOperationalWriteBackend("")).toBe("supabase");
    expect(resolveOperationalWriteBackend("neon")).toBe("neon");
    expect(() => resolveOperationalWriteBackend("Neon")).toThrow("OPERATIONAL_WRITE_BACKEND");

    let supabaseLoads = 0;
    let neonLoads = 0;
    const selected = await selectOperationalWriteRepository(
      async () => {
        supabaseLoads += 1;
        return { provider: "supabase" };
      },
      async () => {
        neonLoads += 1;
        return { provider: "neon" };
      },
      undefined,
    );

    expect(selected.provider).toBe("supabase");
    expect(supabaseLoads).toBe(1);
    expect(neonLoads).toBe(0);
  });

  test("loads only the Neon operational repository when selected", async () => {
    let supabaseLoads = 0;
    let neonLoads = 0;
    const selected = await selectOperationalWriteRepository(
      async () => {
        supabaseLoads += 1;
        return { provider: "supabase" };
      },
      async () => {
        neonLoads += 1;
        return { provider: "neon" };
      },
      "neon",
    );

    expect(selected.provider).toBe("neon");
    expect(supabaseLoads).toBe(0);
    expect(neonLoads).toBe(1);
  });
});
