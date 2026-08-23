import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { resolveYouTubeId } from "./yt-resolve.server";
import type { Database } from "@/integrations/supabase/types";


export type Scene = {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string;
  hook: string;
  description: string | null;
  region: string | null;
  category: string;
  palette: Record<string, string>;
  art_key: string;
  is_dark: boolean;
  chat_mode: string;
  gag_label: string | null;
  sort_order: number;
};

export type Track = {
  id: string;
  title: string;
  artist: string | null;
  year: number | null;
  youtube_id: string | null;
  search_query: string | null;
  daypart_tag: string;
  sort_order: number;
};

export type OneLiner = {
  id: string;
  text_en: string;
  text_hi: string | null;
  daypart_tag: string;
};

export type RoomPayload = {
  scene: Scene;
  tracks: Track[];
  oneliners: OneLiner[];
};

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const SCENE_COLS =
  "id, slug, title_en, title_hi, hook, description, region, category, palette, art_key, is_dark, chat_mode, gag_label, sort_order";

export const listScenes = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("scenes")
    .select(SCENE_COLS)
    .eq("is_live", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Scene[];
});

export const resolveTrackVideo = createServerFn({ method: "GET" })
  .inputValidator((data: { query: string }) => ({ query: String(data.query) }))
  .handler(async ({ data }): Promise<{ videoId: string | null }> => {
    return { videoId: await resolveYouTubeId(data.query) };
  });


export const getRoom = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug) }))
  .handler(async ({ data }): Promise<RoomPayload | null> => {
    const supabase = publicClient();
    const { data: scene, error } = await supabase
      .from("scenes")
      .select(SCENE_COLS)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!scene) return null;

    const [tracks, oneliners] = await Promise.all([
      supabase
        .from("tracks")
        .select("id, title, artist, year, youtube_id, search_query, daypart_tag, sort_order")
        .eq("scene_id", scene.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("oneliners")
        .select("id, text_en, text_hi, daypart_tag")
        .eq("scene_id", scene.id),
    ]);

    return {
      scene: scene as unknown as Scene,
      tracks: (tracks.data ?? []) as unknown as Track[],
      oneliners: (oneliners.data ?? []) as unknown as OneLiner[],
    };
  });
