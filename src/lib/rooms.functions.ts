import { createServerFn } from "@tanstack/react-start";
import { fetchRoom, fetchScenes, recordSourceFailure } from "./rooms.server";

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

export type PlaybackSource = {
  id: string;
  provider: "youtube";
  provider_item_id: string;
  source_url: string;
  provider_title: string | null;
  provider_channel: string | null;
  priority: number;
};

export type QueueItem = {
  id: string;
  position: number;
  daypart_tag: string;
  track: {
    id: string;
    title: string;
    artist: string | null;
    year: number | null;
  };
  sources: PlaybackSource[];
};

export type CuratedSet = {
  id: string;
  title: string;
  shuffle_start: boolean;
};

export type OneLiner = {
  id: string;
  text_en: string;
  text_hi: string | null;
  daypart_tag: string;
};

export type RoomPayload = {
  scene: Scene;
  curatedSet: CuratedSet;
  queue: QueueItem[];
  oneliners: OneLiner[];
};

export const listScenes = createServerFn({ method: "GET" }).handler(async () => {
  return fetchScenes();
});

export const reportPlaybackSourceFailure = createServerFn({ method: "POST" })
  .validator((data: { sourceId: string; errorCode: number }) => {
    const sourceId = String(data.sourceId);
    const errorCode = Number(data.errorCode);
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sourceId)
    ) {
      throw new Error("Invalid source identifier");
    }
    if (![2, 5, 100, 101, 150, 153].includes(errorCode)) throw new Error("Invalid player error");
    return { sourceId, errorCode };
  })
  .handler(async ({ data }) => recordSourceFailure(data.sourceId, data.errorCode));

export const getRoom = createServerFn({ method: "GET" })
  .validator((data: { slug: string }) => ({ slug: String(data.slug) }))
  .handler(async ({ data }): Promise<RoomPayload | null> => {
    return fetchRoom(data.slug);
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .validator((data: { roomKey: string; displayName: string; text: string }) => {
    const roomKey = String(data.roomKey);
    const displayName = String(data.displayName).trim();
    const text = String(data.text).trim();

    if (!roomKey) throw new Error("Room key is required");
    if (!displayName || displayName.length > 50) throw new Error("Invalid display name");
    if (!text || text.length > 300) throw new Error("Message text must be between 1 and 300 characters");

    return { roomKey, displayName, text };
  })
  .handler(async ({ data }) => {
    const { insertChatMessage } = await import("./rooms.server");
    return insertChatMessage(data.roomKey, data.displayName, data.text);
  });

