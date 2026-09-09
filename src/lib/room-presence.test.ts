import { describe, expect, test } from "bun:test";
import {
  countRoomPresences,
  createRoomPresenceController,
  roomPresenceLabel,
  roomPresenceTopic,
  type RoomPresenceChannel,
  type RoomPresenceClient,
} from "./room-presence";

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

class FakeChannel implements RoomPresenceChannel {
  onCalls = 0;
  subscribeCalls = 0;
  trackCalls = 0;
  untrackCalls = 0;
  subscribed = false;
  state: Record<string, readonly unknown[]> = {};
  private presenceCallback: (() => void) | null = null;
  private reactionCallback: ((message?: { payload?: unknown }) => void) | null = null;
  private statusCallback: ((status: string) => void) | null = null;

  on(
    type: "presence" | "broadcast",
    _filter: { event: string },
    callback: (message?: { payload?: unknown }) => void,
  ) {
    if (this.subscribed) throw new Error("callbacks registered after subscribe");
    this.onCalls += 1;
    if (type === "presence") this.presenceCallback = callback;
    else this.reactionCallback = callback;
    return this;
  }

  subscribe(callback: (status: string) => void) {
    this.subscribeCalls += 1;
    this.subscribed = true;
    this.statusCallback = callback;
    return this;
  }

  presenceState() {
    return this.state;
  }

  track() {
    this.trackCalls += 1;
    return Promise.resolve("ok");
  }

  untrack() {
    this.untrackCalls += 1;
    return Promise.resolve("ok");
  }

  send() {
    return Promise.resolve("ok");
  }

  emitStatus(status: string) {
    this.statusCallback?.(status);
  }

  emitPresence(state: Record<string, readonly unknown[]>) {
    this.state = state;
    this.presenceCallback?.();
  }

  emitReaction(emoji: string) {
    this.reactionCallback?.({ payload: { emoji } });
  }
}

function makeClient() {
  const channel = new FakeChannel();
  let channelCalls = 0;
  let removeCalls = 0;
  const client: RoomPresenceClient = {
    channel: () => {
      channelCalls += 1;
      return channel;
    },
    removeChannel: async () => {
      removeCalls += 1;
      return "ok";
    },
  };
  return {
    channel,
    client,
    channelCalls: () => channelCalls,
    removeCalls: () => removeCalls,
  };
}

describe("room presence", () => {
  test("uses one stable channel topic per Jagah", () => {
    expect(roomPresenceTopic("sainik-dhaba")).toBe("room:scene:sainik-dhaba");
  });

  test("counts every tracked tab, including duplicate presence keys", () => {
    expect(
      countRoomPresences({
        first: [{ opened_at: "one" }, { opened_at: "two" }],
        second: [{ opened_at: "three" }],
      }),
    ).toBe(3);
  });

  test("does not turn unsynchronized or failed connections into zero", () => {
    expect(roomPresenceLabel({ count: null, status: "connecting" })).toBe("Connecting…");
    expect(roomPresenceLabel({ count: null, status: "unavailable" })).toBe("Unavailable");
    expect(roomPresenceLabel({ count: 0, status: "ready" })).toBe("0");
  });

  test("reacquires one subscribed channel during the teardown grace period", async () => {
    const fake = makeClient();
    const controller = createRoomPresenceController(fake.client, {
      teardownGraceMs: 10,
      makePresenceKey: () => "tab-key",
    });
    const first = controller.acquire("sainik-dhaba", { trackViewer: true });
    fake.channel.emitStatus("SUBSCRIBED");
    await flush();
    first.release();
    const second = controller.acquire("sainik-dhaba", { trackViewer: true });
    await flush();

    expect(fake.channelCalls()).toBe(1);
    expect(fake.channel.onCalls).toBe(2);
    expect(fake.channel.subscribeCalls).toBe(1);
    expect(fake.channel.trackCalls).toBe(1);

    second.release();
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(fake.channel.untrackCalls).toBe(1);
    expect(fake.removeCalls()).toBe(1);
  });

  test("tracks room consumers but leaves Analytics observers untracked", async () => {
    const fake = makeClient();
    const controller = createRoomPresenceController(fake.client, { teardownGraceMs: 5 });
    const observer = controller.acquire("sainik-dhaba", { trackViewer: false });
    fake.channel.emitStatus("SUBSCRIBED");
    await flush();
    expect(fake.channel.trackCalls).toBe(0);

    const viewer = controller.acquire("sainik-dhaba", { trackViewer: true });
    await flush();
    expect(fake.channel.trackCalls).toBe(1);

    viewer.release();
    await flush();
    expect(fake.channel.untrackCalls).toBe(1);
    observer.release();
  });

  test("distributes presence, reactions, and unavailable connection states", () => {
    const fake = makeClient();
    const controller = createRoomPresenceController(fake.client);
    const snapshots: string[] = [];
    const reactions: string[] = [];
    controller.acquire("sainik-dhaba", {
      onPresence: (snapshot) => snapshots.push(`${snapshot.status}:${snapshot.count}`),
      onReaction: (emoji) => reactions.push(emoji),
    });

    fake.channel.emitPresence({ first: [{ opened_at: "one" }] });
    fake.channel.emitReaction("👏");
    fake.channel.emitStatus("CHANNEL_ERROR");

    expect(snapshots).toEqual(["connecting:null", "ready:1", "unavailable:null"]);
    expect(reactions).toEqual(["👏"]);
  });
});
