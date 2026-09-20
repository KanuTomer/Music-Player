const SCENE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function sceneChatRoomKey(sceneSlug: string): string {
  const normalized = sceneSlug.trim();
  if (!SCENE_SLUG.test(normalized)) throw new Error("Invalid scene slug");
  return `scene:${normalized}`;
}

export function isSceneChatRoomKey(roomKey: string): boolean {
  return /^scene:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(roomKey);
}
