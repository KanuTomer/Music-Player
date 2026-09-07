export const BACKGROUND_SOURCE_LIMIT = 15 * 1024 * 1024;
export const BACKGROUND_PLAYBACK_LIMIT = 5 * 1024 * 1024;
export const BACKGROUND_MAX_EDGE = 2560;
export const LIGHT_SCENE_TEXT = "#FFF3D6";
export const DARK_SCENE_TEXT = "#20160F";
export const BACKGROUND_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export function validateBackgroundSource(file: { type: string; size: number }) {
  if (!BACKGROUND_MIME_TYPES.includes(file.type as (typeof BACKGROUND_MIME_TYPES)[number])) {
    throw new Error("Choose a JPEG, PNG, WebP, or AVIF image");
  }
  if (file.size > BACKGROUND_SOURCE_LIMIT)
    throw new Error("The original image must be 15 MiB or smaller");
}

export function effectLabel(value: string | null | undefined) {
  return value?.trim() || "Jagah ki awaaz sunao 🔊";
}

export function normalizeHexColor(value: string) {
  const text = value.trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(text)) throw new Error("Choose a valid six-digit color");
  return text;
}

function srgbChannel(value: number) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function luminanceFromRgb(red: number, green: number, blue: number) {
  return 0.2126 * srgbChannel(red) + 0.7152 * srgbChannel(green) + 0.0722 * srgbChannel(blue);
}

export function hexLuminance(color: string) {
  const hex = normalizeHexColor(color).slice(1);
  return luminanceFromRgb(
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  );
}

export function isLightTextColor(color: string) {
  return hexLuminance(color) > 0.45;
}

export function sceneTextShadow(color: string) {
  // Tight offset shadows that simulate a crisp outline rather than a blurry glow
  const c = isLightTextColor(color) ? "0,0,0" : "255,248,232";
  return [
    `-1px -1px 0 rgba(${c},.9)`,
    ` 1px -1px 0 rgba(${c},.9)`,
    `-1px  1px 0 rgba(${c},.9)`,
    ` 1px  1px 0 rgba(${c},.9)`,
    ` 0    2px 0 rgba(${c},.7)`,
    ` 0   -2px 0 rgba(${c},.7)`,
    ` 2px  0   0 rgba(${c},.7)`,
    `-2px  0   0 rgba(${c},.7)`,
  ].join(",");
}

/** Returns inline-style properties for `-webkit-text-stroke` outline. */
export function sceneTextStroke(color: string) {
  const strokeColor = isLightTextColor(color)
    ? "rgba(0,0,0,0.65)"
    : "rgba(255,248,232,0.65)";
  return {
    WebkitTextStroke: `1.5px ${strokeColor}`,
    paintOrder: "stroke fill" as const,
  };
}

export function chooseReadableTextColor(backgroundLuminances: number[]) {
  if (!backgroundLuminances.length) return LIGHT_SCENE_TEXT;
  const contrast = (foreground: number, background: number) =>
    (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  const worstContrast = (color: string) => {
    const foreground = hexLuminance(color);
    return Math.min(...backgroundLuminances.map((background) => contrast(foreground, background)));
  };
  return worstContrast(DARK_SCENE_TEXT) > worstContrast(LIGHT_SCENE_TEXT)
    ? DARK_SCENE_TEXT
    : LIGHT_SCENE_TEXT;
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("This browser cannot create WebP images")),
      "image/webp",
      quality,
    );
  });
}

function suggestedColorFromCanvas(source: CanvasImageSource, width: number, height: number) {
  const sample = document.createElement("canvas");
  sample.width = 160;
  sample.height = 90;
  const context = sample.getContext("2d", { willReadFrequently: true });
  if (!context) return LIGHT_SCENE_TEXT;
  const scale = Math.max(sample.width / width, sample.height / height);
  const drawnWidth = width * scale;
  const drawnHeight = height * scale;
  context.drawImage(
    source,
    (sample.width - drawnWidth) / 2,
    (sample.height - drawnHeight) / 2,
    drawnWidth,
    drawnHeight,
  );
  const luminances: number[] = [];
  for (const [x, y, regionWidth, regionHeight] of [
    [20, 4, 120, 38],
    [35, 61, 90, 24],
  ] as const) {
    const pixels = context.getImageData(x, y, regionWidth, regionHeight).data;
    for (let index = 0; index < pixels.length; index += 32) {
      if ((pixels[index + 3] ?? 0) < 128) continue;
      luminances.push(
        luminanceFromRgb(pixels[index] ?? 0, pixels[index + 1] ?? 0, pixels[index + 2] ?? 0),
      );
    }
  }
  return chooseReadableTextColor(luminances);
}

export async function suggestTextColorFromImageUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to read the current background");
  const bitmap = await createImageBitmap(await response.blob());
  try {
    return suggestedColorFromCanvas(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

export type PreparedBackground = {
  blob: Blob;
  width: number;
  height: number;
  suggestedTextColor: string;
};

export async function prepareBackgroundImage(file: File): Promise<PreparedBackground> {
  validateBackgroundSource(file);

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, BACKGROUND_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * scale));
    let height = Math.max(1, Math.round(bitmap.height * scale));
    const suggestedTextColor = suggestedColorFromCanvas(bitmap, bitmap.width, bitmap.height);
    let quality = 0.88;
    let blob: Blob | null = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image processing is unavailable in this browser");
      context.drawImage(bitmap, 0, 0, width, height);
      blob = await canvasBlob(canvas, quality);
      if (blob.size <= BACKGROUND_PLAYBACK_LIMIT) break;
      quality = Math.max(0.68, quality - 0.05);
      width = Math.max(1, Math.round(width * 0.9));
      height = Math.max(1, Math.round(height * 0.9));
    }
    if (!blob || blob.size > BACKGROUND_PLAYBACK_LIMIT) {
      throw new Error("The optimized WebP is still larger than 5 MiB; choose a smaller image");
    }
    return { blob, width, height, suggestedTextColor };
  } finally {
    bitmap.close();
  }
}
