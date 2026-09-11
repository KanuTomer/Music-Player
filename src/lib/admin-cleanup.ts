export type CleanupObject = {
  bucket: string;
  objectPath: string;
};

export type CleanupReferenceStatus = "referenced" | "unreferenced" | "unavailable";
export type CleanupBackend = "supabase" | "neon";

export function resolveCleanupBackend(value = process.env["CLEANUP_BACKEND"]): CleanupBackend {
  if (value == null || value === "" || value === "supabase") return "supabase";
  if (value === "neon") return "neon";
  throw new Error("CLEANUP_BACKEND must be either 'supabase' or 'neon'.");
}

export type CleanupItem = {
  id: string;
  bucket: string;
  objectPath: string;
  attempts: number;
};

export type CleanupRepository = {
  runRetention(): Promise<unknown>;
  claim(limit: number): Promise<CleanupItem[]>;
  referenceStatus(item: CleanupItem): Promise<CleanupReferenceStatus>;
  complete(item: CleanupItem, result: "removed" | "skipped_referenced"): Promise<void>;
  retry(item: CleanupItem, reason: string, delayMinutes: number): Promise<void>;
};

export type CleanupStorage = {
  remove(bucket: "scene-media" | "ambience-audio", path: string): Promise<unknown>;
};

export function cleanupBackoffMinutes(attempts: number) {
  return Math.min(24 * 60, 2 ** Math.min(attempts + 1, 11));
}

export async function processCleanupBatch(
  repository: CleanupRepository,
  storage: CleanupStorage,
  limit = 100,
) {
  const retention = await repository.runRetention();
  const items = await repository.claim(limit);
  let removed = 0;
  let skipped = 0;
  let failed = 0;
  for (const item of items) {
    if (item.bucket !== "scene-media" && item.bucket !== "ambience-audio") {
      failed += 1;
      await repository.retry(item, "unsupported_bucket", cleanupBackoffMinutes(item.attempts));
      continue;
    }
    const reference = await repository.referenceStatus(item);
    if (reference === "referenced") {
      skipped += 1;
      await repository.complete(item, "skipped_referenced");
      continue;
    }
    if (reference === "unavailable") {
      failed += 1;
      await repository.retry(
        item,
        "reference_check_unavailable",
        cleanupBackoffMinutes(item.attempts),
      );
      continue;
    }
    try {
      await storage.remove(item.bucket, item.objectPath);
      await repository.complete(item, "removed");
      removed += 1;
    } catch (error) {
      failed += 1;
      await repository.retry(
        item,
        error instanceof Error ? error.name : "StorageRemovalError",
        cleanupBackoffMinutes(item.attempts),
      );
    }
  }
  return { retention, claimed: items.length, removed, skipped, failed };
}

export type CleanupReferenceClient = {
  rpc: (
    name: "admin_storage_object_is_referenced",
    args: { p_bucket: string; p_object_path: string },
  ) => PromiseLike<{ data: boolean | null; error: { message?: string } | null }>;
};

export async function getCleanupReferenceStatus(
  client: CleanupReferenceClient,
  object: CleanupObject,
): Promise<CleanupReferenceStatus> {
  const { data, error } = await client.rpc("admin_storage_object_is_referenced", {
    p_bucket: object.bucket,
    p_object_path: object.objectPath,
  });
  if (error || typeof data !== "boolean") return "unavailable";
  return data ? "referenced" : "unreferenced";
}
