export type AnalyticsRange = "7d" | "30d" | "all";

export type ComparableAnalytics = {
  sceneId: string;
  title: string;
  listeningSeconds: number;
};

export function analyticsSince(range: AnalyticsRange, now = new Date()): string | undefined {
  if (range === "all") return undefined;
  const days = range === "7d" ? 7 : 30;
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

export function retainComparedSceneIds(
  previous: string[],
  availableSceneIds: string[],
  fallbackSceneId: string | undefined,
): string[] {
  const available = new Set(availableSceneIds);
  const valid = previous.filter((id) => available.has(id));
  return valid.length
    ? valid
    : fallbackSceneId && available.has(fallbackSceneId)
      ? [fallbackSceneId]
      : [];
}

export function sortComparedAnalytics<T extends ComparableAnalytics>(
  rows: T[],
  sceneIds: string[],
): T[] {
  const selected = new Set(sceneIds);
  return rows
    .filter((row) => selected.has(row.sceneId))
    .sort(
      (left, right) =>
        right.listeningSeconds - left.listeningSeconds || left.title.localeCompare(right.title),
    );
}

export function toggleSelectedId(selected: string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
}

export function toggleAllIds(selected: string[], available: string[]): string[] {
  const allSelected = available.length > 0 && available.every((id) => selected.includes(id));
  return allSelected ? [] : [...available];
}
