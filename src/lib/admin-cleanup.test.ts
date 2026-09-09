import { describe, expect, test } from "bun:test";
import { getCleanupReferenceStatus, type CleanupReferenceClient } from "./admin-cleanup";

function client(result: { data: boolean | null; error: { message?: string } | null }) {
  return {
    rpc: async () => result,
  } as CleanupReferenceClient;
}

describe("admin storage cleanup", () => {
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
});
