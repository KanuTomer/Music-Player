export function sameAdminDraft(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function hasAdminDraftChanges(input: {
  songInput: string;
  songDraftCount: number;
  songEditChanged: boolean;
  ambienceChanged: boolean;
}): boolean {
  return Boolean(
    input.songInput.trim() ||
    input.songDraftCount ||
    input.songEditChanged ||
    input.ambienceChanged,
  );
}
