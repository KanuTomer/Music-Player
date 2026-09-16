export function blobPath(bucket: string, path: string) {
  return `${bucket}/${path}`;
}

export function publicStorageUrl(bucket: string, path: string | null | undefined) {
  if (!path) return null;
  const baseUrl = process.env["BLOB_PUBLIC_BASE_URL"]?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("Public Blob configuration is unavailable");
  return `${baseUrl}/${blobPath(bucket, path)}`;
}
