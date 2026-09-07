import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  AmbienceProfile,
  AmbienceStem,
  OneLiner,
  RoomPayload,
  RoomPresentation,
  Scene,
} from "./rooms.functions";

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
  "id, slug, title_en, title_hi, hook, description, region, category, palette, art_key, background_storage_path, foreground_text_color, is_dark, chat_mode, gag_label, sort_order, tags";

function sceneWithBackground(
  client: ReturnType<typeof publicClient>,
  scene: Record<string, unknown>,
) {
  const path =
    typeof scene["background_storage_path"] === "string" ? scene["background_storage_path"] : null;
  return {
    ...scene,
    background_storage_path: path,
    background_url: path
      ? client.storage.from("scene-media").getPublicUrl(path).data.publicUrl
      : null,
    foreground_text_color:
      typeof scene["foreground_text_color"] === "string"
        ? scene["foreground_text_color"]
        : "#FFF3D6",
  } as unknown as Scene;
}

function normalizeOneLiners(rows: Array<Record<string, unknown>>): OneLiner[] {
  return rows.map((row) => ({
    id: String(row["id"]),
    text_en: String(row["text_en"] ?? ""),
    text_hi: typeof row["text_hi"] === "string" ? row["text_hi"] : null,
    display_text: String(row["text_hi"] ?? row["text_en"] ?? ""),
    daypart_tag: String(row["daypart_tag"] ?? "all"),
  }));
}

export async function fetchScenes(): Promise<Scene[]> {
  const client = publicClient();
  const { data, error } = await client
    .from("scenes")
    .select(SCENE_COLS)
    .eq("is_live", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((scene) => sceneWithBackground(client, scene));
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
      .select(
        "id, max_master_gain, music_duck_ratio, fade_out_ms, fade_in_ms, audio_theme, visual_theme",
      )
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
    scene: sceneWithBackground(client, scene),
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
    oneliners: normalizeOneLiners(oneliners.data ?? []),
    ambience: ambienceProfile.data
      ? {
          ...ambienceProfile.data,
          max_master_gain: Number(ambienceProfile.data.max_master_gain),
          music_duck_ratio: Number(ambienceProfile.data.music_duck_ratio),
          audio_theme: ambienceProfile.data.audio_theme as AmbienceProfile["audio_theme"],
          visual_theme: (() => {
            const visual = ambienceProfile.data.visual_theme as AmbienceProfile["visual_theme"];
            return {
              ...visual,
              ...(visual.overlay_path
                ? {
                    overlay_url: client.storage
                      .from("scene-media")
                      .getPublicUrl(visual.overlay_path).data.publicUrl,
                  }
                : {}),
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

export async function fetchRoomPresentation(sceneId: string): Promise<RoomPresentation | null> {
  const client = publicClient();
  const [sceneResult, lineResult] = await Promise.all([
    client
      .from("scenes")
      .select("id, background_storage_path, foreground_text_color, gag_label")
      .eq("id", sceneId)
      .eq("is_live", true)
      .maybeSingle(),
    client.from("oneliners").select("id, text_en, text_hi, daypart_tag").eq("scene_id", sceneId),
  ]);
  if (sceneResult.error) throw new Error(sceneResult.error.message);
  if (lineResult.error) throw new Error(lineResult.error.message);
  if (!sceneResult.data) return null;
  const path = sceneResult.data.background_storage_path;
  return {
    scene_id: sceneResult.data.id,
    background_storage_path: path,
    background_url: path
      ? client.storage.from("scene-media").getPublicUrl(path).data.publicUrl
      : null,
    foreground_text_color: sceneResult.data.foreground_text_color,
    gag_label: sceneResult.data.gag_label,
    oneliners: normalizeOneLiners(lineResult.data ?? []),
  };
}

export async function fetchRoomAmbience(sceneId: string): Promise<AmbienceProfile | null> {
  const client = publicClient();
  const [ambienceProfile, ambienceStems] = await Promise.all([
    client
      .from("ambience_profiles")
      .select(
        "id, max_master_gain, music_duck_ratio, fade_out_ms, fade_in_ms, audio_theme, visual_theme",
      )
      .eq("scene_id", sceneId)
      .eq("enabled", true)
      .maybeSingle(),
    client
      .from("sound_stems")
      .select(
        "id, name, role, default_volume, min_gain, max_gain, crossfade_ms, loop_start_seconds, loop_end_seconds, event_min_seconds, event_max_seconds, sort_order, ambience_assets!inner(storage_path, ambience_asset_sources(source_url, source_title, source_order))",
      )
      .eq("scene_id", sceneId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);
  if (ambienceProfile.error) throw new Error(ambienceProfile.error.message);
  if (ambienceStems.error) throw new Error(ambienceStems.error.message);
  if (!ambienceProfile.data) return null;

  return {
    ...ambienceProfile.data,
    max_master_gain: Number(ambienceProfile.data.max_master_gain),
    music_duck_ratio: Number(ambienceProfile.data.music_duck_ratio),
    audio_theme: ambienceProfile.data.audio_theme as AmbienceProfile["audio_theme"],
    visual_theme: (() => {
      const visual = ambienceProfile.data.visual_theme as AmbienceProfile["visual_theme"];
      return {
        ...visual,
        ...(visual.overlay_path
          ? {
              overlay_url: client.storage.from("scene-media").getPublicUrl(visual.overlay_path).data
                .publicUrl,
            }
          : {}),
      };
    })(),
    stems: (ambienceStems.data ?? []).map((stem) => {
      const asset = stem.ambience_assets;
      return {
        id: stem.id,
        name: stem.name,
        role: stem.role,
        url: client.storage.from("ambience-audio").getPublicUrl(asset.storage_path).data.publicUrl,
        default_gain: Number(stem.default_volume),
        min_gain: Number(stem.min_gain),
        max_gain: Number(stem.max_gain),
        crossfade_ms: stem.crossfade_ms,
        loop_start_seconds: Number(stem.loop_start_seconds),
        loop_end_seconds: stem.loop_end_seconds == null ? null : Number(stem.loop_end_seconds),
        event_min_seconds: stem.event_min_seconds,
        event_max_seconds: stem.event_max_seconds,
        sources: [...asset.ambience_asset_sources].sort((a, b) => a.source_order - b.source_order),
      };
    }) as AmbienceStem[],
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

export async function insertChatMessage(
  roomKey: string,
  displayName: string,
  text: string,
  messageId?: string,
) {
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

  const insertPayload: Database["public"]["Tables"]["chat_messages"]["Insert"] = {
    room_key: roomKey,
    session_display_name: displayName,
    text: text,
    is_ai_host: false,
    expires_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
  };

  if (messageId) {
    insertPayload.id = messageId;
  }

  const { data, error } = await client
    .from("chat_messages")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error("Error inserting chat message:", error);
    throw new Error(error.message);
  }
  return data;
}
