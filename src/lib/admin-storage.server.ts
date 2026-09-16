import { del } from "@vercel/blob";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { blobPath, publicStorageUrl } from "./public-storage.server";
import { isMissingStorageError, type AdminStorageBucket } from "./admin-storage";

function blobToken() {
  const token = process.env["BLOB_READ_WRITE_TOKEN"];
  if (!token) throw new Error("Blob Storage configuration is unavailable");
  return token;
}

export const adminStorage = {
  publicUrl(bucket: AdminStorageBucket, path: string | null | undefined) {
    return publicStorageUrl(bucket, path);
  },
  async createSignedUploadUrl(bucket: AdminStorageBucket, path: string) {
    const token = await generateClientTokenFromReadWriteToken({
      token: blobToken(),
      pathname: blobPath(bucket, path),
      allowedContentTypes: [bucket === "scene-media" ? "image/webp" : "audio/mpeg"],
      maximumSizeInBytes: bucket === "scene-media" ? 5 * 1024 * 1024 : 1024 * 1024,
      validUntil: Date.now() + 10 * 60 * 1000,
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 31_536_000,
    });
    return { token };
  },
  async download(bucket: AdminStorageBucket, path: string) {
    const response = await fetch(publicStorageUrl(bucket, path)!, { cache: "no-store" });
    if (!response.ok) throw new Error("Uploaded object is missing");
    return Buffer.from(await response.arrayBuffer());
  },
  async remove(bucket: AdminStorageBucket, path: string) {
    try {
      await del(blobPath(bucket, path), { token: blobToken() });
    } catch (error) {
      if (!isMissingStorageError(error)) throw error;
    }
  },
};
