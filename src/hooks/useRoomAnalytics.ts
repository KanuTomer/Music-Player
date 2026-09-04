import { useEffect, useRef } from "react";
import { recordRoomListening, recordRoomVisit } from "@/lib/rooms.functions";

function newVisitId(): string {
  return crypto.randomUUID();
}

export function useRoomAnalytics(sceneSlug: string, isPlaying: boolean) {
  const visitIdRef = useRef("");
  const lastSentAtRef = useRef<number | null>(null);
  const visitRegisteredRef = useRef(false);

  useEffect(() => {
    const id = newVisitId();
    visitIdRef.current = id;
    lastSentAtRef.current = null;
    visitRegisteredRef.current = false;
    void recordRoomVisit({ data: { visitId: id, sceneSlug } })
      .then(() => {
        if (visitIdRef.current === id) visitRegisteredRef.current = true;
      })
      .catch(() => undefined);
  }, [sceneSlug]);

  useEffect(() => {
    if (!isPlaying) {
      lastSentAtRef.current = null;
      return;
    }
    lastSentAtRef.current = Date.now();
    const flush = () => {
      const lastSentAt = lastSentAtRef.current;
      const visitId = visitIdRef.current;
      if (!lastSentAt || !visitId || !visitRegisteredRef.current) return;
      const now = Date.now();
      const seconds = Math.min(60, Math.floor((now - lastSentAt) / 1000));
      if (seconds < 1) return;
      lastSentAtRef.current = now;
      void recordRoomListening({ data: { visitId, sceneSlug, seconds } }).catch(() => undefined);
    };
    const interval = window.setInterval(() => {
      flush();
    }, 15_000);
    return () => {
      window.clearInterval(interval);
      flush();
    };
  }, [isPlaying, sceneSlug]);
}
