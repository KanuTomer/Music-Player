import { WebSocket, WebSocketServer } from "ws";
import type { Server as HttpServer } from "node:http";
import type { ChatMessage } from "./chat-message";
import type { RoomRefreshPayload } from "./room-refresh";

type Client = WebSocket & {
  roomSlug?: string;
  tracked?: boolean;
  alive?: boolean;
  authorized?: boolean;
};
const rooms = new Map<string, Set<Client>>();
const ROOM_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function send(client: WebSocket, value: unknown) {
  if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(value));
}

function broadcast(roomSlug: string, value: unknown) {
  for (const client of rooms.get(roomSlug) ?? []) send(client, value);
}

function broadcastPresence(roomSlug: string) {
  const count = Array.from(rooms.get(roomSlug) ?? []).filter((client) => client.tracked).length;
  broadcast(roomSlug, { type: "presence", count });
}

export function broadcastRoomRefreshRealtime(roomSlug: string, payload: RoomRefreshPayload) {
  broadcast(roomSlug, { type: "room_refresh", payload });
}

export function broadcastChatMessage(roomSlug: string, message: ChatMessage) {
  broadcast(roomSlug, { type: "chat_message", payload: message });
}

export function attachRoomRealtime(server: unknown, allowedOrigins: ReadonlySet<string>) {
  const webSockets = new WebSocketServer({ noServer: true });
  (server as HttpServer).on("upgrade", (request, socket, head) => {
    const origin = request.headers.origin?.replace(/\/$/, "");
    const url = new URL(request.url ?? "/", "http://localhost");
    const roomSlug = url.searchParams.get("room") ?? "";
    if (
      url.pathname !== "/api/v1/realtime" ||
      !origin ||
      !allowedOrigins.has(origin) ||
      !ROOM_SLUG.test(roomSlug)
    ) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    webSockets.handleUpgrade(request, socket, head, (client) => {
      const peer = client as Client;
      peer.roomSlug = roomSlug;
      peer.alive = true;
      rooms.set(roomSlug, rooms.get(roomSlug) ?? new Set());
      rooms.get(roomSlug)?.add(peer);
      webSockets.emit("connection", peer, request);
    });
  });

  webSockets.on("connection", (client: Client) => {
    const roomSlug = client.roomSlug as string;
    client.authorized = false;
    void import("./rooms.server")
      .then(({ fetchRoom }) => fetchRoom(roomSlug))
      .then((room) => {
        if (!room) client.close(1008, "Unknown room");
        else client.authorized = true;
      })
      .catch(() => client.close(1011, "Room check failed"));
    client.on("pong", () => (client.alive = true));
    client.on("message", (raw) => {
      if (!client.authorized) return;
      const text = raw.toString();
      if (text.length > 2048) return client.close(1009, "Message too large");
      let value: { type?: unknown; emoji?: unknown };
      try {
        value = JSON.parse(text) as typeof value;
      } catch {
        return;
      }
      if (value.type === "presence_track") {
        client.tracked = true;
        broadcastPresence(roomSlug);
      } else if (value.type === "presence_untrack") {
        client.tracked = false;
        broadcastPresence(roomSlug);
      } else if (
        value.type === "reaction" &&
        typeof value.emoji === "string" &&
        value.emoji.length > 0 &&
        value.emoji.length <= 16
      ) {
        broadcast(roomSlug, { type: "reaction", payload: { emoji: value.emoji } });
      }
    });
    client.on("close", () => {
      rooms.get(roomSlug)?.delete(client);
      if (!rooms.get(roomSlug)?.size) rooms.delete(roomSlug);
      else broadcastPresence(roomSlug);
    });
  });

  const heartbeat = setInterval(() => {
    for (const client of webSockets.clients as Set<Client>) {
      if (client.alive === false) client.terminate();
      else {
        client.alive = false;
        client.ping();
      }
    }
  }, 30_000);
  heartbeat.unref();
  webSockets.once("close", () => clearInterval(heartbeat));
  return webSockets;
}
