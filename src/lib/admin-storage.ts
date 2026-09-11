import type { AmbienceRole } from "./ambience-processing";

export type AdminStorageBucket = "scene-media" | "ambience-audio";
export type UploadPurpose = "background" | "ambience";
export type ReservationStatus = "active" | "finalized" | "invalid";
export type DiscardResult = "discarded" | "already_discarded" | "finalized" | "invalid";
export type ReferenceStatus = "referenced" | "unreferenced" | "unavailable";

const UUID_V4 = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const BACKGROUND_PATH = new RegExp(`^rooms/([a-z0-9-]+)/background/${UUID_V4}\\.webp$`, "i");
const AMBIENCE_PATH = new RegExp(`^rooms/([a-z0-9-]+)/ambience/${UUID_V4}\\.mp3$`, "i");
const SHA256 = /^[A-F0-9]{64}$/;
const BACKGROUND_MAX_BYTES = 5 * 1024 * 1024;

export function validateStoragePath(purpose: UploadPurpose, path: string, expectedSlug?: string) {
  const match = path.match(purpose === "background" ? BACKGROUND_PATH : AMBIENCE_PATH);
  if (!match || (expectedSlug && match[1] !== expectedSlug)) throw new Error("Invalid upload path");
  return match[1]!;
}

export function storageBucketFor(purpose: UploadPurpose): AdminStorageBucket {
  return purpose === "background" ? "scene-media" : "ambience-audio";
}

export function isAdminStorageBucket(value: string): value is AdminStorageBucket {
  return value === "scene-media" || value === "ambience-audio";
}

export function isMissingStorageError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { status?: unknown; statusCode?: unknown; message?: unknown };
  return (
    value.status === 404 ||
    value.statusCode === 404 ||
    (typeof value.message === "string" && /not[ -]?found|does not exist/i.test(value.message))
  );
}

export function validateBackgroundWebp(data: Buffer) {
  if (
    data.length < 16 ||
    data.length > BACKGROUND_MAX_BYTES ||
    data.toString("ascii", 0, 4) !== "RIFF" ||
    data.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error("Prepared background must be a WebP image no larger than 5 MiB");
  }
  const chunk = data.toString("ascii", 12, 16);
  let width = 0;
  let height = 0;
  if (chunk === "VP8X" && data.length >= 30) {
    width = 1 + data.readUIntLE(24, 3);
    height = 1 + data.readUIntLE(27, 3);
  } else if (
    chunk === "VP8 " &&
    data.length >= 30 &&
    data[23] === 0x9d &&
    data[24] === 0x01 &&
    data[25] === 0x2a
  ) {
    width = data.readUInt16LE(26) & 0x3fff;
    height = data.readUInt16LE(28) & 0x3fff;
  } else if (chunk === "VP8L" && data.length >= 25 && data[20] === 0x2f) {
    const bits = data.readUInt32LE(21);
    width = 1 + (bits & 0x3fff);
    height = 1 + ((bits >>> 14) & 0x3fff);
  }
  if (!width || !height || Math.max(width, height) > 2560) {
    throw new Error("Prepared background is invalid or exceeds the 2560-pixel edge limit");
  }
  return { width, height };
}

export function ambienceUploadStemDefaults(role: AmbienceRole) {
  const gains =
    role === "base"
      ? { defaultVolume: 0.9, minGain: 0.82, maxGain: 0.96 }
      : role === "texture"
        ? { defaultVolume: 0.6, minGain: 0.52, maxGain: 0.68 }
        : { defaultVolume: 0.35, minGain: 0.22, maxGain: 0.48 };
  return {
    ...gains,
    sortOrder: 99,
    crossfadeMs: role === "event" ? 0 : 2500,
    eventMinSeconds: role === "event" ? 35 : null,
    eventMaxSeconds: role === "event" ? 110 : null,
    category: "ambient" as const,
    synthKey: "sample" as const,
  };
}

export type AmbienceFinalizationInput = {
  sceneId: string;
  reservationId: string;
  path: string;
  name: string;
  role: AmbienceRole;
  sourceFilename: string;
  sourceByteSize: number;
  sourceDurationSeconds: number;
  sourceSha256: string;
  sourceUrl?: string;
  selectedStartSeconds: number;
  selectedDurationSeconds: number;
};

export function validateAmbienceFinalization(input: AmbienceFinalizationInput) {
  validateStoragePath("ambience", input.path);
  const name = input.name.trim();
  const sourceFilename = input.sourceFilename.trim();
  const sourceSha256 = input.sourceSha256.toUpperCase();
  const sourceByteSize = Math.round(Number(input.sourceByteSize));
  const sourceDurationSeconds = Number(input.sourceDurationSeconds);
  const selectedStartSeconds = Number(input.selectedStartSeconds);
  const selectedDurationSeconds = Number(input.selectedDurationSeconds);
  if (
    !name ||
    !sourceFilename ||
    !["base", "texture", "event"].includes(input.role) ||
    !SHA256.test(sourceSha256) ||
    !Number.isFinite(sourceByteSize) ||
    sourceByteSize < 1 ||
    !Number.isFinite(sourceDurationSeconds) ||
    sourceDurationSeconds <= 0 ||
    !Number.isFinite(selectedStartSeconds) ||
    selectedStartSeconds < 0 ||
    !Number.isFinite(selectedDurationSeconds) ||
    selectedDurationSeconds <= 0 ||
    selectedStartSeconds + selectedDurationSeconds > sourceDurationSeconds + 0.05
  ) {
    throw new Error("Invalid ambience asset provenance");
  }
  return {
    ...input,
    name,
    sourceFilename,
    sourceSha256,
    sourceByteSize,
    sourceDurationSeconds,
    selectedStartSeconds,
    selectedDurationSeconds,
    sourceUrl: input.sourceUrl?.trim() || null,
  };
}

export interface CompensationDependencies {
  discard(queueObject: boolean): Promise<DiscardResult>;
  referenceStatus(): Promise<ReferenceStatus>;
  remove(): Promise<void>;
  completeCleanup(): Promise<void>;
  recordRemovalFailure(message: string): Promise<void>;
}

export async function cancelUnsignedReservation(dependencies: CompensationDependencies) {
  return dependencies.discard(false);
}

export async function createSignedUploadWithCompensation<T>(
  createSignedUpload: () => Promise<T>,
  dependencies: CompensationDependencies,
) {
  try {
    return await createSignedUpload();
  } catch (error) {
    await cancelUnsignedReservation(dependencies);
    throw error;
  }
}

export async function compensateUploadedObject(dependencies: CompensationDependencies) {
  const discarded = await dependencies.discard(true);
  if (discarded === "finalized") return "preserved" as const;
  if (discarded === "invalid") return "unavailable" as const;
  const reference = await dependencies.referenceStatus();
  if (reference !== "unreferenced") return reference === "referenced" ? "preserved" : "queued";
  try {
    await dependencies.remove();
    await dependencies.completeCleanup();
    return "removed" as const;
  } catch (error) {
    await dependencies.recordRemovalFailure(
      error instanceof Error ? error.message : "Storage removal failed",
    );
    return "queued" as const;
  }
}
