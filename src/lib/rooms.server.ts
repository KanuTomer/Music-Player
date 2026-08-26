import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { resolveYouTubeId } from "./yt-resolve.server";
import type { RoomPayload, Scene } from "./rooms.functions";

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
  "id, slug, title_en, title_hi, hook, description, region, category, palette, art_key, is_dark, chat_mode, gag_label, sort_order";

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

  const [tracks, oneliners] = await Promise.all([
    client
      .from("tracks")
      .select("id, title, artist, year, youtube_id, search_query, daypart_tag, sort_order")
      .eq("scene_id", scene.id)
      .order("sort_order", { ascending: true }),
    client.from("oneliners").select("id, text_en, text_hi, daypart_tag").eq("scene_id", scene.id),
  ]);

  return {
    scene: scene as unknown as Scene,
    tracks: (tracks.data ?? []) as RoomPayload["tracks"],
    oneliners: (oneliners.data ?? []) as RoomPayload["oneliners"],
  };
}

export async function resolveRoomTrack(query: string) {
  return resolveYouTubeId(query);
}
