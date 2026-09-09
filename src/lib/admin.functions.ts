import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { analyticsSince, type AnalyticsRange } from "./admin-analytics";
import {
  addSongs,
  deactivateAmbienceStem,
  discardBackgroundUpload,
  finalizeAmbienceUpload,
  getAdminAmbience,
  getAdminAmbienceAssets,
  getAdminAnalytics,
  getAdminBackground,
  getAdminBootstrap,
  getAdminOnboardingStatus,
  getAdminSongs,
  previewSongs,
  removeSongs,
  reserveAmbienceUpload,
  reserveBackgroundUpload,
  saveAmbienceProfile,
  saveAmbienceStem,
  saveScenePresentation,
  updateSong,
} from "./admin.server";

const uuid = z.string().uuid();
const sceneInput = z.object({ sceneId: uuid });
const youtubeInput = z.string().trim().min(1).max(2048);
const songDraft = z.object({
  input: youtubeInput,
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().max(200),
  year: z.number().int().min(1900).max(2100).nullable(),
  providerTitle: z.string().max(300).optional(),
  providerChannel: z.string().max(300).optional(),
});

async function timedAdminOperation<T>(operation: string, run: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  const requestId = crypto.randomUUID();
  try {
    const result = await run();
    console.info("[admin-operation]", {
      operation,
      result: "success",
      durationMs: Math.round(performance.now() - startedAt),
      requestId,
    });
    return result;
  } catch (error) {
    console.error("[admin-operation]", {
      operation,
      result: "failure",
      durationMs: Math.round(performance.now() - startedAt),
      requestId,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    throw error;
  }
}

export const getAdminOnboarding = createServerFn({ method: "GET" }).handler(() =>
  timedAdminOperation("onboarding.status", getAdminOnboardingStatus),
);

export const getAdminBootstrapData = createServerFn({ method: "GET" }).handler(() =>
  timedAdminOperation("bootstrap.read", getAdminBootstrap),
);

export const getAdminSongsData = createServerFn({ method: "GET" })
  .validator((data: { sceneId: string }) => sceneInput.parse(data))
  .handler(({ data }) => timedAdminOperation("songs.read", () => getAdminSongs(data.sceneId)));

export const getAdminAnalyticsData = createServerFn({ method: "GET" })
  .validator((data: { range: AnalyticsRange }) => data)
  .handler(({ data }) =>
    timedAdminOperation("analytics.read", () => getAdminAnalytics(analyticsSince(data.range))),
  );

export const getAdminAmbienceData = createServerFn({ method: "GET" })
  .validator((data: { sceneId: string }) => sceneInput.parse(data))
  .handler(({ data }) =>
    timedAdminOperation("ambience.read", () => getAdminAmbience(data.sceneId)),
  );

export const getAdminAmbienceAssetsData = createServerFn({ method: "GET" }).handler(() =>
  timedAdminOperation("ambience.assets.read", getAdminAmbienceAssets),
);

export const getAdminBackgroundData = createServerFn({ method: "GET" })
  .validator((data: { sceneId: string }) => sceneInput.parse(data))
  .handler(({ data }) =>
    timedAdminOperation("background.read", () => getAdminBackground(data.sceneId)),
  );

export const previewAdminSongs = createServerFn({ method: "POST" })
  .validator((data: { inputs: string[] }) => ({
    inputs: z.array(youtubeInput).min(1).max(50).parse(data.inputs),
  }))
  .handler(({ data }) => timedAdminOperation("songs.preview", () => previewSongs(data.inputs)));

export const addAdminSongs = createServerFn({ method: "POST" })
  .validator(
    (data: {
      queueId: string;
      songs: Array<{
        input: string;
        title: string;
        artist: string;
        year: number | null;
        providerTitle?: string;
        providerChannel?: string;
      }>;
    }) =>
      z
        .object({ queueId: uuid, songs: z.array(songDraft).min(1).max(50) })
        .parse(data) as typeof data,
  )
  .handler(({ data }) =>
    timedAdminOperation("songs.bulk_add", () => addSongs(data.queueId, data.songs)),
  );

export const removeAdminSongs = createServerFn({ method: "POST" })
  .validator((data: { queueId: string; membershipIds: string[] }) =>
    z.object({ queueId: uuid, membershipIds: z.array(uuid).min(1).max(50) }).parse(data),
  )
  .handler(({ data }) =>
    timedAdminOperation("songs.bulk_remove", () => removeSongs(data.queueId, data.membershipIds)),
  );

export const updateAdminSong = createServerFn({ method: "POST" })
  .validator(
    (data: {
      membershipId: string;
      title: string;
      artist: string;
      year: number | null;
      source: string;
      scope: "shared" | "local";
    }) =>
      z
        .object({
          membershipId: uuid,
          title: z.string().trim().min(1).max(200),
          artist: z.string().trim().max(200),
          year: z.number().int().min(1900).max(2100).nullable(),
          source: youtubeInput,
          scope: z.enum(["shared", "local"]),
        })
        .parse(data) as typeof data,
  )
  .handler(({ data }) => timedAdminOperation("songs.update", () => updateSong(data)));

export const saveAdminAmbienceProfile = createServerFn({ method: "POST" })
  .validator(
    (data: {
      sceneId: string;
      enabled: boolean;
      maxMasterGain: number;
      musicDuckRatio: number;
      fadeInMs: number;
      fadeOutMs: number;
      audioTheme: unknown;
    }) => data,
  )
  .handler(({ data }) =>
    timedAdminOperation("ambience.profile.save", () => saveAmbienceProfile(data)),
  );

export const saveAdminAmbienceStem = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id?: string;
      sceneId: string;
      name: string;
      role: "base" | "texture" | "event";
      assetId: string;
      isActive: boolean;
      sortOrder: number;
      defaultVolume: number;
      minGain: number;
      maxGain: number;
      crossfadeMs: number;
      loopStartSeconds: number;
      loopEndSeconds: number | null;
      eventMinSeconds: number | null;
      eventMaxSeconds: number | null;
    }) => data,
  )
  .handler(({ data }) => timedAdminOperation("ambience.stem.save", () => saveAmbienceStem(data)));

