import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import { getRequestAdminAuthorization, requireRequestAdmin } from "./admin-authorization.server";
import { createRequestSupabaseClient, requestAccessToken } from "./admin-auth.server";
import type { AdminOnboardingStatus } from "./admin-authorization";
import { ambienceProcessing, type AmbienceRole } from "./ambience-processing";
import { ambienceMp3, validateAmbienceMp3 } from "./mp3-audio";
import { resolveAdminDataBackend } from "./admin-data";
import {
  compensateUploadedObject,
  createSignedUploadWithCompensation,
  storageBucketFor,
  validateAmbienceFinalization,
  validateBackgroundWebp,
  validateStoragePath,
  type AdminStorageBucket,
  type UploadPurpose,
} from "./admin-storage";
import { adminStorage } from "./admin-storage.server";

async function neonAdminData() {
  return resolveAdminDataBackend() === "neon" ? import("./admin.neon.server") : null;
}

type NeonAdminData = NonNullable<Awaited<ReturnType<typeof neonAdminData>>>;
type AdminIdentity = { id: string; email?: string };

function uploadCompensation(
  neon: NeonAdminData,
  identity: AdminIdentity,
  input: { sceneId: string; reservationId: string; path: string; purpose: UploadPurpose },
) {
  const bucket = storageBucketFor(input.purpose);
  return {
    discard: (queueObject: boolean) => neon.discardUploadReservation(identity, input, queueObject),
    referenceStatus: async () => {
      try {
        return (await neon.isStorageObjectReferenced(bucket, input.path))
          ? ("referenced" as const)
          : ("unreferenced" as const);
      } catch {
        return "unavailable" as const;
      }
    },
    remove: () => adminStorage.remove(bucket, input.path),
    completeCleanup: () => neon.completeUploadCleanup(bucket, input.path),
    recordRemovalFailure: (message: string) =>
      neon.recordUploadCleanupFailure(bucket, input.path, message),
  };
}

const serviceAdmin = supabaseAdmin;

function requestAdminClient(): SupabaseClient<Database> {
  const token = requestAccessToken();
  return createRequestSupabaseClient(token);
}

