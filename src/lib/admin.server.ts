import { getRequest } from "@tanstack/react-start/server";
import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import { ambienceProcessing, type AmbienceRole } from "./ambience-processing";
import { ambienceMp3, validateAmbienceMp3 } from "./mp3-audio";

const serviceAdmin = supabaseAdmin;

function requestAccessToken() {
  const authorization = getRequest()?.headers.get("authorization");
  return authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

function requestAdminClient(): SupabaseClient<Database> {
  const token = requestAccessToken();
  if (!token) throw new Error("Sign in is required");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Admin authentication is unavailable");
  return createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
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
  const token = requestAccessToken();
  if (!token) throw new Error("Sign in is required");
  const { data, error } = await admin.auth.getClaims(token);
  if (error || !data.claims?.sub) throw new Error("Your sign-in session is invalid");
  const { data: status, error: statusError } = await admin.rpc("admin_onboarding_status");
  if (statusError) throw new Error("Unable to verify administrator access");
  if (status === "not_authorized") throw new Error("Administrator access is required");
  if (status !== "ready") throw new Error("Administrator MFA verification is required");
  return {
    id: data.claims.sub,
    ...(typeof data.claims.email === "string" ? { email: data.claims.email } : {}),
  };
}

export type AdminOnboardingStatus =
  "not_authorized" | "mfa_enrollment_required" | "mfa_challenge_required" | "ready";

export async function getAdminOnboardingStatus(): Promise<AdminOnboardingStatus> {
  const token = requestAccessToken();
  if (!token) throw new Error("Sign in is required");
  const { data: userData, error: userError } = await admin.auth.getClaims(token);
  if (userError || !userData.claims?.sub) throw new Error("Your sign-in session is invalid");
  const { data, error } = await admin.rpc("admin_onboarding_status");
  if (error) throw new Error("Unable to verify administrator access");
  return data as AdminOnboardingStatus;
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

function publicStorageUrl(bucket: string, path: string | null) {
  return path ? admin.storage.from(bucket).getPublicUrl(path).data.publicUrl : null;
}

export async function getAdminBootstrap(): Promise<{
  scenes: AdminSceneSummary[];
  identity: { email: string; displayName: string | null; avatarUrl: string | null };
}> {
  const user = await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
  const { error } = await admin.rpc("admin_secured_save_ambience_profile", {
    p_scene_id: String(input.sceneId),
    p_enabled: Boolean(input.enabled),
    p_max_master_gain: numberInRange(input.maxMasterGain, 0, 1, "master volume"),
    p_music_duck_ratio: numberInRange(input.musicDuckRatio, 0, 1, "music volume"),
    p_fade_in_ms: Math.round(numberInRange(input.fadeInMs, 0, 10000, "fade in")),
    p_fade_out_ms: Math.round(numberInRange(input.fadeOutMs, 0, 10000, "fade out")),
    p_audio_theme: normalizeTheme(input.audioTheme),
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
  await requireAdmin();
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
    p_crossfade_ms: Math.round(numberInRange(input.crossfadeMs, 0, 10000, "crossfade")),
    p_loop_start_seconds: loopStart,
    p_loop_end_seconds: loopEnd,
    p_event_min_seconds: eventMin,
    p_event_max_seconds: eventMax,
  });
  if (error) throw new Error(error.message);
}

export async function deactivateAmbienceStem(stemId: string) {
  await requireAdmin();
  const { error } = await admin.rpc("admin_secured_deactivate_ambience_stem", {
    p_stem_id: String(stemId),
  });
  if (error) throw new Error(error.message);
}

export async function reserveAmbienceUpload(sceneSlug: string) {
  await requireAdmin();
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

const BACKGROUND_MAX_BYTES = 5 * 1024 * 1024;
const BACKGROUND_PATH =
  /^rooms\/([a-z0-9-]+)\/background\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/i;

export async function reserveBackgroundUpload(sceneId: string) {
  await requireAdmin();
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
  await requireAdmin();
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

function inspectPlaybackWebp(data: Buffer) {
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
  await requireAdmin();
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
      inspectPlaybackWebp(Buffer.from(await object.arrayBuffer()));
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
  await requireAdmin();
  let removeUploadedObject = false;
  try {
    const pathMatch = input.path.match(
      /^rooms\/([a-z0-9-]+)\/ambience\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.mp3$/i,
    );
    if (!pathMatch) throw new Error("Invalid upload path");
    const { data: validReservation } = await admin.rpc("admin_check_upload_reservation", {
      p_reservation_id: input.reservationId,
      p_scene_id: input.sceneId,
      p_purpose: "ambience",
      p_object_path: input.path,
    });
    if (!validReservation) throw new Error("Audio upload reservation is invalid or expired");
    const { data: scene, error: sceneError } = await admin
      .from("scenes")
      .select("slug")
      .eq("id", input.sceneId)
      .single();
    if (sceneError || !scene || scene.slug !== pathMatch[1]) throw new Error("Invalid upload path");
    removeUploadedObject = true;
    const { data: object, error: downloadError } = await serviceAdmin.storage
      .from("ambience-audio")
      .download(input.path);
    if (downloadError || !object)
      throw new Error(downloadError?.message ?? "Uploaded audio is missing");
    const bytes = Buffer.from(await object.arrayBuffer());
    const inspection = validateAmbienceMp3(
      bytes,
      ambienceProcessing.maxDurationSeconds[input.role],
    );
    const hash = createHash("sha256").update(bytes).digest("hex").toUpperCase();
    const { error: finalizeError } = await admin.rpc("admin_secured_finalize_ambience_asset", {
      p_scene_id: input.sceneId,
      p_reservation_id: input.reservationId,
      p_storage_path: input.path,
      p_name: input.name,
      p_role: input.role,
      p_mime_type: ambienceMp3.mimeType,
      p_byte_size: bytes.length,
      p_duration_seconds: inspection.durationSeconds,
      p_sha256: hash,
      p_source_url: input.sourceUrl?.trim() || null,
      p_source_title: input.sourceFilename.trim() || input.name.trim(),
      p_source_sha256: String(input.sourceSha256).toUpperCase(),
      p_original_filename: input.sourceFilename,
      p_original_byte_size: Math.round(Number(input.sourceByteSize)),
      p_original_duration_seconds: Number(input.sourceDurationSeconds),
      p_selected_start_seconds: Number(input.selectedStartSeconds),
      p_selected_duration_seconds: Number(input.selectedDurationSeconds),
    });
    if (finalizeError) throw new Error(finalizeError.message);
  } catch (error) {
    await admin.rpc("admin_secured_discard_upload_reservation", {
      p_reservation_id: input.reservationId,
    });
    if (removeUploadedObject)
      await serviceAdmin.storage.from("ambience-audio").remove([input.path]);
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
  await requireAdmin();
  const { error: rateError } = await admin.rpc("admin_secured_consume_song_preview");
  if (rateError) throw new Error(rateError.message);
  if (inputs.length < 1 || inputs.length > 50)
    throw new Error("Paste between 1 and 50 YouTube links");
  const unique = new Map<string, string>();
  for (const input of inputs) {
    const videoId = youtubeVideoId(input);
    if (!videoId) throw new Error(`Invalid YouTube link: ${input}`);
    if (!unique.has(videoId)) unique.set(videoId, input);
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
  await requireAdmin();
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
  const { error } = await admin.rpc("admin_secured_append_queue_tracks", {
    p_curated_set_id: queueId,
    p_tracks: payload,
  });
  if (error) throw new Error(error.message);
}

export async function removeSongs(queueId: string, membershipIds: string[]): Promise<void> {
  await requireAdmin();
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
  await requireAdmin();
  const videoId = youtubeVideoId(input.source);
  if (!videoId) throw new Error("Enter a valid YouTube link or video ID");
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

export async function registerRoomVisit(visitId: string, sceneSlug: string): Promise<void> {
  const { data: scene, error: sceneError } = await serviceAdmin
    .from("scenes")
    .select("id")
    .eq("slug", sceneSlug)
    .eq("is_live", true)
    .maybeSingle();
  if (sceneError || !scene) return;
  const { error } = await serviceAdmin
    .from("room_visits")
    .upsert({ id: visitId, scene_id: scene.id }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function recordListening(
  visitId: string,
  sceneSlug: string,
  seconds: number,
): Promise<void> {
  const { data: scene } = await serviceAdmin
    .from("scenes")
    .select("id")
    .eq("slug", sceneSlug)
    .eq("is_live", true)
    .maybeSingle();
  if (!scene) return;
  if (!Number.isFinite(seconds)) return;
  const { error } = await serviceAdmin.rpc("record_room_heartbeat", {
    p_visit_id: visitId,
    p_scene_id: scene.id,
    p_seconds: Math.min(60, Math.max(1, Math.floor(seconds))),
  });
  if (error) throw new Error(error.message);
}