export const removeAdminAmbienceStem = createServerFn({ method: "POST" })
  .validator((data: { stemId: string }) => ({ stemId: String(data.stemId) }))
  .handler(({ data }) =>
    timedAdminOperation("ambience.stem.deactivate", () => deactivateAmbienceStem(data.stemId)),
  );

export const reserveAdminAmbienceUpload = createServerFn({ method: "POST" })
  .validator((data: { sceneSlug: string }) => ({ sceneSlug: String(data.sceneSlug) }))
  .handler(({ data }) =>
    timedAdminOperation("ambience.upload.reserve", () => reserveAmbienceUpload(data.sceneSlug)),
  );

export const finalizeAdminAmbienceUpload = createServerFn({ method: "POST" })
  .validator(
    (data: {
      sceneId: string;
      reservationId: string;
      path: string;
      name: string;
      role: "base" | "texture" | "event";
      sourceFilename: string;
      sourceByteSize: number;
      sourceDurationSeconds: number;
      sourceSha256: string;
      sourceUrl?: string;
      selectedStartSeconds: number;
      selectedDurationSeconds: number;
    }) => data,
  )
  .handler(({ data }) =>
    timedAdminOperation("ambience.upload.finalize", () => finalizeAmbienceUpload(data)),
  );

export const reserveAdminBackgroundUpload = createServerFn({ method: "POST" })
  .validator((data: { sceneId: string }) => ({ sceneId: String(data.sceneId) }))
  .handler(({ data }) =>
    timedAdminOperation("background.upload.reserve", () => reserveBackgroundUpload(data.sceneId)),
  );

export const discardAdminBackgroundUpload = createServerFn({ method: "POST" })
  .validator((data: { sceneId: string; path: string; reservationId: string }) => ({
    sceneId: String(data.sceneId),
    path: String(data.path),
    reservationId: String(data.reservationId),
  }))
  .handler(({ data }) =>
    timedAdminOperation("background.upload.discard", () =>
      discardBackgroundUpload(data.sceneId, data.path, data.reservationId),
    ),
  );

export const saveAdminScenePresentation = createServerFn({ method: "POST" })
  .validator(
    (data: {
      sceneId: string;
      backgroundStoragePath: string | null;
      uploadReservationId?: string;
      foregroundTextColor: string;
      gagLabel: string;
      oneliners: Array<{
        id?: string;
        text: string;
        daypart: "all" | "morning" | "day" | "evening" | "night";
      }>;
    }) => data,
  )
  .handler(({ data }) =>
    timedAdminOperation("background.presentation.save", () => saveScenePresentation(data)),
  );
