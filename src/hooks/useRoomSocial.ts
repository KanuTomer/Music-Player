import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEMO_LISTENER_FALLBACK,
  DEMO_LISTENER_MAX,
  DEMO_LISTENER_MIN,
  combinedDemoListenerCount,
  getOrCreateDemoListenerBaseline,
} from "@/lib/demo-listeners";

export type FloatingReaction = { id: number; emoji: string; x: number };

const ADJECTIVES = [
  "Chai",
  "Kulhad",
  "Rickshaw",
  "Monsoon",
  "Pakoda",
  "Tapri",
  "Cassette",
  "Scooter",
];
const NOUNS = ["Bhai", "Didi", "Babu", "Uncle", "Yaar", "Sahab", "Pappu", "Guru"];

export function randomDesiName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a} ${n}`;
}

/**
 * Presence count + realtime reactions for one room.
 * A single channel per room handles both, torn down on unmount.
 */
export function useRoomSocial(roomKey: string | null) {
  const [demoBaseline, setDemoBaseline] = useState(DEMO_LISTENER_FALLBACK);
  const [presenceListeners, setPresenceListeners] = useState(1);
  const [floating, setFloating] = useState<FloatingReaction[]>([]);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const seq = useRef(0);
  const listeners = combinedDemoListenerCount(demoBaseline, presenceListeners);

  useEffect(() => {
    try {
      setDemoBaseline(getOrCreateDemoListenerBaseline(window.sessionStorage, roomKey));
    } catch {
      setDemoBaseline(getOrCreateDemoListenerBaseline(null, roomKey));
    }
  }, [roomKey]);

  // Periodic organic fluctuation (up & down by 1-4 listeners every 2.5-6.5 seconds)
  useEffect(() => {
    let timer: number;
    const tick = () => {
      // Random short interval between 2.5s and 6.5s
      const delay = 2500 + Math.random() * 4000;
      timer = window.setTimeout(() => {
        setDemoBaseline((prev) => {
          const deltas = [-3, -2, -2, -1, -1, 0, 1, 1, 2, 2, 3];
          const delta = deltas[Math.floor(Math.random() * deltas.length)] ?? 0;
          return Math.min(DEMO_LISTENER_MAX, Math.max(DEMO_LISTENER_MIN, prev + delta));
        });
        tick();
      }, delay);
    };

    tick();
    return () => window.clearTimeout(timer);
  }, [roomKey]);

  const push = useCallback((emoji: string) => {
    seq.current += 1;
    const item = { id: seq.current, emoji, x: 8 + Math.random() * 84 };
    setFloating((f) => [...f.slice(-24), item]);
    window.setTimeout(() => setFloating((f) => f.filter((r) => r.id !== item.id)), 2700);
  }, []);

  useEffect(() => {
    if (!roomKey) return;
    setPresenceListeners(1);

    const channel = supabase.channel(`room:${roomKey}`, {
      config: { presence: { key: crypto.randomUUID() } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setPresenceListeners(Math.max(1, Object.keys(state).length));
      })
      .on("broadcast", { event: "reaction" }, ({ payload }) => {
        push((payload as { emoji: string }).emoji);
      })
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") {
          void channel.track({ at: Date.now() });
        }
      });

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [roomKey, push]);

  const react = useCallback(
    (emoji: string) => {
      push(emoji);
      if (navigator.vibrate) navigator.vibrate(12);
      void channelRef.current?.send({
        type: "broadcast",
        event: "reaction",
        payload: { emoji },
      });
      if (roomKey) {
        void supabase.from("reactions").insert({ room_key: roomKey, emoji });
      }
    },
    [push, roomKey],
  );

  return { listeners, floating, connected, react };
}
