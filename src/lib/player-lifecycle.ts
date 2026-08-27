export type PlaylistLifecycleAction = "build" | "wait" | "control";

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
