import {
  normalizePlaybackSourceFailureInput,
  normalizeRoomListeningInput,
  normalizeRoomVisitInput,
} from "./rooms.operations";
import { validateChatMessageText } from "./chat-message";
import { callApi } from "./api-client";

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
  background_storage_path: string | null;
  background_url: string | null;
  foreground_text_color: string;
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
  display_text: string;
  daypart_tag: string;
};

export type RoomPresentation = {
  scene_id: string;
  background_storage_path: string | null;
  background_url: string | null;
  foreground_text_color: string;
  gag_label: string | null;
  oneliners: OneLiner[];
};

export type AmbienceSource = {
  source_url: string;
  source_title: string;
  source_order: number;
};

export type AmbienceStem = {
  id: string;
  name: string;
  role: "base" | "texture" | "event";
  url: string;
  default_gain: number;
  min_gain: number;
  max_gain: number;
  crossfade_ms: number;
  loop_start_seconds: number;
  loop_end_seconds: number | null;
  event_min_seconds: number | null;
  event_max_seconds: number | null;
  sources: AmbienceSource[];
};

export type AmbienceFilter = {
  highpass_hz?: number;
  lowpass_hz?: number;
  peak_hz?: number;
  peak_gain_db?: number;
  peak_q?: number;
};

export type AmbienceVisualTheme = {
  accent?: string;
  haze?: string;
  pattern?: string;
  overlay_path?: string;
  overlay_url?: string;
  blend_mode?: "screen" | "soft-light" | "lighten";
  playback_rate?: number;
  opacity_floor?: number;
  opacity_ceiling?: number;
};

export type AmbienceProfile = {
  id: string;
  max_master_gain: number;
  music_duck_ratio: number;
  fade_out_ms: number;
  fade_in_ms: number;
  audio_theme: Partial<Record<AmbienceStem["role"], AmbienceFilter>>;
  visual_theme: AmbienceVisualTheme;
  stems: AmbienceStem[];
};

export type RoomPayload = {
  scene: Scene;
  curatedSet: CuratedSet;
  queue: QueueItem[];
  oneliners: OneLiner[];
  ambience: AmbienceProfile | null;
};

export function listScenes(): Promise<Scene[]> {
  return callApi("list-scenes", null, { safeRead: true });
}

export function reportPlaybackSourceFailure({
  data,
}: {
  data: { sourceId: string; errorCode: number };
}): Promise<void> {
  const normalized = normalizePlaybackSourceFailureInput(data.sourceId, data.errorCode);
  return callApi("report-playback-source-failure", normalized);
}

export function getRoom({ data }: { data: { slug: string } }): Promise<RoomPayload | null> {
  return callApi("get-room", { slug: String(data.slug) }, { safeRead: true });
}

export function getRoomAmbience({
  data,
}: {
  data: { sceneId: string };
}): Promise<AmbienceProfile | null> {
  return callApi("get-room-ambience", { sceneId: String(data.sceneId) }, { safeRead: true });
}

export function getRoomPresentation({
  data,
}: {
  data: { sceneId: string };
}): Promise<RoomPresentation | null> {
  return callApi("get-room-presentation", { sceneId: String(data.sceneId) }, { safeRead: true });
}

export function sendChatMessage({
  data,
}: {
  data: { roomKey: string; displayName: string; text: string; id?: string };
}): Promise<unknown> {
  const roomKey = String(data.roomKey);
  const displayName = String(data.displayName).trim();
  const text = String(data.text).trim();
  const id = data.id ? String(data.id) : undefined;
  if (!roomKey) throw new Error("Room key is required");
  if (!displayName || displayName.length > 50) throw new Error("Invalid display name");
  const textError = validateChatMessageText(text);
  if (textError) throw new Error(textError);
  return callApi("send-chat-message", { roomKey, displayName, text, id });
}

export function recordRoomVisit({
  data,
}: {
  data: { visitId: string; sceneSlug: string };
}): Promise<void> {
  const normalized = normalizeRoomVisitInput(data.visitId, data.sceneSlug);
  return callApi("record-room-visit", normalized);
}

export function recordRoomListening({
  data,
}: {
  data: { visitId: string; sceneSlug: string; seconds: number };
}): Promise<void> {
  const normalized = normalizeRoomListeningInput(data.visitId, data.sceneSlug, data.seconds);
  return callApi("record-room-listening", normalized);
}
