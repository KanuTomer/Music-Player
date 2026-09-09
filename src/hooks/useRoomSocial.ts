import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEMO_LISTENER_FALLBACK,
  DEMO_LISTENER_MAX,
  DEMO_LISTENER_MIN,
  combinedDemoListenerCount,
  getOrCreateDemoListenerBaseline,
} from "@/lib/demo-listeners";
import type { RoomPresenceHandle } from "@/lib/room-presence";
import { roomPresenceController } from "@/lib/room-presence-runtime";

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
export function useRoomSocial(sceneSlug: string | null) {
  const roomKey = sceneSlug ? `scene:${sceneSlug}` : null;
  const [demoBaseline, setDemoBaseline] = useState(DEMO_LISTENER_FALLBACK);
  const [presenceListeners, setPresenceListeners] = useState(1);
  const [floating, setFloating] = useState<FloatingReaction[]>([]);
  const [connected, setConnected] = useState(false);
  const presenceHandleRef = useRef<RoomPresenceHandle | null>(null);
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
    if (!roomKey || !sceneSlug) return;
    setPresenceListeners(1);

    const handle = roomPresenceController.acquire(sceneSlug, {
      trackViewer: true,
      onPresence: (snapshot) => {
        if (snapshot.status === "ready" && snapshot.count !== null) {
          setPresenceListeners(Math.max(1, snapshot.count));
        }
        setConnected(snapshot.status === "ready");
      },
      onReaction: push,
    });
    presenceHandleRef.current = handle;

    return () => {
      presenceHandleRef.current = null;
      handle.release();
    };
  }, [roomKey, sceneSlug, push]);

  const react = useCallback(
    (emoji: string) => {
      push(emoji);
      if (navigator.vibrate) navigator.vibrate(12);
      void presenceHandleRef.current?.sendReaction(emoji);
      if (roomKey) {
        void supabase.from("reactions").insert({ room_key: roomKey, emoji });
      }
    },
    [push, roomKey],
  );

  return { listeners, floating, connected, react };
}
