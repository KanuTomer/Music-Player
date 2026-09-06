import type { PlayerDisplay } from "./player-display";

const HEX_COLOR = /^#([0-9a-f]{6})$/i;

export function clampCassetteProgress(progress: number) {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(1, Math.max(0, progress));
}

export function cassetteTapeRadii(progress: number) {
  const normalized = clampCassetteProgress(progress);
  return {
    left: 82 + 68 * Math.sqrt(1 - normalized),
    right: 82 + 68 * Math.sqrt(normalized),
  };
}

export function cassetteReelRotationSeconds(tapeRadius: number) {
  const radius = Number.isFinite(tapeRadius) ? Math.min(150, Math.max(82, tapeRadius)) : 82;
  return (radius / 82) * 3.2;
}

export function cassettePrinted(value: string | undefined, fallback: string, limit: number) {
  const text = value?.trim() || fallback;
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}

export function cassetteHexRgb(value: string | undefined) {
  const match = value?.trim().match(HEX_COLOR);
  if (!match) return null;
  const hex = match[1]!;
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ] as const;
}

export function cassetteMixHex(
  value: string | undefined,
  target: readonly [number, number, number],
  amount: number,
) {
  const source = cassetteHexRgb(value) ?? ([214, 189, 128] as const);
  const mixed = source.map((channel, index) =>
    Math.round(channel + (target[index]! - channel) * amount),
  );
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function cassetteReadableInk(value: string | undefined) {
  const rgb = cassetteHexRgb(value) ?? ([214, 189, 128] as const);
  const linear = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  const luminance = linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
  return luminance < 0.31 ? "#f4e7c8" : "#2d1b12";
}

export function physicalCassetteLabels({
  jagah,
  display,
  transitioning,
}: {
  jagah: string;
  display: Pick<PlayerDisplay, "title" | "subtitle" | "status">;
  transitioning: boolean;
}) {
  const loading = transitioning || display.status === "loading";
  return {
    title: loading
      ? `${jagah} is loading…`
      : display.status === "unavailable"
        ? "Track unavailable"
        : display.title,
    artist: loading ? "Cassette tuning" : display.subtitle,
  };
}
