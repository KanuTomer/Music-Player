import type { Scene } from "./rooms.functions";

export const explorerFilters = ["all", "safar", "shaam", "kaam", "yaadein"] as const;

export type ExplorerFilter = (typeof explorerFilters)[number];

export type SceneSelectionAction = "close" | "enter" | "switch";

export function normalizeSceneSearch(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase();
}

export function filterScenes(scenes: Scene[], query: string, filter: ExplorerFilter): Scene[] {
  const normalizedQuery = normalizeSceneSearch(query);

  return scenes.filter((scene) => {
    if (filter !== "all" && !scene.tags.includes(filter)) return false;
    if (!normalizedQuery) return true;

    const searchable = [
      scene.title_en,
      scene.title_hi,
      scene.hook,
      scene.description ?? "",
      scene.region ?? "",
      ...scene.tags,
    ]
      .map(normalizeSceneSearch)
      .join(" ");

    return searchable.includes(normalizedQuery);
  });
}

export function sceneSelectionAction(
  selectedSlug: string,
  activeSlug: string | null,
  hasPlaybackSession: boolean,
): SceneSelectionAction {
  if (selectedSlug === activeSlug) return "close";
  return hasPlaybackSession ? "switch" : "enter";
}
