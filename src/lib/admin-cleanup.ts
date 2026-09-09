export type CleanupObject = {
  bucket: string;
  objectPath: string;
};

export type CleanupReferenceStatus = "referenced" | "unreferenced" | "unavailable";

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
