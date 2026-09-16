import type { RoomPresenceChannel, RoomPresenceClient } from "./room-presence";

type Handler = (message?: { payload?: unknown }) => void;

function webSocketBase(): string {
  const configured = import.meta.env.VITE_WS_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (import.meta.env.DEV) return "ws://127.0.0.1:8787/api/v1/realtime";
  throw new Error("VITE_WS_BASE_URL is required");
}

class RenderRoomChannel implements RoomPresenceChannel {
  private socket: WebSocket | null = null;
  private closed = false;
  private tracked = false;
  private retry = 0;
  private readonly handlers = new Map<string, Set<Handler>>();
  private statusHandler: ((status: string) => void) | null = null;
  private presenceCount = 0;
  constructor(private readonly roomSlug: string) {}

  on(_type: "presence" | "broadcast", filter: { event: string }, callback: Handler) {
    const handlers = this.handlers.get(filter.event) ?? new Set<Handler>();
    handlers.add(callback);
    this.handlers.set(filter.event, handlers);
    return this;
  }
  subscribe(callback: (status: string) => void) {
    this.statusHandler = callback;
    this.connect();
    return this;
  }
  private emit(event: string, payload?: unknown) {
    for (const handler of this.handlers.get(event) ?? []) handler({ payload });
  }
  private connect() {
    if (this.closed) return;
    this.statusHandler?.("CONNECTING");
    const url = new URL(webSocketBase());
    url.searchParams.set("room", this.roomSlug);
    const socket = new WebSocket(url);
    this.socket = socket;
    socket.addEventListener("open", () => {
      this.retry = 0;
      this.statusHandler?.("SUBSCRIBED");
      this.emit("reconnect");
      if (this.tracked) socket.send(JSON.stringify({ type: "presence_track" }));
    });
    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(String(event.data)) as {
          type?: string;
          count?: number;
          payload?: unknown;
        };
        if (message.type === "presence" && Number.isInteger(message.count)) {
          this.presenceCount = Math.max(0, message.count as number);
          this.emit("sync");
        } else if (message.type === "reaction") this.emit("reaction", message.payload);
        else if (message.type === "room_refresh") this.emit("room_refresh", message.payload);
        else if (message.type === "chat_message") this.emit("chat_message", message.payload);
      } catch {
        /* Ignore malformed server messages. */
      }
    });
    socket.addEventListener("close", () => {
      if (this.socket === socket) this.socket = null;
      if (this.closed) return;
      this.statusHandler?.("CLOSED");
      window.setTimeout(() => this.connect(), Math.min(10_000, 500 * 2 ** this.retry++));
    });
    socket.addEventListener("error", () => socket.close());
  }
  presenceState() {
    return { viewers: Array.from({ length: this.presenceCount }, () => ({})) };
  }
  async track() {
    this.tracked = true;
    if (this.socket?.readyState === WebSocket.OPEN)
      this.socket.send(JSON.stringify({ type: "presence_track" }));
  }
  async untrack() {
    this.tracked = false;
    if (this.socket?.readyState === WebSocket.OPEN)
      this.socket.send(JSON.stringify({ type: "presence_untrack" }));
  }
  async send(payload: { type: "broadcast"; event: string; payload: unknown }) {
    if (payload.event !== "reaction" || this.socket?.readyState !== WebSocket.OPEN)
      throw new Error("Realtime unavailable");
    this.socket.send(
      JSON.stringify({ type: "reaction", emoji: (payload.payload as { emoji?: unknown })?.emoji }),
    );
  }
  close() {
    this.closed = true;
    this.socket?.close(1000, "Room closed");
    this.socket = null;
  }
}

export const renderRealtimeClient: RoomPresenceClient = {
  channel(topic) {
    return new RenderRoomChannel(topic.replace(/^room:scene:/, ""));
  },
  async removeChannel(channel) {
    (channel as RenderRoomChannel).close();
  },
};
