import { describe, expect, test } from "bun:test";
import {
  cleanupBackoffMinutes,
  getCleanupReferenceStatus,
  processCleanupBatch,
  resolveCleanupBackend,
  type CleanupItem,
  type CleanupReferenceClient,
  type CleanupReferenceStatus,
  type CleanupRepository,
} from "./admin-cleanup";

function client(result: { data: boolean | null; error: { message?: string } | null }) {
  return {
    rpc: async () => result,
  } as CleanupReferenceClient;
}

describe("admin storage cleanup", () => {
  test("selects the cleanup backend independently and case-sensitively", () => {
    expect(resolveCleanupBackend(undefined)).toBe("supabase");
    expect(resolveCleanupBackend("")).toBe("supabase");
    expect(resolveCleanupBackend("neon")).toBe("neon");
    expect(() => resolveCleanupBackend("Neon")).toThrow("CLEANUP_BACKEND");
  });

  test("deletes only objects confirmed to be unreferenced", async () => {
    const object = { bucket: "scene-media", objectPath: "rooms/demo/background/file.webp" };
    expect(await getCleanupReferenceStatus(client({ data: false, error: null }), object)).toBe(
      "unreferenced",
    );
    expect(await getCleanupReferenceStatus(client({ data: true, error: null }), object)).toBe(
      "referenced",
    );
  });

  test("fails closed when the database reference check is unavailable", async () => {
    const status = await getCleanupReferenceStatus(
      client({ data: null, error: { message: "offline" } }),
      { bucket: "ambience-audio", objectPath: "rooms/demo/ambience/file.mp3" },
    );
    expect(status).toBe("unavailable");
  });

  test("processes removed, referenced, unavailable, and unknown objects safely", async () => {
    const items: CleanupItem[] = [
      { id: "remove", bucket: "scene-media", objectPath: "remove", attempts: 0 },
      { id: "keep", bucket: "ambience-audio", objectPath: "keep", attempts: 0 },
      { id: "retry", bucket: "scene-media", objectPath: "retry", attempts: 2 },
      { id: "unknown", bucket: "other", objectPath: "unknown", attempts: 0 },
    ];
    const completed: string[] = [];
    const retried: Array<[string, string, number]> = [];
    const statuses: Record<string, CleanupReferenceStatus> = {
      remove: "unreferenced",
      keep: "referenced",
      retry: "unavailable",
    };
    const repository: CleanupRepository = {
      async runRetention() {
        return { ok: true };
      },
      async claim() {
        return items;
      },
      async referenceStatus(item) {
        return statuses[item.id] ?? "unavailable";
      },
      async complete(item, result) {
        completed.push(`${item.id}:${result}`);
      },
      async retry(item, reason, delay) {
        retried.push([item.id, reason, delay]);
      },
    };
    const removed: string[] = [];
    const result = await processCleanupBatch(repository, {
      async remove(_bucket, path) {
        removed.push(path);
      },
    });
    expect(result).toMatchObject({ claimed: 4, removed: 1, skipped: 1, failed: 2 });
    expect(removed).toEqual(["remove"]);
    expect(completed).toEqual(["remove:removed", "keep:skipped_referenced"]);
    expect(retried).toEqual([
      ["retry", "reference_check_unavailable", cleanupBackoffMinutes(2)],
      ["unknown", "unsupported_bucket", cleanupBackoffMinutes(0)],
    ]);
  });

  test("retries Storage failures with bounded exponential backoff", async () => {
    expect(cleanupBackoffMinutes(0)).toBe(2);
    expect(cleanupBackoffMinutes(20)).toBe(1440);

    const retries: Array<[string, string, number]> = [];
    const repository: CleanupRepository = {
      async runRetention() {},
      async claim() {
        return [{ id: "failed", bucket: "scene-media", objectPath: "failed", attempts: 4 }];
      },
      async referenceStatus() {
        return "unreferenced";
      },
      async complete() {
        throw new Error("must not complete");
      },
      async retry(item, reason, delay) {
        retries.push([item.id, reason, delay]);
      },
    };
    const result = await processCleanupBatch(repository, {
      async remove() {
        throw new TypeError("network details must stay private");
      },
    });
    expect(result).toMatchObject({ removed: 0, failed: 1 });
    expect(retries).toEqual([["failed", "TypeError", cleanupBackoffMinutes(4)]]);
  });
});