// All database work in an admin request uses the caller's JWT, so grants and RLS
// remain the final authorization boundary. Storage signing and inspection are the
// only capabilities that continue to use the server-only secret client.
const admin = new Proxy({} as SupabaseClient<Database>, {
  get(_target, property) {
    if (property === "storage") return serviceAdmin.storage;
    const client = requestAdminClient() as unknown as Record<PropertyKey, unknown>;
    const value = client[property];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export type AdminTrack = {
  membershipId: string;
  trackId: string;
  position: number;
  title: string;
  artist: string | null;
  year: number | null;
  videoId: string;
  sourceUrl: string;
  sharedActiveUses: number;
};

export type AdminScene = {
  id: string;
  slug: string;
  title: string;
  queueId: string;
  tracks: AdminTrack[];
  ambience: AdminAmbience | null;
};
export type AdminAsset = {
  id: string;
  storagePath: string;
  byteSize: number;
  durationSeconds: number;
  publicUrl: string;
};
export type AdminAmbienceStem = {
  id: string;
  name: string;
  role: AmbienceRole;
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
export type AdminAmbience = {
  id: string;
  enabled: boolean;
  maxMasterGain: number;
  musicDuckRatio: number;
  fadeInMs: number;
  fadeOutMs: number;
  audioTheme: Record<string, Record<string, number>>;
  stems: AdminAmbienceStem[];
};
type RawAmbienceStem = {
  id: string;
  name: string;
  role: string;
  asset_id: string;
  is_active: boolean;
  sort_order: number;
  default_volume: number;
  min_gain: number;
  max_gain: number;
  crossfade_ms: number;
  loop_start_seconds: number;
  loop_end_seconds: number | null;
  event_min_seconds: number | null;
  event_max_seconds: number | null;
};
type RawAmbienceAsset = {
  id: string;
  storage_path: string;
  byte_size: number;
  duration_seconds: number;
};
type RawAdminMembership = {
  id: string;
  position: number;
  track_id: string;
  tracks: {
    id: string;
    title: string;
    artist: string | null;
    year: number | null;
    playback_sources: Array<{ provider_item_id: string; source_url: string }>;
  };
};
export type AnalyticsRow = {
  sceneId: string;
  slug: string;
  title: string;
  visits: number;
  playedVisits: number;
  listeningSeconds: number;
  averageListeningSeconds: number;
};

export type AdminSceneSummary = {
  id: string;
  slug: string;
  title: string;
  titleHi: string;
  queueId: string;
  trackCount: number;
  artKey: string;
  isDark: boolean;
  gagLabel: string | null;
  backgroundStoragePath: string | null;
  backgroundUrl: string | null;
  foregroundTextColor: string;
};

export type AdminOneLiner = {
  id: string;
  text: string;
  daypart: "all" | "morning" | "day" | "evening" | "night";
};

export type AdminBackground = {
  scene: AdminSceneSummary;
  oneliners: AdminOneLiner[];
};

export function youtubeVideoId(value: string): string | null {
  const text = value.trim();
  if (YOUTUBE_ID.test(text)) return text;
  try {
    const url = new URL(text);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "youtu.be") return null;
    const candidate =
      host === "youtu.be"
        ? url.pathname.slice(1)
        : (url.searchParams.get("v") ??
          url.pathname.match(/\/(?:shorts|embed)\/([^/?]+)/)?.[1] ??
          null);
    return candidate && YOUTUBE_ID.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function countTrackUses(rows: Array<{ track_id: string }>) {
  const usage = new Map<string, number>();
  for (const item of rows) usage.set(item.track_id, (usage.get(item.track_id) ?? 0) + 1);
  return usage;
}

export async function requireAdmin(): Promise<{ id: string; email?: string }> {
  const identity = await requireRequestAdmin();
  return {
    id: identity.userId,
    ...(identity.email ? { email: identity.email } : {}),
  };
}

export type { AdminOnboardingStatus } from "./admin-authorization";

export async function getAdminOnboardingStatus(): Promise<AdminOnboardingStatus> {
  return (await getRequestAdminAuthorization()).status;
}

async function activeScenes(): Promise<AdminScene[]> {
  const { data: scenes, error: sceneError } = await admin
    .from("scenes")
    .select("id, slug, title_en, curated_sets!inner(id, is_active)")
    .eq("is_live", true)
    .eq("curated_sets.is_active", true)
    .order("sort_order");
  if (sceneError) throw new Error(sceneError.message);

  const output: AdminScene[] = [];
  for (const scene of scenes ?? []) {
    const set = scene.curated_sets?.[0];
    if (!set) continue;
    const { data: memberships, error } = await admin
      .from("curated_set_tracks")
      .select(
        "id, position, track_id, tracks!inner(id, title, artist, year, playback_sources!inner(id, provider_item_id, source_url, is_active))",
      )
      .eq("curated_set_id", set.id)
      .eq("tracks.playback_sources.is_active", true)
      .order("position");
    if (error) throw new Error(error.message);
    const tracks = await Promise.all(
      // The embedded select is not represented in the generated database types.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (memberships ?? []).map(async (membership: any): Promise<AdminTrack> => {
        const track = membership.tracks;
        const source = track.playback_sources[0];
        const { count } = await admin
          .from("curated_set_tracks")
          .select("id, curated_sets!inner(is_active)", { count: "exact", head: true })
          .eq("track_id", track.id)
          .eq("curated_sets.is_active", true);
        return {
          membershipId: membership.id,
          trackId: track.id,
          position: membership.position,
          title: track.title,
          artist: track.artist,
          year: track.year,
          videoId: source.provider_item_id,
          sourceUrl: source.source_url,
          sharedActiveUses: count ?? 1,
        };
      }),
    );
    const { data: profile, error: profileError } = await admin
      .from("ambience_profiles")
      .select(
        "id, enabled, max_master_gain, music_duck_ratio, fade_in_ms, fade_out_ms, audio_theme",
      )
      .eq("scene_id", scene.id)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    const { data: ambienceStems, error: stemError } = await admin
      .from("sound_stems")
      .select(
        "id, name, role, asset_id, is_active, sort_order, default_volume, min_gain, max_gain, crossfade_ms, loop_start_seconds, loop_end_seconds, event_min_seconds, event_max_seconds",
      )
      .eq("scene_id", scene.id)
      .not("asset_id", "is", null)
      .order("sort_order");
    if (stemError) throw new Error(stemError.message);
    const ambience = profile
      ? {
          id: profile.id,
          enabled: profile.enabled,
          maxMasterGain: Number(profile.max_master_gain),
          musicDuckRatio: Number(profile.music_duck_ratio),
          fadeInMs: profile.fade_in_ms,
          fadeOutMs: profile.fade_out_ms,
          audioTheme: (profile.audio_theme ?? {}) as Record<string, Record<string, number>>,
          stems: (ambienceStems ?? []).map((stem: RawAmbienceStem) => ({
            id: stem.id,
            name: stem.name,
            role: stem.role as AmbienceRole,
            assetId: stem.asset_id,
            isActive: stem.is_active,
            sortOrder: stem.sort_order,
            defaultVolume: Number(stem.default_volume),
            minGain: Number(stem.min_gain),
            maxGain: Number(stem.max_gain),
            crossfadeMs: stem.crossfade_ms,
            loopStartSeconds: Number(stem.loop_start_seconds),
            loopEndSeconds: stem.loop_end_seconds == null ? null : Number(stem.loop_end_seconds),
            eventMinSeconds: stem.event_min_seconds,
            eventMaxSeconds: stem.event_max_seconds,
          })),
        }
      : null;
    output.push({
      id: scene.id,
      slug: scene.slug,
      title: scene.title_en,
      queueId: set.id,
      tracks,
      ambience,
    });
  }
  return output;
}

export async function getAdminDashboard(since?: string): Promise<{
  scenes: AdminScene[];
  analytics: AnalyticsRow[];
  assets: AdminAsset[];
  identity: { email: string; displayName: string | null; avatarUrl: string | null };
}> {
  const user = await requireAdmin();
  const neon = await neonAdminData();
  if (neon) return neon.getAdminDashboard(user, since);
  const scenes = await activeScenes();
  const { data: visits, error } = await admin.rpc("admin_room_analytics", {
    p_since: since ?? null,
  });
  if (error) throw new Error(error.message);
  const visitByScene = new Map<string, { visits: number; playedVisits: number; seconds: number }>();
  for (const visit of visits ?? []) {
    const current = visitByScene.get(visit.scene_id) ?? { visits: 0, playedVisits: 0, seconds: 0 };
    visitByScene.set(visit.scene_id, {
      visits: Number(visit.visits ?? 0),
      playedVisits: Number(visit.played_visits ?? 0),
      seconds: Number(visit.listening_seconds ?? 0),
    });
  }
  const { data: assets, error: assetError } = await admin
    .from("ambience_assets")
    .select("id, storage_path, byte_size, duration_seconds")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (assetError) throw new Error(assetError.message);
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  return {
    scenes,
    analytics: scenes.map((scene) => {
      const values = visitByScene.get(scene.id) ?? { visits: 0, playedVisits: 0, seconds: 0 };
      return {
        sceneId: scene.id,
        slug: scene.slug,
        title: scene.title,
        visits: values.visits,
        playedVisits: values.playedVisits,
        listeningSeconds: values.seconds,
        averageListeningSeconds: values.playedVisits
          ? Math.round(values.seconds / values.playedVisits)
          : 0,
      };
    }),
    assets: (assets ?? []).map((asset: RawAmbienceAsset) => ({
      id: asset.id,
      storagePath: asset.storage_path,
      byteSize: Number(asset.byte_size),
      durationSeconds: Number(asset.duration_seconds),
      publicUrl: admin.storage.from("ambience-audio").getPublicUrl(asset.storage_path).data
        .publicUrl,
    })),
    identity: {
      email: user.email ?? "Administrator",
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    },
  };
}

function publicStorageUrl(bucket: AdminStorageBucket, path: string | null) {
  return adminStorage.publicUrl(bucket, path);
}

export async function getAdminBootstrap(): Promise<{
  scenes: AdminSceneSummary[];
  identity: { email: string; displayName: string | null; avatarUrl: string | null };
}> {
  const user = await requireAdmin();
  const neon = await neonAdminData();
  if (neon) return neon.getAdminBootstrap(user);
  const [sceneResult, profileResult] = await Promise.all([
    admin
      .from("scenes")
      .select(
        "id, slug, title_en, title_hi, art_key, is_dark, gag_label, background_storage_path, foreground_text_color, curated_sets!inner(id, is_active)",
      )
      .eq("is_live", true)
      .eq("curated_sets.is_active", true)
      .order("sort_order"),
    admin.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle(),
  ]);
  if (sceneResult.error) throw new Error(sceneResult.error.message);
  const rawScenes = (sceneResult.data ?? []) as Array<Record<string, unknown>>;
  const setIds = rawScenes
    .map((scene) => (scene["curated_sets"] as Array<{ id: string }> | undefined)?.[0]?.id)
    .filter((id): id is string => Boolean(id));
  const membershipResult = setIds.length
    ? await admin.from("curated_set_tracks").select("curated_set_id").in("curated_set_id", setIds)
    : { data: [], error: null };
  if (membershipResult.error) throw new Error(membershipResult.error.message);
  const counts = new Map<string, number>();
  for (const membership of membershipResult.data ?? []) {
    counts.set(membership.curated_set_id, (counts.get(membership.curated_set_id) ?? 0) + 1);
  }
  return {
    scenes: rawScenes.flatMap((scene) => {
      const queueId = (scene["curated_sets"] as Array<{ id: string }> | undefined)?.[0]?.id;
      if (!queueId) return [];
      const backgroundStoragePath = (scene["background_storage_path"] as string | null) ?? null;
      return [
        {
          id: String(scene["id"]),
          slug: String(scene["slug"]),
          title: String(scene["title_en"]),
          titleHi: String(scene["title_hi"]),
          queueId,
          trackCount: counts.get(queueId) ?? 0,
          artKey: String(scene["art_key"]),
          isDark: Boolean(scene["is_dark"]),
          gagLabel: (scene["gag_label"] as string | null) ?? null,
          backgroundStoragePath,
          backgroundUrl: publicStorageUrl("scene-media", backgroundStoragePath),
          foregroundTextColor: String(scene["foreground_text_color"] ?? "#FFF3D6"),
        },
      ];
    }),
    identity: {
      email: user.email ?? "Administrator",
      displayName: profileResult.data?.display_name ?? null,
      avatarUrl: profileResult.data?.avatar_url ?? null,
    },
  };
}

export async function getAdminSongs(sceneId: string): Promise<{
  queueId: string;
  tracks: AdminTrack[];
}> {
  const user = await requireAdmin();
  const neon = await neonAdminData();
  if (neon) return neon.getAdminSongs(user, sceneId);
  const { data: set, error: setError } = await admin
    .from("curated_sets")
    .select("id")
    .eq("scene_id", sceneId)
    .eq("is_active", true)
    .single();
  if (setError || !set) throw new Error(setError?.message ?? "Active song queue not found");
  const { data: memberships, error } = await admin
    .from("curated_set_tracks")
    .select(
      "id, position, track_id, tracks!inner(id, title, artist, year, playback_sources!inner(id, provider_item_id, source_url, is_active))",
    )
    .eq("curated_set_id", set.id)
    .eq("tracks.playback_sources.is_active", true)
    .order("position");
  if (error) throw new Error(error.message);
  const trackIds = [
    ...new Set((memberships ?? []).map((item: { track_id: string }) => item.track_id)),
  ];
  const usageResult = trackIds.length
    ? await admin
        .from("curated_set_tracks")
        .select("track_id, curated_sets!inner(is_active)")
        .in("track_id", trackIds)
        .eq("curated_sets.is_active", true)
    : { data: [], error: null };
  if (usageResult.error) throw new Error(usageResult.error.message);
  const usage = countTrackUses(usageResult.data ?? []);
  return {
    queueId: set.id,
    tracks: (memberships ?? []).map((membership: RawAdminMembership) => {
      const track = membership.tracks;
      const source = track.playback_sources[0];
      if (!source) throw new Error(`No active playback source for ${track.title}`);
      return {
        membershipId: membership.id,
        trackId: track.id,
        position: membership.position,
        title: track.title,
        artist: track.artist,
        year: track.year,
        videoId: source.provider_item_id,
        sourceUrl: source.source_url,
        sharedActiveUses: usage.get(track.id) ?? 1,
      };
    }),
  };
}

export async function getAdminAnalytics(since?: string): Promise<AnalyticsRow[]> {
  const user = await requireAdmin();
  const neon = await neonAdminData();
  if (neon) return neon.getAdminAnalytics(user, since);
  const [sceneResult, visitResult] = await Promise.all([
    admin.from("scenes").select("id, slug, title_en").eq("is_live", true).order("sort_order"),
    admin.rpc("admin_secured_room_analytics", { p_since: since ?? null }),
  ]);
  if (sceneResult.error) throw new Error(sceneResult.error.message);
  if (visitResult.error) throw new Error(visitResult.error.message);
  const visits = new Map<string, { visits: number; played: number; seconds: number }>();
  for (const row of visitResult.data ?? []) {
    visits.set(row.scene_id, {
      visits: Number(row.visits ?? 0),
      played: Number(row.played_visits ?? 0),
      seconds: Number(row.listening_seconds ?? 0),
    });
  }
  return (sceneResult.data ?? []).map((scene: { id: string; slug: string; title_en: string }) => {
    const value = visits.get(scene.id) ?? { visits: 0, played: 0, seconds: 0 };
    return {
      sceneId: scene.id,
      slug: scene.slug,
      title: scene.title_en,
      visits: value.visits,
      playedVisits: value.played,
      listeningSeconds: value.seconds,
      averageListeningSeconds: value.played ? Math.round(value.seconds / value.played) : 0,
    };
  });
}

export async function getAdminAmbience(sceneId: string): Promise<{
  ambience: AdminAmbience | null;
}> {
  const user = await requireAdmin();
  const neon = await neonAdminData();
  if (neon) return neon.getAdminAmbience(user, sceneId);
  const [profileResult, stemResult] = await Promise.all([
    admin
      .from("ambience_profiles")
      .select(
        "id, enabled, max_master_gain, music_duck_ratio, fade_in_ms, fade_out_ms, audio_theme",
      )
      .eq("scene_id", sceneId)
      .maybeSingle(),
    admin
      .from("sound_stems")
      .select(
        "id, name, role, asset_id, is_active, sort_order, default_volume, min_gain, max_gain, crossfade_ms, loop_start_seconds, loop_end_seconds, event_min_seconds, event_max_seconds",
      )
      .eq("scene_id", sceneId)
      .not("asset_id", "is", null)
      .order("sort_order"),
  ]);
  if (profileResult.error) throw new Error(profileResult.error.message);
  if (stemResult.error) throw new Error(stemResult.error.message);
  const profile = profileResult.data;
  return {
    ambience: profile
      ? {
          id: profile.id,
          enabled: profile.enabled,
          maxMasterGain: Number(profile.max_master_gain),
          musicDuckRatio: Number(profile.music_duck_ratio),
          fadeInMs: profile.fade_in_ms,
          fadeOutMs: profile.fade_out_ms,
          audioTheme: (profile.audio_theme ?? {}) as Record<string, Record<string, number>>,
          stems: (stemResult.data ?? []).map((stem: RawAmbienceStem) => ({
            id: stem.id,
            name: stem.name,
            role: stem.role as AmbienceRole,
            assetId: stem.asset_id,
            isActive: stem.is_active,
            sortOrder: stem.sort_order,
            defaultVolume: Number(stem.default_volume),
            minGain: Number(stem.min_gain),
            maxGain: Number(stem.max_gain),
            crossfadeMs: stem.crossfade_ms,
            loopStartSeconds: Number(stem.loop_start_seconds),
            loopEndSeconds: stem.loop_end_seconds == null ? null : Number(stem.loop_end_seconds),
            eventMinSeconds: stem.event_min_seconds,
            eventMaxSeconds: stem.event_max_seconds,
          })),
        }
      : null,
  };
}

export async function getAdminAmbienceAssets(): Promise<AdminAsset[]> {
  const user = await requireAdmin();
  const neon = await neonAdminData();
  if (neon) return neon.getAdminAmbienceAssets(user);
  const { data, error } = await admin
    .from("ambience_assets")
    .select("id, storage_path, byte_size, duration_seconds")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((asset: RawAmbienceAsset) => ({
    id: asset.id,
    storagePath: asset.storage_path,
    byteSize: Number(asset.byte_size),
    durationSeconds: Number(asset.duration_seconds),
    publicUrl: publicStorageUrl("ambience-audio", asset.storage_path) ?? "",
  }));
}

export async function getAdminBackground(sceneId: string): Promise<AdminBackground> {
  const user = await requireAdmin();
  const neon = await neonAdminData();
  if (neon) return neon.getAdminBackground(user, sceneId);
  const [sceneResult, lineResult] = await Promise.all([
    admin
      .from("scenes")
      .select(
        "id, slug, title_en, title_hi, art_key, is_dark, gag_label, background_storage_path, foreground_text_color, curated_sets!inner(id, is_active)",
      )
      .eq("id", sceneId)
      .eq("curated_sets.is_active", true)
      .single(),
    admin
      .from("oneliners")
      .select("id, text_en, text_hi, daypart_tag")
      .eq("scene_id", sceneId)
      .order("id"),
  ]);
  if (sceneResult.error || !sceneResult.data)
    throw new Error(sceneResult.error?.message ?? "Jagah not found");
  if (lineResult.error) throw new Error(lineResult.error.message);
  const scene = sceneResult.data;
  const queueId = scene.curated_sets?.[0]?.id ?? "";
  const backgroundStoragePath = scene.background_storage_path ?? null;
  return {
    scene: {
      id: scene.id,
      slug: scene.slug,
      title: scene.title_en,
      titleHi: scene.title_hi,
      queueId,
      trackCount: 0,
      artKey: scene.art_key,
      isDark: scene.is_dark,
      gagLabel: scene.gag_label,
      backgroundStoragePath,
      backgroundUrl: publicStorageUrl("scene-media", backgroundStoragePath),
      foregroundTextColor: scene.foreground_text_color ?? "#FFF3D6",
    },
    oneliners: (lineResult.data ?? []).map(
      (line: {
        id: string;
        text_en: string;
        text_hi: string | null;
        daypart_tag: AdminOneLiner["daypart"];
      }) => ({
        id: line.id,
        text: line.text_hi ?? line.text_en,
        daypart: line.daypart_tag,
      }),
    ),
  };
}

function numberInRange(value: unknown, minimum: number, maximum: number, label: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum)
    throw new Error(`Invalid ${label}`);
  return number;
}

function normalizeTheme(value: unknown) {
  const theme = (value ?? {}) as Record<string, Record<string, unknown>>;
  const roles: AmbienceRole[] = ["base", "texture", "event"];
  return Object.fromEntries(
    roles.map((role) => {
      const filter = theme[role] ?? {};
      return [
        role,
        {
          highpass_hz: numberInRange(filter["highpass_hz"] ?? 20, 10, 2000, "high-pass frequency"),
          lowpass_hz: numberInRange(
            filter["lowpass_hz"] ?? 20000,
            1000,
            20000,
            "low-pass frequency",
          ),
          peak_hz: numberInRange(filter["peak_hz"] ?? 1000, 40, 16000, "peak frequency"),
          peak_gain_db: numberInRange(filter["peak_gain_db"] ?? 0, -12, 12, "peak gain"),
          peak_q: numberInRange(filter["peak_q"] ?? 1, 0.1, 12, "peak Q"),
        },
      ];
    }),
  );
}

export async function saveAmbienceProfile(input: {
  sceneId: string;
  enabled: boolean;
  maxMasterGain: number;
  musicDuckRatio: number;
  fadeInMs: number;
  fadeOutMs: number;
  audioTheme: unknown;
}) {
  const user = await requireAdmin();
  const validated = {
    ...input,
    sceneId: String(input.sceneId),
    enabled: Boolean(input.enabled),
    maxMasterGain: numberInRange(input.maxMasterGain, 0, 1, "master volume"),
    musicDuckRatio: numberInRange(input.musicDuckRatio, 0, 1, "music volume"),
    fadeInMs: Math.round(numberInRange(input.fadeInMs, 0, 10000, "fade in")),
    fadeOutMs: Math.round(numberInRange(input.fadeOutMs, 0, 10000, "fade out")),
    audioTheme: normalizeTheme(input.audioTheme),
  };
  const neon = await neonAdminData();
  if (neon) return neon.saveAmbienceProfile(user, validated);
  const { error } = await admin.rpc("admin_secured_save_ambience_profile", {
    p_scene_id: validated.sceneId,
    p_enabled: validated.enabled,
    p_max_master_gain: validated.maxMasterGain,
    p_music_duck_ratio: validated.musicDuckRatio,
    p_fade_in_ms: validated.fadeInMs,
    p_fade_out_ms: validated.fadeOutMs,
    p_audio_theme: validated.audioTheme,
  });
  if (error) throw new Error(error.message);
}

export async function saveAmbienceStem(input: {
  id?: string;
  sceneId: string;
  name: string;
  role: AmbienceRole;
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
}) {
  const user = await requireAdmin();
  if (!input.name.trim() || !["base", "texture", "event"].includes(input.role))
    throw new Error("Invalid ambience sound");
  const minGain = numberInRange(input.minGain, 0, 1, "minimum volume");
  const maxGain = numberInRange(input.maxGain, minGain, 1, "maximum volume");
  const defaultVolume = numberInRange(input.defaultVolume, minGain, maxGain, "default volume");
  const loopStart = numberInRange(input.loopStartSeconds, 0, 3600, "loop start");
  const loopEnd =
    input.loopEndSeconds == null
      ? null
      : numberInRange(input.loopEndSeconds, loopStart + 0.001, 3600, "loop end");
  const eventMin =
    input.role === "event" && input.eventMinSeconds != null
      ? Math.round(numberInRange(input.eventMinSeconds, 5, 3600, "effect delay"))
      : null;
  const eventMax =
    input.role === "event" && input.eventMaxSeconds != null
      ? Math.round(numberInRange(input.eventMaxSeconds, eventMin ?? 5, 3600, "effect delay"))
      : null;
  const validated = {
    ...input,
    name: input.name.trim(),
    minGain,
    maxGain,
    defaultVolume,
    loopStartSeconds: loopStart,
    loopEndSeconds: loopEnd,
    eventMinSeconds: eventMin,
    eventMaxSeconds: eventMax,
    sortOrder: Math.max(0, Math.round(Number(input.sortOrder) || 0)),
    crossfadeMs: Math.round(numberInRange(input.crossfadeMs, 0, 10000, "crossfade")),
  };
  const neon = await neonAdminData();
  if (neon) return neon.saveAmbienceStem(user, validated);
  const { error } = await admin.rpc("admin_secured_save_ambience_stem", {
    p_id: input.id ?? null,
    p_scene_id: input.sceneId,
    p_name: input.name.trim(),
    p_role: input.role,
    p_asset_id: input.assetId,
    p_is_active: Boolean(input.isActive),
    p_sort_order: Math.max(0, Math.round(Number(input.sortOrder) || 0)),
    p_default_volume: defaultVolume,
    p_min_gain: minGain,
    p_max_gain: maxGain,
    p_crossfade_ms: validated.crossfadeMs,
    p_loop_start_seconds: loopStart,
    p_loop_end_seconds: loopEnd,
    p_event_min_seconds: eventMin,
    p_event_max_seconds: eventMax,
  });
  if (error) throw new Error(error.message);
}

export async function deactivateAmbienceStem(stemId: string) {
  const user = await requireAdmin();
  const neon = await neonAdminData();
  if (neon) return neon.deactivateAmbienceStem(user, String(stemId));
  const { error } = await admin.rpc("admin_secured_deactivate_ambience_stem", {
    p_stem_id: String(stemId),
  });
  if (error) throw new Error(error.message);
}

export async function reserveAmbienceUpload(sceneSlug: string) {
  const user = await requireAdmin();
  const neon = await neonAdminData();
  if (neon) {
    const reservation = await neon.reserveAmbienceUpload(user, String(sceneSlug));
    const signed = await createSignedUploadWithCompensation(
      () => adminStorage.createSignedUploadUrl("ambience-audio", reservation.path),
      uploadCompensation(neon, user, {
        sceneId: reservation.sceneId,
        reservationId: reservation.reservationId,
        path: reservation.path,
        purpose: "ambience",
      }),
    );
    return {
      reservationId: reservation.reservationId,
      path: reservation.path,
      token: signed.token,
    };
  }
  const { data: scene, error: sceneError } = await admin
    .from("scenes")
    .select("id")
    .eq("slug", String(sceneSlug))
    .eq("is_live", true)
    .single();
  if (sceneError || !scene) throw new Error("Jagah not found");
  const { data: rows, error: reservationError } = await admin.rpc(
    "admin_create_mp3_upload_reservation",
    { p_scene_id: scene.id },
  );
  const reservation = rows?.[0];
  if (reservationError || !reservation)
    throw new Error(reservationError?.message ?? "Unable to reserve audio upload");
  const { data, error } = await serviceAdmin.storage
    .from("ambience-audio")
    .createSignedUploadUrl(reservation.object_path);
  if (error || !data) throw new Error(error?.message ?? "Unable to reserve audio upload");
  return {
    reservationId: reservation.reservation_id as string,
    path: reservation.object_path as string,
    token: data.token,
  };
}

const BACKGROUND_PATH =
  /^rooms\/([a-z0-9-]+)\/background\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/i;

export async function reserveBackgroundUpload(sceneId: string) {
  const user = await requireAdmin();
  const neon = await neonAdminData();
  if (neon) {
    const reservation = await neon.reserveBackgroundUpload(user, String(sceneId));
    const signed = await createSignedUploadWithCompensation(
      () => adminStorage.createSignedUploadUrl("scene-media", reservation.path),
      uploadCompensation(neon, user, {
        sceneId: String(sceneId),
        reservationId: reservation.reservationId,
        path: reservation.path,
        purpose: "background",
      }),
    );
    return { ...reservation, token: signed.token };
  }
  const { data: rows, error: reservationError } = await admin.rpc(
    "admin_create_upload_reservation",
    { p_scene_id: sceneId, p_purpose: "background" },
  );
  const reservation = rows?.[0];
  if (reservationError || !reservation)
    throw new Error(reservationError?.message ?? "Unable to reserve background upload");
  const { data, error } = await serviceAdmin.storage
    .from("scene-media")
    .createSignedUploadUrl(reservation.object_path);
  if (error || !data) throw new Error(error?.message ?? "Unable to reserve background upload");
  return {
    reservationId: reservation.reservation_id as string,
    path: reservation.object_path as string,
    token: data.token,
  };
}

export async function discardBackgroundUpload(
  sceneId: string,
  path: string,
  reservationId: string,
) {
  const user = await requireAdmin();
  const neon = await neonAdminData();
  if (neon) {
    validateStoragePath("background", String(path));
    const discarded = await neon.discardReservation(
      user,
      String(sceneId),
      String(path),
      String(reservationId),
    );
    await compensateUploadedObject({
      ...uploadCompensation(neon, user, {
        sceneId: String(sceneId),
        reservationId: String(reservationId),
        path: String(path),
        purpose: "background",
      }),
      discard: async () => discarded,
    });
    return;
  }
  const { data: valid } = await admin.rpc("admin_check_upload_reservation", {
    p_reservation_id: reservationId,
    p_scene_id: sceneId,
    p_purpose: "background",
    p_object_path: path,
  });
  if (!valid) throw new Error("Invalid background upload reservation");
  const { error: discardError } = await admin.rpc("admin_secured_discard_upload_reservation", {
    p_reservation_id: reservationId,
  });
  if (discardError) throw new Error(discardError.message);
  const { error } = await serviceAdmin.storage.from("scene-media").remove([path]);
  if (error) throw new Error(error.message);
}

export async function saveScenePresentation(input: {
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
}) {
  const user = await requireAdmin();
  if (!/^#[0-9A-Fa-f]{6}$/.test(input.foregroundTextColor))
    throw new Error("Invalid foreground colour");
  if (input.gagLabel.trim().length > 80 || input.oneliners.length > 100)
    throw new Error("Invalid presentation content");
  for (const line of input.oneliners) {
    if (
      !line.text.trim() ||
      line.text.trim().length > 200 ||
      !["all", "morning", "day", "evening", "night"].includes(line.daypart)
    )
      throw new Error("Invalid oneliner");
  }
  const neon = await neonAdminData();
  if (neon) {
    const nextPath = input.backgroundStoragePath || null;
    const compensationInput =
      nextPath && input.uploadReservationId
        ? {
            sceneId: input.sceneId,
            reservationId: input.uploadReservationId,
            path: nextPath,
            purpose: "background" as const,
          }
        : null;
    try {
      if (compensationInput) {
        validateStoragePath("background", compensationInput.path);
        const reservation = await neon.getUploadReservation(user, compensationInput);
        if (reservation === "invalid")
          throw new Error("Background upload reservation is invalid or expired");
        if (reservation === "active") {
          const bytes = await adminStorage.download("scene-media", compensationInput.path);
          validateBackgroundWebp(bytes);
        }
      }
      await neon.saveScenePresentation(user, {
        ...input,
        backgroundStoragePath: nextPath,
        oneliners: input.oneliners.map((line) => ({ ...line, text: line.text.trim() })),
      });
      return neon.getAdminBackground(user, input.sceneId);
    } catch (error) {
      if (compensationInput)
        await compensateUploadedObject(uploadCompensation(neon, user, compensationInput));
      throw error;
    }
  }
  const { data: scene, error: sceneError } = await admin
    .from("scenes")
    .select("slug, background_storage_path")
    .eq("id", input.sceneId)
    .eq("is_live", true)
    .single();
  if (sceneError || !scene) throw new Error(sceneError?.message ?? "Jagah not found");
  const previousPath = scene.background_storage_path as string | null;
  const nextPath = input.backgroundStoragePath || null;
  const isNewUpload = Boolean(nextPath && nextPath !== previousPath);
  let presentationSaved = false;
  try {
    if (isNewUpload && nextPath) {
      if (!input.uploadReservationId) throw new Error("Background upload reservation is missing");
      const match = nextPath.match(BACKGROUND_PATH);
      if (!match || match[1] !== scene.slug) throw new Error("Invalid background upload path");
      const { data: validReservation } = await admin.rpc("admin_check_upload_reservation", {
        p_reservation_id: input.uploadReservationId,
        p_scene_id: input.sceneId,
        p_purpose: "background",
        p_object_path: nextPath,
      });
      if (!validReservation) throw new Error("Background upload reservation is invalid or expired");
      const { data: object, error: downloadError } = await serviceAdmin.storage
        .from("scene-media")
        .download(nextPath);
      if (downloadError || !object)
        throw new Error(downloadError?.message ?? "Uploaded background is missing");
      validateBackgroundWebp(Buffer.from(await object.arrayBuffer()));
    }
    const { error } = await admin.rpc("admin_secured_save_scene_presentation_v2", {
      p_scene_id: input.sceneId,
      p_background_storage_path: nextPath,
      p_foreground_text_color: input.foregroundTextColor,
      p_gag_label: input.gagLabel.trim() || null,
      p_oneliners: input.oneliners.map((line) => ({
        ...(line.id ? { id: line.id } : {}),
        text: line.text,
        daypart: line.daypart,
      })),
      p_upload_reservation_id: isNewUpload ? (input.uploadReservationId ?? null) : null,
    });
    if (error) throw new Error(error.message);
    presentationSaved = true;
  } catch (error) {
    if (isNewUpload && nextPath && !presentationSaved) {
      if (input.uploadReservationId) {
        await admin.rpc("admin_secured_discard_upload_reservation", {
          p_reservation_id: input.uploadReservationId,
        });
      }
      await serviceAdmin.storage.from("scene-media").remove([nextPath]);
    }
    throw error;
  }
  return getAdminBackground(input.sceneId);
}

export async function finalizeAmbienceUpload(input: {
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
}) {
  const user = await requireAdmin();
  const neon = await neonAdminData();
  if (neon) {
    const compensationInput = {
      sceneId: String(input.sceneId),
      reservationId: String(input.reservationId),
      path: String(input.path),
      purpose: "ambience" as const,
    };
    try {
      const validated = validateAmbienceFinalization(input);
      const reservation = await neon.getUploadReservation(user, compensationInput);
      if (reservation === "finalized") return;
      if (reservation === "invalid")
        throw new Error("Audio upload reservation is invalid or expired");
      const bytes = await adminStorage.download("ambience-audio", validated.path);
      const inspection = validateAmbienceMp3(
        bytes,
        ambienceProcessing.maxDurationSeconds[validated.role],
      );
      const hash = createHash("sha256").update(bytes).digest("hex").toUpperCase();
      await neon.finalizeAmbienceUpload(user, {
        sceneId: validated.sceneId,
        reservationId: validated.reservationId,
        path: validated.path,
        name: validated.name,
        role: validated.role,
        mimeType: ambienceMp3.mimeType,
        byteSize: bytes.length,
        durationSeconds: inspection.durationSeconds,
        sha256: hash,
        sourceUrl: validated.sourceUrl,
        sourceTitle: validated.sourceFilename || validated.name,
        sourceSha256: validated.sourceSha256,
        originalFilename: validated.sourceFilename,
        originalByteSize: validated.sourceByteSize,
        originalDurationSeconds: validated.sourceDurationSeconds,
        selectedStartSeconds: validated.selectedStartSeconds,
        selectedDurationSeconds: validated.selectedDurationSeconds,
      });
      return;
    } catch (error) {
      await compensateUploadedObject(uploadCompensation(neon, user, compensationInput));
      throw error;
    }
  }

  let removeUploadedObject = false;
  try {
    const validated = validateAmbienceFinalization(input);
    const pathSlug = validateStoragePath("ambience", validated.path);
    const { data: validReservation } = await admin.rpc("admin_check_upload_reservation", {
      p_reservation_id: validated.reservationId,
      p_scene_id: validated.sceneId,
      p_purpose: "ambience",
      p_object_path: validated.path,
    });
    if (!validReservation) throw new Error("Audio upload reservation is invalid or expired");
    const { data: scene, error: sceneError } = await admin
      .from("scenes")
      .select("slug")
      .eq("id", validated.sceneId)
      .single();
    if (sceneError || !scene || scene.slug !== pathSlug) throw new Error("Invalid upload path");
    removeUploadedObject = true;
    const bytes = await adminStorage.download("ambience-audio", validated.path);
    const inspection = validateAmbienceMp3(
      bytes,
      ambienceProcessing.maxDurationSeconds[validated.role],
    );
    const hash = createHash("sha256").update(bytes).digest("hex").toUpperCase();
    const { error: finalizeError } = await admin.rpc("admin_secured_finalize_ambience_asset", {
      p_scene_id: validated.sceneId,
      p_reservation_id: validated.reservationId,
      p_storage_path: validated.path,
      p_name: validated.name,
      p_role: validated.role,
      p_mime_type: ambienceMp3.mimeType,
      p_byte_size: bytes.length,
      p_duration_seconds: inspection.durationSeconds,
      p_sha256: hash,
      p_source_url: validated.sourceUrl,
      p_source_title: validated.sourceFilename || validated.name,
      p_source_sha256: validated.sourceSha256,
      p_original_filename: validated.sourceFilename,
      p_original_byte_size: validated.sourceByteSize,
      p_original_duration_seconds: validated.sourceDurationSeconds,
      p_selected_start_seconds: validated.selectedStartSeconds,
      p_selected_duration_seconds: validated.selectedDurationSeconds,
    });
    if (finalizeError) throw new Error(finalizeError.message);
  } catch (error) {
    await admin.rpc("admin_secured_discard_upload_reservation", {
      p_reservation_id: input.reservationId,
    });
    if (removeUploadedObject) await adminStorage.remove("ambience-audio", input.path);
    throw error;
  }
}

export type SongDraft = {
  input: string;
  title: string;
  artist: string;
  year: number | null;
  providerTitle?: string;
  providerChannel?: string;
};

export async function previewSongs(inputs: string[]): Promise<SongDraft[]> {
  const user = await requireAdmin();
  if (inputs.length < 1 || inputs.length > 50)
    throw new Error("Paste between 1 and 50 YouTube links");
  const unique = new Map<string, string>();
  for (const input of inputs) {
    const videoId = youtubeVideoId(input);
    if (!videoId) throw new Error(`Invalid YouTube link: ${input}`);
    if (!unique.has(videoId)) unique.set(videoId, input);
  }
  const neon = await neonAdminData();
  if (neon) await neon.consumeSongPreview(user, unique.size);
  else {
    const { error: rateError } = await admin.rpc("admin_secured_consume_song_preview");
    if (rateError) throw new Error(rateError.message);
  }
  const entries = [...unique.entries()];
  const output = new Array<SongDraft>(entries.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(5, entries.length) }, async () => {
      while (cursor < entries.length) {
        const index = cursor++;
        const [videoId] = entries[index]!;
        let providerTitle = "";
        let providerChannel = "";
        try {
          const response = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
            { signal: AbortSignal.timeout(5000) },
          );
          if (response.ok) {
            const payload = (await response.json()) as { title?: string; author_name?: string };
            providerTitle = payload.title?.trim() ?? "";
            providerChannel = payload.author_name?.trim() ?? "";
          }
        } catch {
          // Manual metadata entry remains available when the provider is unavailable.
        }
        output[index] = {
          input: `https://www.youtube.com/watch?v=${videoId}`,
          title: providerTitle,
          artist: providerChannel,
          year: null,
          providerTitle,
          providerChannel,
        };
      }
    }),
  );
  return output;
}

