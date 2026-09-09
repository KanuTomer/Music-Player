import type { NowPlaying } from "./player";
import type { QueueItem } from "./rooms.functions";

const NOISE =
  /\b(official\s*(music\s*)?(video|audio|lyrical|lyric)?|full\s*(video\s*)?song|lyrical(\s*video)?|hd|4k|remastered|audio|video song|with lyrics)\b/gi;

function titleParts(raw: string | null) {
  if (!raw) return [];
  return raw
    .split(/[|｜–—]/)
    .map((part) =>
      part
        .replace(NOISE, "")
        .replace(/[[\]()]/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

export function readableTitle(raw: string | null) {
  const parts = titleParts(raw);
  return parts[0] ?? raw?.trim() ?? null;
}

export function readableSubtitle(raw: string | null, channel: string | null) {
  const rest = titleParts(raw)
    .slice(1)
    .filter((part) => part.length > 1)
    .slice(0, 2);
  return rest.length ? rest.join(" · ") : channel;
}

export function clock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function normalizeAmbienceLevel(level: number) {
  if (!Number.isFinite(level)) return 65;
  return Math.min(100, Math.max(0, Math.round(level)));
}

export function nextAmbienceToggle(enabled: boolean, level: number) {
  const nextEnabled = !enabled;
  return {
    enabled: nextEnabled,
    level: nextEnabled && normalizeAmbienceLevel(level) === 0 ? 65 : normalizeAmbienceLevel(level),
  };
}

export type LiveEqualizerPresentation = {
  label: string;
  mode: "loading" | "paused" | "playing";
  width: "4.25rem" | "5.4rem" | "6rem";
};

export function getLiveEqualizerPresentation(
  isPlaying: boolean,
  status: string,
): LiveEqualizerPresentation {
  if (status === "loading") return { mode: "loading", label: "ट्यून", width: "4.25rem" };
  if (isPlaying) return { mode: "playing", label: "बज रहा है", width: "6rem" };
  return { mode: "paused", label: "रोक दिया", width: "5.4rem" };
}

export type PlayerDisplay = {
  title: string;
  subtitle: string;
  coverId: string | null;
  status: "loading" | "unavailable" | "ready";
};

export function getPlayerDisplay({
  nowPlaying,
  track,
  musicBlocked,
}: {
  nowPlaying: NowPlaying;
  track: QueueItem["track"] | null;
  musicBlocked: boolean;
}): PlayerDisplay {
  const title = track?.title ?? readableTitle(nowPlaying.title) ?? "Tuning in…";
  const subtitle =
    [track?.artist, track?.year].filter(Boolean).join(" · ") ||
    readableSubtitle(nowPlaying.title, nowPlaying.channel) ||
    "गीत की जानकारी आ रही है…";
  const coverId = nowPlaying.videoId;
  const status = musicBlocked ? "unavailable" : nowPlaying.videoId ? "ready" : "loading";

  return { title, subtitle, coverId, status };
}
