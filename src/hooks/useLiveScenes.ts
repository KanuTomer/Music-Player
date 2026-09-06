import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listScenes, type Scene } from "@/lib/rooms.functions";

export function useLiveScenes(initialScenes: Scene[]) {
  const [scenes, setScenes] = useState(initialScenes);

  useEffect(() => setScenes(initialScenes), [initialScenes]);

  useEffect(() => {
    const channel = supabase
      .channel("live-scene-presentation")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "scenes" },
        () =>
          void listScenes()
            .then(setScenes)
            .catch(() => undefined),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return scenes;
}
