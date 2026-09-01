import { useCallback, useEffect, useRef, useState } from "react";
import { AmbienceEngine, type AmbienceStatus } from "@/lib/ambience";
import type { RoomPayload } from "@/lib/rooms.functions";

export function useAmbienceEngine(room: RoomPayload | null, enabled: boolean, level: number) {
  const engineRef = useRef<AmbienceEngine | null>(null);
  const [status, setStatus] = useState<AmbienceStatus>("idle");
  const [eventPulse, setEventPulse] = useState(0);
  useEffect(() => {
    const engine = new AmbienceEngine();
    engineRef.current = engine;
    engine.setCallbacks(setStatus, () => setEventPulse((value) => value + 1));
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    void engineRef.current?.setProfile(room?.scene.slug ?? "none", room?.ambience ?? null);
  }, [room]);

  useEffect(() => engineRef.current?.setLevel(level), [level]);
  useEffect(() => engineRef.current?.setPlaying(enabled && level > 0), [enabled, level]);

  const resumeFromGesture = useCallback(
    () => engineRef.current?.resumeFromGesture() ?? Promise.resolve(),
    [],
  );

  return {
    enabled: true,
    status,
    eventPulse,
    active: enabled && level > 0 && status !== "unavailable",
    resumeFromGesture,
  };
}
