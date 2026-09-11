export type RoomPresenceStatus = "connecting" | "ready" | "unavailable";

export type RoomPresenceSnapshot = {
  count: number | null;
  status: RoomPresenceStatus;
};

export const CONNECTING_ROOM_PRESENCE: RoomPresenceSnapshot = {
  count: null,
  status: "connecting",
};

export function roomPresenceTopic(sceneSlug: string): string {
  return `room:scene:${sceneSlug}`;
}

export function countRoomPresences(state: Record<string, readonly unknown[]>): number {
  return Object.values(state).reduce((total, presences) => total + presences.length, 0);
}

export function roomPresenceLabel(snapshot: RoomPresenceSnapshot): string {
  if (snapshot.status === "connecting") return "Connecting…";
  if (snapshot.status === "unavailable" || snapshot.count === null) return "Unavailable";
  return String(snapshot.count);
}

type RealtimeStatus = "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR" | string;

export type RoomPresenceChannel = {
  on: (
    type: "presence" | "broadcast",
    filter: { event: string },
    callback: (message?: { payload?: unknown }) => void,
  ) => RoomPresenceChannel;
  subscribe: (callback: (status: RealtimeStatus) => void) => RoomPresenceChannel;
  presenceState: () => Record<string, readonly unknown[]>;
  track: (payload: Record<string, unknown>) => PromiseLike<unknown>;
  untrack: () => PromiseLike<unknown>;
  send: (payload: { type: "broadcast"; event: string; payload: unknown }) => PromiseLike<unknown>;
};

export type RoomPresenceClient = {
  channel: (
    topic: string,
    options: { config: { presence: { key: string } } },
  ) => RoomPresenceChannel;
  removeChannel: (channel: RoomPresenceChannel) => PromiseLike<unknown>;
};

export type RoomPresenceConsumer = {
  trackViewer?: boolean;
  onPresence?: (snapshot: RoomPresenceSnapshot) => void;
  onReaction?: (emoji: string) => void;
  onRoomRefresh?: (payload: unknown) => void;
};

export type RoomPresenceHandle = {
  sendReaction: (emoji: string) => Promise<unknown>;
  release: () => void;
};

type ConsumerRecord = RoomPresenceConsumer & { released: boolean };

type ChannelEntry = {
  sceneSlug: string;
  channel: RoomPresenceChannel | null;
  consumers: Set<ConsumerRecord>;
  snapshot: RoomPresenceSnapshot;
  subscribed: boolean;
  tracked: boolean;
  trackingWork: Promise<void>;
  teardownTimer: ReturnType<typeof setTimeout> | null;
  closing: boolean;
};

type RoomPresenceControllerOptions = {
  teardownGraceMs?: number;
  makePresenceKey?: () => string;
};

function defaultPresenceKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createRoomPresenceController(
  client: RoomPresenceClient,
  options: RoomPresenceControllerOptions = {},
) {
  const entries = new Map<string, ChannelEntry>();
  const teardownGraceMs = options.teardownGraceMs ?? 500;
  const makePresenceKey = options.makePresenceKey ?? defaultPresenceKey;

  const emitPresence = (entry: ChannelEntry, snapshot: RoomPresenceSnapshot) => {
    entry.snapshot = snapshot;
    for (const consumer of entry.consumers) consumer.onPresence?.(snapshot);
  };

  const emitReaction = (entry: ChannelEntry, emoji: string) => {
    for (const consumer of entry.consumers) consumer.onReaction?.(emoji);
  };

  const emitRoomRefresh = (entry: ChannelEntry, payload: unknown) => {
    for (const consumer of entry.consumers) consumer.onRoomRefresh?.(payload);
  };

  const wantsTracking = (entry: ChannelEntry) =>
    Array.from(entry.consumers).some((consumer) => consumer.trackViewer);

  const reconcileTracking = (entry: ChannelEntry) => {
    entry.trackingWork = entry.trackingWork
      .then(async () => {
        if (!entry.channel || !entry.subscribed || entry.closing) return;
        const shouldTrack = wantsTracking(entry);
        if (shouldTrack && !entry.tracked) {
          await entry.channel.track({ opened_at: new Date().toISOString() });
          entry.tracked = true;
        } else if (!shouldTrack && entry.tracked) {
          await entry.channel.untrack();
          entry.tracked = false;
        }
      })
      .catch(() => {
        emitPresence(entry, { count: null, status: "unavailable" });
      });
  };

  const startEntry = (entry: ChannelEntry) => {
    try {
      const channel = client.channel(roomPresenceTopic(entry.sceneSlug), {
        config: { presence: { key: makePresenceKey() } },
      });
      entry.channel = channel;
      emitPresence(entry, { ...CONNECTING_ROOM_PRESENCE });
      channel
        .on("presence", { event: "sync" }, () => {
          if (entry.channel !== channel || entry.closing) return;
          emitPresence(entry, {
            count: countRoomPresences(channel.presenceState()),
            status: "ready",
          });
        })
        .on("broadcast", { event: "reaction" }, (message) => {
          if (entry.channel !== channel || entry.closing) return;
          const payload = message?.payload;
          if (
            typeof payload === "object" &&
            payload !== null &&
            typeof (payload as { emoji?: unknown }).emoji === "string"
          ) {
            emitReaction(entry, (payload as { emoji: string }).emoji);
          }
        })
        .on("broadcast", { event: "room_refresh" }, (message) => {
          if (entry.channel !== channel || entry.closing) return;
          emitRoomRefresh(entry, message?.payload);
        })
        .subscribe((status) => {
          if (entry.channel !== channel || entry.closing) return;
          if (status === "SUBSCRIBED") {
            entry.subscribed = true;
            if (entry.snapshot.status !== "ready") {
              emitPresence(entry, { ...CONNECTING_ROOM_PRESENCE });
            }
            reconcileTracking(entry);
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            entry.subscribed = false;
            entry.tracked = false;
            emitPresence(entry, { count: null, status: "unavailable" });
          }
        });
    } catch {
      entry.channel = null;
      entry.subscribed = false;
      entry.tracked = false;
      emitPresence(entry, { count: null, status: "unavailable" });
    }
  };

  const beginTeardown = (entry: ChannelEntry) => {
    entry.teardownTimer = null;
    if (entry.consumers.size || entry.closing || !entry.channel) return;
    entry.closing = true;
    const channel = entry.channel;

    entry.trackingWork = entry.trackingWork
      .then(async () => {
        if (entry.consumers.size) {
          entry.closing = false;
          reconcileTracking(entry);
          return;
        }
        if (entry.tracked) {
          await channel.untrack();
          entry.tracked = false;
        }
        if (entry.consumers.size) {
          entry.closing = false;
          reconcileTracking(entry);
          return;
        }
        await client.removeChannel(channel);
        entry.channel = null;
        entry.subscribed = false;
        entry.closing = false;
        if (entry.consumers.size) startEntry(entry);
        else if (entries.get(entry.sceneSlug) === entry) entries.delete(entry.sceneSlug);
      })
      .catch(() => {
        entry.closing = false;
        if (entry.consumers.size) {
          emitPresence(entry, { count: null, status: "unavailable" });
        } else if (entries.get(entry.sceneSlug) === entry) {
          entries.delete(entry.sceneSlug);
        }
      });
  };

  const acquire = (
    sceneSlug: string,
    consumerOptions: RoomPresenceConsumer = {},
  ): RoomPresenceHandle => {
    let entry = entries.get(sceneSlug);
    if (!entry) {
      entry = {
        sceneSlug,
        channel: null,
        consumers: new Set(),
        snapshot: { ...CONNECTING_ROOM_PRESENCE },
        subscribed: false,
        tracked: false,
        trackingWork: Promise.resolve(),
        teardownTimer: null,
        closing: false,
      };
      entries.set(sceneSlug, entry);
      startEntry(entry);
    }

    if (entry.teardownTimer) {
      clearTimeout(entry.teardownTimer);
      entry.teardownTimer = null;
    }
    const consumer: ConsumerRecord = { ...consumerOptions, released: false };
    entry.consumers.add(consumer);
    consumer.onPresence?.(entry.snapshot);
    reconcileTracking(entry);

    return {
      sendReaction: (emoji: string) => {
        if (!entry?.channel || entry.closing) return Promise.resolve("unavailable");
        return Promise.resolve(
          entry.channel.send({ type: "broadcast", event: "reaction", payload: { emoji } }),
        ).catch(() => "unavailable");
      },
      release: () => {
        if (!entry || consumer.released) return;
        consumer.released = true;
        entry.consumers.delete(consumer);
        reconcileTracking(entry);
        if (!entry.consumers.size && !entry.teardownTimer) {
          entry.teardownTimer = setTimeout(
            () => beginTeardown(entry as ChannelEntry),
            teardownGraceMs,
          );
        }
      },
    };
  };

  return { acquire };
}
