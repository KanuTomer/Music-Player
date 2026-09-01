import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { AmbienceProfile, AmbienceStem, RoomPayload, Scene } from "./rooms.functions";

function publicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Backend configuration is unavailable");

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

const SCENE_COLS =
  "id, slug, title_en, title_hi, hook, description, region, category, palette, art_key, is_dark, chat_mode, gag_label, sort_order, tags";

export async function fetchScenes(): Promise<Scene[]> {
  const { data, error } = await publicClient()
    .from("scenes")
    .select(SCENE_COLS)
    .eq("is_live", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Scene[];
}

export async function fetchRoom(slug: string): Promise<RoomPayload | null> {
  const client = publicClient();
  const { data: scene, error } = await client
    .from("scenes")
    .select(SCENE_COLS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!scene) return null;

  const [curatedSet, oneliners, ambienceProfile, ambienceStems] = await Promise.all([
    client
      .from("curated_sets")
      .select("id, title, shuffle_start")
      .eq("scene_id", scene.id)
      .eq("is_active", true)
      .single(),
    client.from("oneliners").select("id, text_en, text_hi, daypart_tag").eq("scene_id", scene.id),
    client
      .from("ambience_profiles")
      .select("id, max_master_gain, fade_out_ms, fade_in_ms, audio_theme, visual_theme")
      .eq("scene_id", scene.id)
      .eq("enabled", true)
      .maybeSingle(),
    client
      .from("sound_stems")
      .select(
        "id, name, role, default_volume, min_gain, max_gain, crossfade_ms, loop_start_seconds, loop_end_seconds, event_min_seconds, event_max_seconds, sort_order, ambience_assets!inner(storage_path, ambience_asset_sources(source_url, source_title, source_order))",
      )
      .eq("scene_id", scene.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);
  if (curatedSet.error) throw new Error(curatedSet.error.message);
  if (ambienceProfile.error) throw new Error(ambienceProfile.error.message);
  if (ambienceStems.error) throw new Error(ambienceStems.error.message);

  const memberships = await client
    .from("curated_set_tracks")
    .select(
      "id, position, daypart_tag, tracks!inner(id, title, artist, year, playback_sources!inner(id, provider, provider_item_id, source_url, provider_title, provider_channel, priority, is_active))",
    )
    .eq("curated_set_id", curatedSet.data.id)
    .eq("tracks.playback_sources.is_active", true)
    .order("position", { ascending: true });
  if (memberships.error) throw new Error(memberships.error.message);

  return {
    scene: scene as unknown as Scene,
    curatedSet: curatedSet.data,
    queue: (memberships.data ?? []).map((membership) => {
      const track = membership.tracks;
      return {
        id: membership.id,
        position: membership.position,
        daypart_tag: membership.daypart_tag,
        track: { id: track.id, title: track.title, artist: track.artist, year: track.year },
        sources: track.playback_sources
          .map(({ is_active: _active, ...source }) => source)
          .sort((a, b) => a.priority - b.priority),
      };
    }) as RoomPayload["queue"],
    oneliners: (oneliners.data ?? []) as RoomPayload["oneliners"],
    ambience: ambienceProfile.data
      ? {
          ...ambienceProfile.data,
          max_master_gain: Number(ambienceProfile.data.max_master_gain),
          audio_theme: ambienceProfile.data.audio_theme as AmbienceProfile["audio_theme"],
          visual_theme: (() => {
            const visual = ambienceProfile.data.visual_theme as AmbienceProfile["visual_theme"];
            return {
              ...visual,
              overlay_url: visual.overlay_path
                ? client.storage.from("scene-media").getPublicUrl(visual.overlay_path).data
                    .publicUrl
                : undefined,
            };
          })(),
          stems: (ambienceStems.data ?? []).map((stem) => {
            const asset = stem.ambience_assets;
            return {
              id: stem.id,
              name: stem.name,
              role: stem.role,
              url: client.storage.from("ambience-audio").getPublicUrl(asset.storage_path).data
                .publicUrl,
              default_gain: Number(stem.default_volume),
              min_gain: Number(stem.min_gain),
              max_gain: Number(stem.max_gain),
              crossfade_ms: stem.crossfade_ms,
              loop_start_seconds: Number(stem.loop_start_seconds),
              loop_end_seconds:
                stem.loop_end_seconds == null ? null : Number(stem.loop_end_seconds),
              event_min_seconds: stem.event_min_seconds,
              event_max_seconds: stem.event_max_seconds,
              sources: [...asset.ambience_asset_sources].sort(
                (a, b) => a.source_order - b.source_order,
              ),
            };
          }) as AmbienceStem[],
        }
      : null,
  };
}

export async function recordSourceFailure(sourceId: string, errorCode: number) {
  const url = process.env["SUPABASE_URL"];
  const secret = process.env["SUPABASE_SECRET_KEY"];
  if (!url || !secret) throw new Error("Failure reporting is unavailable");
  const client = createClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (secret.startsWith("sb_") && headers.get("Authorization") === `Bearer ${secret}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", secret);
        return fetch(input, { ...init, headers });
      },
    },
  });
  const { error } = await client.rpc("record_playback_source_failure", {
    p_source_id: sourceId,
    p_error_code: errorCode,
  });
  if (error) throw new Error(error.message);
  return { recorded: true };
}

export async function insertChatMessage(roomKey: string, displayName: string, text: string) {
  const url = process.env["SUPABASE_URL"];
  const secret = process.env["SUPABASE_SECRET_KEY"];
  if (!url || !secret) throw new Error("Database configuration is unavailable");

  const client = createClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (secret.startsWith("sb_") && headers.get("Authorization") === `Bearer ${secret}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", secret);
        return fetch(input, { ...init, headers });
      },
    },
  });

  const { data, error } = await client
    .from("chat_messages")
    .insert({
      room_key: roomKey,
      session_display_name: displayName,
      text: text,
      is_ai_host: false,
      expires_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error inserting chat message:", error);
    throw new Error(error.message);
  }
  return data;
}