export async function addSongs(queueId: string, songs: SongDraft[]): Promise<void> {
  const user = await requireAdmin();
  if (!queueId || songs.length < 1 || songs.length > 50) throw new Error("Invalid song import");
  const payload = songs.map((song) => {
    const videoId = youtubeVideoId(song.input);
    if (!videoId || !song.title.trim())
      throw new Error("Each song needs a valid YouTube link and title");
    return {
      video_id: videoId,
      title: song.title,
      artist: song.artist,
      year: song.year,
      provider_title: song.providerTitle,
      provider_channel: song.providerChannel,
    };
  });
  const neon = await neonAdminData();
  if (neon)
    return neon.addSongs(
      user,
      queueId,
      payload.map((song, index) => ({ ...songs[index]!, videoId: song.video_id })),
    );
  const { error } = await admin.rpc("admin_secured_append_queue_tracks", {
    p_curated_set_id: queueId,
    p_tracks: payload,
  });
  if (error) throw new Error(error.message);
}

export async function removeSongs(queueId: string, membershipIds: string[]): Promise<void> {
  const user = await requireAdmin();
  if (!queueId || membershipIds.length < 1 || membershipIds.length > 50)
    throw new Error("Invalid song removal");
  const neon = await neonAdminData();
  if (neon) return neon.removeSongs(user, queueId, membershipIds);
  const { error } = await admin.rpc("admin_secured_remove_queue_tracks", {
    p_curated_set_id: queueId,
    p_membership_ids: membershipIds,
  });
  if (error) throw new Error(error.message);
}

export async function updateSong(input: {
  membershipId: string;
  title: string;
  artist: string;
  year: number | null;
  source: string;
  scope: "shared" | "local";
}): Promise<void> {
  const user = await requireAdmin();
  if (!input.title.trim() || !["shared", "local"].includes(input.scope))
    throw new Error("Invalid song update");
  const videoId = youtubeVideoId(input.source);
  if (!videoId) throw new Error("Enter a valid YouTube link or video ID");
  const neon = await neonAdminData();
  if (neon)
    return neon.updateSong(user, {
      ...input,
      title: input.title.trim(),
      artist: input.artist.trim(),
      videoId,
    });
  const { error } = await admin.rpc("admin_secured_update_queue_track", {
    p_membership_id: input.membershipId,
    p_title: input.title,
    p_artist: input.artist,
    p_year: input.year,
    p_video_id: videoId,
    p_scope: input.scope,
  });
  if (error) throw new Error(error.message);
}
