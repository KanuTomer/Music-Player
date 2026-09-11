import { describe, expect, test } from "bun:test";
import {
  ambienceUploadStemDefaults,
  cancelUnsignedReservation,
  compensateUploadedObject,
  createSignedUploadWithCompensation,
  isAdminStorageBucket,
  validateAmbienceFinalization,
  validateBackgroundWebp,
  validateStoragePath,
  type CompensationDependencies,
  type DiscardResult,
  type ReferenceStatus,
} from "./admin-storage";

const background = "rooms/demo/background/123e4567-e89b-42d3-a456-426614174000.webp";
const ambience = "rooms/demo/ambience/123e4567-e89b-42d3-a456-426614174000.mp3";

function compensation(
  options: {
    discard?: DiscardResult;
    reference?: ReferenceStatus;
    removalError?: Error;
  } = {},
) {
  const calls: string[] = [];
  const dependencies: CompensationDependencies = {
    async discard(queue) {
      calls.push(`discard:${queue}`);
      return options.discard ?? "discarded";
    },
    async referenceStatus() {
      calls.push("reference");
      return options.reference ?? "unreferenced";
    },
    async remove() {
      calls.push("remove");
      if (options.removalError) throw options.removalError;
    },
    async completeCleanup() {
      calls.push("complete");
    },
    async recordRemovalFailure() {
      calls.push("failure");
    },
  };
  return { dependencies, calls };
}

describe("administrator Storage paths and provenance", () => {
  test("accepts only exact UUIDv4 purpose paths", () => {
    expect(validateStoragePath("background", background, "demo")).toBe("demo");
    expect(validateStoragePath("ambience", ambience, "demo")).toBe("demo");
    expect(() => validateStoragePath("background", ambience)).toThrow("Invalid upload path");
    expect(() => validateStoragePath("background", background, "other")).toThrow(
      "Invalid upload path",
    );
    expect(isAdminStorageBucket("scene-media")).toBe(true);
    expect(isAdminStorageBucket("ambience-audio")).toBe(true);
    expect(isAdminStorageBucket("unknown-bucket")).toBe(false);
  });

  test("accepts bounded WebP dimensions and rejects invalid or oversized data", () => {
    const webp = Buffer.alloc(30);
    webp.write("RIFF", 0, "ascii");
    webp.write("WEBP", 8, "ascii");
    webp.write("VP8X", 12, "ascii");
    webp.writeUIntLE(639, 24, 3);
    webp.writeUIntLE(359, 27, 3);
    expect(validateBackgroundWebp(webp)).toEqual({ width: 640, height: 360 });
    expect(() => validateBackgroundWebp(Buffer.from("not-webp"))).toThrow("WebP");
    expect(() => validateBackgroundWebp(Buffer.alloc(5 * 1024 * 1024 + 1))).toThrow("5 MiB");
  });

  test("normalizes valid provenance and rejects invalid ranges", () => {
    const input = {
      sceneId: crypto.randomUUID(),
      reservationId: crypto.randomUUID(),
      path: ambience,
      name: " Rain ",
      role: "texture" as const,
      sourceFilename: " source.wav ",
      sourceByteSize: 100,
      sourceDurationSeconds: 20,
      sourceSha256: "a".repeat(64),
      selectedStartSeconds: 5,
      selectedDurationSeconds: 15,
    };
    expect(validateAmbienceFinalization(input)).toMatchObject({
      name: "Rain",
      sourceFilename: "source.wav",
      sourceSha256: "A".repeat(64),
    });
    expect(() => validateAmbienceFinalization({ ...input, selectedDurationSeconds: 16 })).toThrow(
      "provenance",
    );
  });

  test("matches established role-specific stem defaults", () => {
    expect(ambienceUploadStemDefaults("base")).toMatchObject({
      defaultVolume: 0.9,
      minGain: 0.82,
      maxGain: 0.96,
      crossfadeMs: 2500,
      sortOrder: 99,
    });
    expect(ambienceUploadStemDefaults("texture")).toMatchObject({
      defaultVolume: 0.6,
      minGain: 0.52,
      maxGain: 0.68,
    });
    expect(ambienceUploadStemDefaults("event")).toMatchObject({
      defaultVolume: 0.35,
      minGain: 0.22,
      maxGain: 0.48,
      crossfadeMs: 0,
      eventMinSeconds: 35,
      eventMaxSeconds: 110,
      category: "ambient",
      synthKey: "sample",
    });
  });
});

describe("cross-provider upload compensation", () => {
  test("returns a signed upload response without compensation", async () => {
    const { dependencies, calls } = compensation();
    await expect(
      createSignedUploadWithCompensation(async () => ({ token: "scoped-token" }), dependencies),
    ).resolves.toEqual({ token: "scoped-token" });
    expect(calls).toEqual([]);
  });

  test("cancels the reservation when upload signing fails", async () => {
    const { dependencies, calls } = compensation();
    await expect(
      createSignedUploadWithCompensation(async () => {
        throw new Error("signing failed");
      }, dependencies),
    ).rejects.toThrow("signing failed");
    expect(calls).toEqual(["discard:false"]);
  });

  test("cancels unsigned reservations without queueing an object", async () => {
    const { dependencies, calls } = compensation();
    expect(await cancelUnsignedReservation(dependencies)).toBe("discarded");
    expect(calls).toEqual(["discard:false"]);
  });

  test("removes only confirmed unreferenced objects and completes cleanup", async () => {
    const { dependencies, calls } = compensation();
    expect(await compensateUploadedObject(dependencies)).toBe("removed");
    expect(calls).toEqual(["discard:true", "reference", "remove", "complete"]);
  });

  test("preserves finalized and referenced objects", async () => {
    const finalized = compensation({ discard: "finalized" });
    expect(await compensateUploadedObject(finalized.dependencies)).toBe("preserved");
    expect(finalized.calls).toEqual(["discard:true"]);
    const referenced = compensation({ reference: "referenced" });
    expect(await compensateUploadedObject(referenced.dependencies)).toBe("preserved");
    expect(referenced.calls).toEqual(["discard:true", "reference"]);
  });

  test("fails closed when reservation or reference state is unavailable", async () => {
    const invalid = compensation({ discard: "invalid" });
    expect(await compensateUploadedObject(invalid.dependencies)).toBe("unavailable");
    expect(invalid.calls).toEqual(["discard:true"]);
    const unavailable = compensation({ reference: "unavailable" });
    expect(await compensateUploadedObject(unavailable.dependencies)).toBe("queued");
    expect(unavailable.calls).toEqual(["discard:true", "reference"]);
  });

  test("keeps failed removals queued", async () => {
    const { dependencies, calls } = compensation({ removalError: new Error("offline") });
    expect(await compensateUploadedObject(dependencies)).toBe("queued");
    expect(calls).toEqual(["discard:true", "reference", "remove", "failure"]);
  });
});
