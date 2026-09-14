import { z } from "zod";
import { analyticsSince, type AnalyticsRange } from "./admin-analytics";
import { callApi } from "./api-client";
import type {
  getAdminAmbience,
  getAdminAmbienceAssets,
  getAdminAnalytics,
  getAdminBackground,
  getAdminBootstrap,
  getAdminOnboardingStatus,
  getAdminSongs,
  previewSongs,
  reserveAmbienceUpload,
  reserveBackgroundUpload,
  saveAmbienceProfile,
  saveAmbienceStem,
  deactivateAmbienceStem,
  finalizeAmbienceUpload,
  discardBackgroundUpload,
  saveScenePresentation,
} from "./admin.server";

type Result<T extends (...args: never[]) => unknown> = Awaited<ReturnType<T>>;
const uuid = z.string().uuid();
const youtubeInput = z.string().trim().min(1).max(2048);
const sceneInput = z.object({ sceneId: uuid });
const songDraft = z.object({
  input: youtubeInput,
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().max(200),
  year: z.number().int().min(1900).max(2100).nullable(),
  providerTitle: z.string().max(300).optional(),
  providerChannel: z.string().max(300).optional(),
});

export function getAdminOnboarding(): Promise<Result<typeof getAdminOnboardingStatus>> {
  return callApi("admin-onboarding", null, { authenticated: true, safeRead: true });
}

export function getAdminBootstrapData(): Promise<Result<typeof getAdminBootstrap>> {
  return callApi("admin-bootstrap", null, { authenticated: true, safeRead: true });
}

export function getAdminSongsData({
  data,
}: {
  data: { sceneId: string };
}): Promise<Result<typeof getAdminSongs>> {
  return callApi("admin-songs", sceneInput.parse(data), { authenticated: true, safeRead: true });
}

export function getAdminAnalyticsData({
  data,
}: {
  data: { range: AnalyticsRange };
}): Promise<Result<typeof getAdminAnalytics>> {
  return callApi(
    "admin-analytics",
    { since: analyticsSince(data.range) },
    { authenticated: true, safeRead: true },
  );
}

export function getAdminAmbienceData({
  data,
}: {
  data: { sceneId: string };
}): Promise<Result<typeof getAdminAmbience>> {
  return callApi("admin-ambience", sceneInput.parse(data), { authenticated: true, safeRead: true });
}

export function getAdminAmbienceAssetsData(): Promise<Result<typeof getAdminAmbienceAssets>> {
  return callApi("admin-ambience-assets", null, { authenticated: true, safeRead: true });
}

export function getAdminBackgroundData({
  data,
}: {
  data: { sceneId: string };
}): Promise<Result<typeof getAdminBackground>> {
  return callApi("admin-background", sceneInput.parse(data), {
    authenticated: true,
    safeRead: true,
  });
}

export function previewAdminSongs({
  data,
}: {
  data: { inputs: string[] };
}): Promise<Result<typeof previewSongs>> {
  const parsed = { inputs: z.array(youtubeInput).min(1).max(50).parse(data.inputs) };
  return callApi("admin-songs-preview", parsed, { authenticated: true });
}

export function addAdminSongs({
  data,
}: {
  data: {
    queueId: string;
    songs: Array<{
      input: string;
      title: string;
      artist: string;
      year: number | null;
      providerTitle?: string;
      providerChannel?: string;
    }>;
  };
}): Promise<void> {
  const parsed = z.object({ queueId: uuid, songs: z.array(songDraft).min(1).max(50) }).parse(data);
  return callApi("admin-songs-add", parsed, { authenticated: true });
}

export function removeAdminSongs({
  data,
}: {
  data: { queueId: string; membershipIds: string[] };
}): Promise<void> {
  const parsed = z
    .object({ queueId: uuid, membershipIds: z.array(uuid).min(1).max(50) })
    .parse(data);
  return callApi("admin-songs-remove", parsed, { authenticated: true });
}

export function updateAdminSong({
  data,
}: {
  data: {
    membershipId: string;
    title: string;
    artist: string;
    year: number | null;
    source: string;
    scope: "shared" | "local";
  };
}): Promise<void> {
  const parsed = z
    .object({
      membershipId: uuid,
      title: z.string().trim().min(1).max(200),
      artist: z.string().trim().max(200),
      year: z.number().int().min(1900).max(2100).nullable(),
      source: youtubeInput,
      scope: z.enum(["shared", "local"]),
    })
    .parse(data);
  return callApi("admin-song-update", parsed, { authenticated: true });
}

export function saveAdminAmbienceProfile({
  data,
}: {
  data: {
    sceneId: string;
    enabled: boolean;
    maxMasterGain: number;
    musicDuckRatio: number;
    fadeInMs: number;
    fadeOutMs: number;
    audioTheme: unknown;
  };
}): Promise<Result<typeof saveAmbienceProfile>> {
  return callApi("admin-ambience-profile-save", data, { authenticated: true });
}

export function saveAdminAmbienceStem({
  data,
}: {
  data: {
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
  };
}): Promise<Result<typeof saveAmbienceStem>> {
  return callApi("admin-ambience-stem-save", data, { authenticated: true });
}

export function removeAdminAmbienceStem({
  data,
}: {
  data: { stemId: string };
}): Promise<Result<typeof deactivateAmbienceStem>> {
  return callApi(
    "admin-ambience-stem-remove",
    { stemId: String(data.stemId) },
    { authenticated: true },
  );
}

export function reserveAdminAmbienceUpload({
  data,
}: {
  data: { sceneSlug: string };
}): Promise<Result<typeof reserveAmbienceUpload>> {
  return callApi(
    "admin-ambience-upload-reserve",
    { sceneSlug: String(data.sceneSlug) },
    { authenticated: true },
  );
}

export function finalizeAdminAmbienceUpload({
  data,
}: {
  data: {
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
  };
}): Promise<Result<typeof finalizeAmbienceUpload>> {
  return callApi("admin-ambience-upload-finalize", data, { authenticated: true });
}

export function reserveAdminBackgroundUpload({
  data,
}: {
  data: { sceneId: string };
}): Promise<Result<typeof reserveBackgroundUpload>> {
  return callApi(
    "admin-background-upload-reserve",
    { sceneId: String(data.sceneId) },
    { authenticated: true },
  );
}

export function discardAdminBackgroundUpload({
  data,
}: {
  data: { sceneId: string; path: string; reservationId: string };
}): Promise<Result<typeof discardBackgroundUpload>> {
  return callApi(
    "admin-background-upload-discard",
    {
      sceneId: String(data.sceneId),
      path: String(data.path),
      reservationId: String(data.reservationId),
    },
    { authenticated: true },
  );
}

export function saveAdminScenePresentation({
  data,
}: {
  data: {
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
  };
}): Promise<Result<typeof saveScenePresentation>> {
  return callApi("admin-presentation-save", data, { authenticated: true });
}
