import { getRequest } from "@tanstack/react-start/server";
import { createHash, randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ambienceProcessing, type AmbienceRole } from "./ambience-processing";

type AdminClient = {
  // These admin-only tables and RPCs are introduced by the migration in this
  // change and are not present in the checked-in generated Supabase types yet.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: (name: string, args?: Record<string, unknown>) => any;
  auth: {
    getUser: (
      token: string,
    ) => Promise<{ data: { user: { id: string; email?: string } | null }; error: Error | null }>;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storage: any;
};

const admin = supabaseAdmin as unknown as AdminClient;
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
export type AnalyticsRow = {
  sceneId: string;
  slug: string;
  title: string;
  visits: number;
  playedVisits: number;
  listeningSeconds: number;
  averageListeningSeconds: number;
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

export async function requireAdmin(): Promise<{ id: string; email?: string }> {
  const request = getRequest();
  const authorization = request?.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new Error("Sign in is required");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("Your sign-in session is invalid");
  const { data: role, error: roleError } = await admin
    .from("app_admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (roleError || !role) throw new Error("Administrator access is required");
  return data.user;
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
  const payload = {
    scene_id: String(input.sceneId),
    enabled: Boolean(input.enabled),
    max_master_gain: numberInRange(input.maxMasterGain, 0, 1, "master volume"),
    music_duck_ratio: numberInRange(input.musicDuckRatio, 0, 1, "music volume"),
    fade_in_ms: Math.round(numberInRange(input.fadeInMs, 0, 10000, "fade in")),
    fade_out_ms: Math.round(numberInRange(input.fadeOutMs, 0, 10000, "fade out")),
    audio_theme: normalizeTheme(input.audioTheme),
  };
  const { error } = await admin
    .from("ambience_profiles")
    .upsert(payload, { onConflict: "scene_id" });
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
  const payload = {
    scene_id: input.sceneId,
    name: input.name.trim(),
    role: input.role,
    asset_id: input.assetId,
    is_active: Boolean(input.isActive),
    sort_order: Math.max(0, Math.round(Number(input.sortOrder) || 0)),
    default_volume: defaultVolume,
    min_gain: minGain,
    max_gain: maxGain,
    crossfade_ms: Math.round(numberInRange(input.crossfadeMs, 0, 10000, "crossfade")),
    loop_start_seconds: loopStart,
    loop_end_seconds: loopEnd,
    event_min_seconds: eventMin,
    event_max_seconds: eventMax,
    category: "ambient",
    synth_key: "sample",
  };
  const query = input.id
    ? admin.from("sound_stems").update(payload).eq("id", input.id)
    : admin.from("sound_stems").insert(payload);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

export async function deactivateAmbienceStem(stemId: string) {
  await requireAdmin();
  const { error } = await admin
    .from("sound_stems")
    .update({ is_active: false })
    .eq("id", String(stemId));
  if (error) throw new Error(error.message);
}

function inspectPlaybackWav(data: Buffer, role: AmbienceRole) {
  const decoded = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const view = new DataView(decoded);
  if (
    data.length < 44 ||
    data.toString("ascii", 0, 4) !== "RIFF" ||
    data.toString("ascii", 8, 12) !== "WAVE"
  )
    throw new Error("Prepared audio is not WAV");
  if (
    view.getUint16(20, true) !== 1 ||
    view.getUint16(22, true) !== 1 ||
    view.getUint32(24, true) !== ambienceProcessing.sampleRate ||
    view.getUint16(34, true) !== 16
  )
    throw new Error("Prepared audio must be 32 kHz mono PCM16 WAV");
  const duration = view.getUint32(40, true) / (ambienceProcessing.sampleRate * 2);
  if (
    duration <= 0 ||
    duration > ambienceProcessing.maxDurationSeconds[role] + 0.01 ||
    data.length > ambienceProcessing.maxPlaybackBytes
  )
    throw new Error("Prepared audio exceeds the role limit");
  return duration;
}

export async function reserveAmbienceUpload(sceneSlug: string) {
  await requireAdmin();
  const safeSlug = String(sceneSlug).replace(/[^a-z0-9-]/gi, "");
  if (!safeSlug) throw new Error("Invalid Jagah");
  const path = `rooms/${safeSlug}/ambience/${randomUUID()}.wav`;
  const { data, error } = await admin.storage.from("ambience-audio").createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "Unable to reserve audio upload");
  return { path, token: data.token };
}

export async function finalizeAmbienceUpload(input: {
  sceneId: string;
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
  let assetId: string | null = null;
  let removeUploadedObject = false;
  try {
    const pathMatch = input.path.match(
      /^rooms\/([a-z0-9-]+)\/ambience\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.wav$/i,
    );
    if (!pathMatch) throw new Error("Invalid upload path");
    const { data: scene, error: sceneError } = await admin
      .from("scenes")
      .select("slug")
      .eq("id", input.sceneId)
      .single();
    if (sceneError || !scene || scene.slug !== pathMatch[1]) throw new Error("Invalid upload path");
    const { data: existingAsset, error: existingError } = await admin
      .from("ambience_assets")
      .select("id")
      .eq("storage_path", input.path)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existingAsset) throw new Error("This upload has already been finalized");
    removeUploadedObject = true;
    const { data: object, error: downloadError } = await admin.storage
      .from("ambience-audio")
      .download(input.path);
    if (downloadError || !object)
      throw new Error(downloadError?.message ?? "Uploaded audio is missing");
    const bytes = Buffer.from(await object.arrayBuffer());
    const duration = inspectPlaybackWav(bytes, input.role);
    const hash = createHash("sha256").update(bytes).digest("hex").toUpperCase();
    const { data: asset, error: assetError } = await admin
      .from("ambience_assets")
      .insert({
        storage_path: input.path,
        mime_type: "audio/wav",
        byte_size: bytes.length,
        duration_seconds: duration,
        sha256: hash,
        is_active: true,
      })
      .select("id")
      .single();
    if (assetError || !asset) throw new Error(assetError?.message ?? "Unable to save audio asset");
    assetId = asset.id;
    const { error: sourceError } = await admin.from("ambience_asset_sources").insert({
      asset_id: asset.id,
      source_order: 1,
      source_url: input.sourceUrl?.trim() || null,
      source_title: input.sourceFilename.trim() || input.name.trim(),
      source_sha256: String(input.sourceSha256).toUpperCase(),
      original_filename: input.sourceFilename,
      original_byte_size: Math.round(Number(input.sourceByteSize)),
      original_duration_seconds: Number(input.sourceDurationSeconds),
      selected_start_seconds: Number(input.selectedStartSeconds),
      selected_duration_seconds: Number(input.selectedDurationSeconds),
    });
    if (sourceError) throw new Error(sourceError.message);
    await saveAmbienceStem({
      sceneId: input.sceneId,
      name: input.name,
      role: input.role,
      assetId: asset.id,
      isActive: true,
      sortOrder: 99,
      defaultVolume: input.role === "base" ? 0.9 : input.role === "texture" ? 0.6 : 0.35,
      minGain: input.role === "base" ? 0.82 : input.role === "texture" ? 0.52 : 0.22,
      maxGain: input.role === "base" ? 0.96 : input.role === "texture" ? 0.68 : 0.48,
      crossfadeMs: input.role === "event" ? 0 : 2500,
      loopStartSeconds: 0,
      loopEndSeconds: null,
      eventMinSeconds: input.role === "event" ? 35 : null,
      eventMaxSeconds: input.role === "event" ? 110 : null,
    });
  } catch (error) {
    if (assetId) {
      await admin.from("sound_stems").delete().eq("asset_id", assetId);
      await admin.from("ambience_assets").delete().eq("id", assetId);
    }
    if (removeUploadedObject) await admin.storage.from("ambience-audio").remove([input.path]);
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
  if (inputs.length < 1 || inputs.length > 50)
    throw new Error("Paste between 1 and 50 YouTube links");
  return Promise.all(
    inputs.map(async (input) => {
      const videoId = youtubeVideoId(input);
      if (!videoId) throw new Error(`Invalid YouTube link: ${input}`);
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
      return {
        input: `https://www.youtube.com/watch?v=${videoId}`,
        title: providerTitle,
        artist: providerChannel,
        year: null,
        providerTitle,
        providerChannel,
      };
    }),
  );
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
  const { error } = await admin.rpc("admin_append_queue_tracks", {
    p_curated_set_id: queueId,
    p_tracks: payload,
  });
  if (error) throw new Error(error.message);
}

export async function removeSongs(queueId: string, membershipIds: string[]): Promise<void> {
  await requireAdmin();
  const { error } = await admin.rpc("admin_remove_queue_tracks", {
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
  const { error } = await admin.rpc("admin_update_queue_track", {
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
  const { data: scene, error: sceneError } = await admin
    .from("scenes")
    .select("id")
    .eq("slug", sceneSlug)
    .eq("is_live", true)
    .maybeSingle();
  if (sceneError || !scene) return;
  const { error } = await admin
    .from("room_visits")
    .upsert({ id: visitId, scene_id: scene.id }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function recordListening(
  visitId: string,
  sceneSlug: string,
  seconds: number,
): Promise<void> {
  const { data: scene } = await admin
    .from("scenes")
    .select("id")
    .eq("slug", sceneSlug)
    .eq("is_live", true)
    .maybeSingle();
  if (!scene) return;
  if (!Number.isFinite(seconds)) return;
  const { error } = await admin.rpc("record_room_heartbeat", {
    p_visit_id: visitId,
    p_scene_id: scene.id,
    p_seconds: Math.min(60, Math.max(1, Math.floor(seconds))),
  });
  if (error) throw new Error(error.message);
}
