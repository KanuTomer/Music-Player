export type PlaylistLifecycleAction = "build" | "wait" | "control";
export type PlayerErrorAction = "ignore" | "advance";

export function playlistLifecycleAction({
  requestedPlaylistId,
  loadedPlaylistId,
  hasPlayer,
  isReady,
}: {
  requestedPlaylistId: string;
  loadedPlaylistId: string | null;
  hasPlayer: boolean;
  isReady: boolean;
}): PlaylistLifecycleAction {
  if (!hasPlayer || loadedPlaylistId !== requestedPlaylistId) return "build";
  return isReady ? "control" : "wait";
}

export function playerErrorAction({
  eventGeneration,
  currentGeneration,
  isCurrentTarget,
  alreadyHandled,
}: {
  eventGeneration: number;
  currentGeneration: number;
  isCurrentTarget: boolean;
  alreadyHandled: boolean;
}): PlayerErrorAction {
  if (eventGeneration !== currentGeneration || !isCurrentTarget || alreadyHandled) {
    return "ignore";
  }
  return "advance";
}
