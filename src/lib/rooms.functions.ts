import {
  normalizePlaybackSourceFailureInput,
  normalizeRoomListeningInput,
  normalizeRoomVisitInput,
} from "./rooms.operations";
import type {
  AmbienceProfile,
  RoomPayload,
  RoomPresentation,
  Scene,
} from "@developersshunyity/sainik-dabha-contracts/rooms";
export type {
  AmbienceFilter,
  AmbienceProfile,
  AmbienceSource,
  AmbienceStem,
  AmbienceVisualTheme,
  CuratedSet,
  OneLiner,
  PlaybackSource,
  QueueItem,
  RoomPayload,
  RoomPresentation,
  Scene,
} from "@developersshunyity/sainik-dabha-contracts/rooms";
import { validateChatMessageText, type ChatMessage } from "./chat-message";
import { callApi } from "./api-client";

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

export function getChatMessages({ data }: { data: { roomKey: string } }): Promise<ChatMessage[]> {
  const roomKey = String(data.roomKey);
  if (!/^scene:[a-z0-9-]+$/.test(roomKey)) throw new Error("Invalid room key");
  return callApi("get-chat-messages", { roomKey }, { safeRead: true });
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
