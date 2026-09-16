import { and, asc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import { chatMessages } from "@/db/schema";
import type { ChatMessage } from "./chat-message";
import type { AmbienceProfile, RoomPayload, RoomPresentation, Scene } from "./rooms.functions";
import { neonRoomReadRepository } from "./rooms.neon.server";
import { broadcastChatMessage } from "./room-realtime.server";

export function fetchScenes(): Promise<Scene[]> {
  return neonRoomReadRepository.fetchScenes();
}

export function fetchRoom(slug: string): Promise<RoomPayload | null> {
  return neonRoomReadRepository.fetchRoom(slug);
}

export function fetchRoomAmbience(sceneId: string): Promise<AmbienceProfile | null> {
  return neonRoomReadRepository.fetchRoomAmbience(sceneId);
}

export function fetchRoomPresentation(sceneId: string): Promise<RoomPresentation | null> {
  return neonRoomReadRepository.fetchRoomPresentation(sceneId);
}

function mapChatMessage(row: typeof chatMessages.$inferSelect): ChatMessage {
  return {
    id: row.id,
    room_key: row.roomKey,
    session_display_name: row.sessionDisplayName,
    text: row.text,
    is_ai_host: row.isAiHost,
    created_at: row.createdAt,
    expires_at: row.expiresAt,
  };
}

export async function fetchChatMessages(roomKey: string): Promise<ChatMessage[]> {
  const rows = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.roomKey, roomKey), gt(chatMessages.expiresAt, sql`now()`)))
    .orderBy(asc(chatMessages.createdAt))
    .limit(100);
  return rows.map(mapChatMessage);
}

export async function insertChatMessage(
  roomKey: string,
  displayName: string,
  text: string,
  messageId?: string,
) {
  const inserted = await db
    .insert(chatMessages)
    .values({
      ...(messageId ? { id: messageId } : {}),
      roomKey,
      sessionDisplayName: displayName,
      text,
      isAiHost: false,
    })
    .onConflictDoNothing({ target: chatMessages.id })
    .returning();

  const row =
    inserted[0] ??
    (messageId
      ? (await db.select().from(chatMessages).where(eq(chatMessages.id, messageId)).limit(1))[0]
      : undefined);
  if (!row) throw new Error("Unable to save chat message");
  const message = mapChatMessage(row);
  broadcastChatMessage(roomKey.replace(/^scene:/, ""), message);
  return message;
}
