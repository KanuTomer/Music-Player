import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type AdminClient = {
  from: (table: string) => any;
  rpc: (name: string, args?: Record<string, unknown>) => any;
  auth: { getUser: (token: string) => Promise<{ data: { user: { id: string; email?: string } | null }; error: Error | null }> };
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

export type AdminScene = { id: string; slug: string; title: string; queueId: string; tracks: AdminTrack[] };
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
        : url.searchParams.get("v") ?? url.pathname.match(/\/(?:shorts|embed)\/([^/?]+)/)?.[1] ?? null;
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
      .select("id, position, track_id, tracks!inner(id, title, artist, year, playback_sources!inner(id, provider_item_id, source_url, is_active))")
      .eq("curated_set_id", set.id)
      .eq("tracks.playback_sources.is_active", true)
      .order("position");
    if (error) throw new Error(error.message);
    const tracks = await Promise.all(
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
    output.push({ id: scene.id, slug: scene.slug, title: scene.title_en, queueId: set.id, tracks });
  }
  return output;
}

export async function getAdminDashboard(since?: string): Promise<{ scenes: AdminScene[]; analytics: AnalyticsRow[] }> {
  await requireAdmin();
  const scenes = await activeScenes();
  const { data: visits, error } = await admin.rpc("admin_room_analytics", { p_since: since ?? null });
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
        averageListeningSeconds: values.playedVisits ? Math.round(values.seconds / values.playedVisits) : 0,
      };
    }),
  };
}

export type SongDraft = { input: string; title: string; artist: string; year: number | null; providerTitle?: string; providerChannel?: string };

export async function previewSongs(inputs: string[]): Promise<SongDraft[]> {
  await requireAdmin();
  if (inputs.length < 1 || inputs.length > 50) throw new Error("Paste between 1 and 50 YouTube links");
  return Promise.all(inputs.map(async (input) => {
    const videoId = youtubeVideoId(input);
    if (!videoId) throw new Error(`Invalid YouTube link: ${input}`);
    let providerTitle = "";
    let providerChannel = "";
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const payload = (await response.json()) as { title?: string; author_name?: string };
        providerTitle = payload.title?.trim() ?? "";
        providerChannel = payload.author_name?.trim() ?? "";
      }
    } catch {
      // Manual metadata entry remains available when the provider is unavailable.
    }
    return { input: `https://www.youtube.com/watch?v=${videoId}`, title: providerTitle, artist: providerChannel, year: null, providerTitle, providerChannel };
  }));
}

export async function addSongs(queueId: string, songs: SongDraft[]): Promise<void> {
  await requireAdmin();
  if (!queueId || songs.length < 1 || songs.length > 50) throw new Error("Invalid song import");
  const payload = songs.map((song) => {
    const videoId = youtubeVideoId(song.input);
    if (!videoId || !song.title.trim()) throw new Error("Each song needs a valid YouTube link and title");
    return { video_id: videoId, title: song.title, artist: song.artist, year: song.year, provider_title: song.providerTitle, provider_channel: song.providerChannel };
  });
  const { error } = await admin.rpc("admin_append_queue_tracks", { p_curated_set_id: queueId, p_tracks: payload });
  if (error) throw new Error(error.message);
}

export async function removeSongs(queueId: string, membershipIds: string[]): Promise<void> {
  await requireAdmin();
  const { error } = await admin.rpc("admin_remove_queue_tracks", { p_curated_set_id: queueId, p_membership_ids: membershipIds });
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
  const { data: scene, error: sceneError } = await admin.from("scenes").select("id").eq("slug", sceneSlug).eq("is_live", true).maybeSingle();
  if (sceneError || !scene) return;
  const { error } = await admin.from("room_visits").upsert({ id: visitId, scene_id: scene.id }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function recordListening(visitId: string, sceneSlug: string, seconds: number): Promise<void> {
  const { data: scene } = await admin.from("scenes").select("id").eq("slug", sceneSlug).eq("is_live", true).maybeSingle();
  if (!scene) return;
  if (!Number.isFinite(seconds)) return;
  const { error } = await admin.rpc("record_room_heartbeat", { p_visit_id: visitId, p_scene_id: scene.id, p_seconds: Math.min(60, Math.max(1, Math.floor(seconds))) });
  if (error) throw new Error(error.message);
}
