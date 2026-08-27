import { createServerFn } from "@tanstack/react-start";
import { fetchRoom, fetchScenes, resolveRoomTrack } from "./rooms.server";

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
  tags: string[];
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

export const listScenes = createServerFn({ method: "GET" }).handler(async () => {
  return fetchScenes();
});

export const resolveTrackVideo = createServerFn({ method: "GET" })
  .inputValidator((data: { query: string }) => ({ query: String(data.query) }))
  .handler(async ({ data }): Promise<{ videoId: string | null }> => {
    return { videoId: await resolveRoomTrack(data.query) };
  });

export const getRoom = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug) }))
  .handler(async ({ data }): Promise<RoomPayload | null> => {
    return fetchRoom(data.slug);
  });
