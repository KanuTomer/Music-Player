import { createServerFn } from "@tanstack/react-start";
import { analyticsSince, type AnalyticsRange } from "./admin-analytics";
import {
  addSongs,
  deactivateAmbienceStem,
  discardBackgroundUpload,
  finalizeAmbienceUpload,
  getAdminAmbience,
  getAdminAnalytics,
  getAdminBackground,
  getAdminBootstrap,
  getAdminDashboard,
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

export const getAdminData = createServerFn({ method: "GET" })
  .validator((data: { range: AnalyticsRange }) => data)
  .handler(({ data }) => {
    return getAdminDashboard(analyticsSince(data.range));
  });

export const getAdminBootstrapData = createServerFn({ method: "GET" }).handler(() =>
  getAdminBootstrap(),
);

export const getAdminSongsData = createServerFn({ method: "GET" })
  .validator((data: { sceneId: string }) => ({ sceneId: String(data.sceneId) }))
  .handler(({ data }) => getAdminSongs(data.sceneId));

export const getAdminAnalyticsData = createServerFn({ method: "GET" })
  .validator((data: { range: AnalyticsRange }) => data)
  .handler(({ data }) => getAdminAnalytics(analyticsSince(data.range)));

export const getAdminAmbienceData = createServerFn({ method: "GET" })
  .validator((data: { sceneId: string }) => ({ sceneId: String(data.sceneId) }))
  .handler(({ data }) => getAdminAmbience(data.sceneId));

export const getAdminBackgroundData = createServerFn({ method: "GET" })
  .validator((data: { sceneId: string }) => ({ sceneId: String(data.sceneId) }))
  .handler(({ data }) => getAdminBackground(data.sceneId));

export const previewAdminSongs = createServerFn({ method: "POST" })
  .validator((data: { inputs: string[] }) => ({ inputs: data.inputs.map(String) }))
  .handler(({ data }) => previewSongs(data.inputs));

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
    }) => data,
  )
  .handler(({ data }) => addSongs(data.queueId, data.songs));

export const removeAdminSongs = createServerFn({ method: "POST" })
  .validator((data: { queueId: string; membershipIds: string[] }) => ({
    queueId: String(data.queueId),
    membershipIds: data.membershipIds.map(String),
  }))
  .handler(({ data }) => removeSongs(data.queueId, data.membershipIds));

export const updateAdminSong = createServerFn({ method: "POST" })
  .validator(
    (data: {
      membershipId: string;
      title: string;
      artist: string;
      year: number | null;
      source: string;
      scope: "shared" | "local";
    }) => data,
  )
  .handler(({ data }) => updateSong(data));

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
  .handler(({ data }) => saveAmbienceProfile(data));

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
  .handler(({ data }) => saveAmbienceStem(data));

export const removeAdminAmbienceStem = createServerFn({ method: "POST" })
  .validator((data: { stemId: string }) => ({ stemId: String(data.stemId) }))
  .handler(({ data }) => deactivateAmbienceStem(data.stemId));

export const reserveAdminAmbienceUpload = createServerFn({ method: "POST" })
  .validator((data: { sceneSlug: string }) => ({ sceneSlug: String(data.sceneSlug) }))
  .handler(({ data }) => reserveAmbienceUpload(data.sceneSlug));

export const finalizeAdminAmbienceUpload = createServerFn({ method: "POST" })
  .validator(
    (data: {
      sceneId: string;
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
  .handler(({ data }) => finalizeAmbienceUpload(data));

export const reserveAdminBackgroundUpload = createServerFn({ method: "POST" })
  .validator((data: { sceneId: string }) => ({ sceneId: String(data.sceneId) }))
  .handler(({ data }) => reserveBackgroundUpload(data.sceneId));

export const discardAdminBackgroundUpload = createServerFn({ method: "POST" })
  .validator((data: { sceneId: string; path: string }) => ({
    sceneId: String(data.sceneId),
    path: String(data.path),
  }))
  .handler(({ data }) => discardBackgroundUpload(data.sceneId, data.path));

export const saveAdminScenePresentation = createServerFn({ method: "POST" })
  .validator(
    (data: {
      sceneId: string;
      backgroundStoragePath: string | null;
      foregroundTextColor: string;
      gagLabel: string;
      oneliners: Array<{
        id?: string;
        text: string;
        daypart: "all" | "morning" | "day" | "evening" | "night";
      }>;
    }) => data,
  )
  .handler(({ data }) => saveScenePresentation(data));
