import { useEffect, useState } from "react";
import type { Scene } from "@/lib/rooms.functions";

export function useLiveScenes(initialScenes: Scene[]) {
  const [scenes, setScenes] = useState(initialScenes);

  useEffect(() => setScenes(initialScenes), [initialScenes]);

  return scenes;
}
