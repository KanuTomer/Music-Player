import { useCallback, useEffect, useRef, useState } from "react";
import { AmbienceEngine, type AmbienceStatus } from "@/lib/ambience";
import type { RoomPayload } from "@/lib/rooms.functions";

export function useAmbienceEngine(room: RoomPayload | null, playing: boolean, level: number) {
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
  useEffect(() => engineRef.current?.setPlaying(playing && level > 0), [level, playing]);

  const resumeFromGesture = useCallback(
    () => engineRef.current?.resumeFromGesture() ?? Promise.resolve(),
    [],
  );

  return {
    enabled: true,
    status,
    eventPulse,
    active: playing && level > 0 && status !== "unavailable",
    resumeFromGesture,
  };
}
