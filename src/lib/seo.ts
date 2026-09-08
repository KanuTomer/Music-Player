export const BASE_OG_IMAGE = "/sainik-dhaba-og.jpg";
export const BASE_OG_IMAGE_ALT = "Sainik Dhaba — Highway dhaba with warm lights and chai";
export const BASE_OG_IMAGE_WIDTH = "1200";
export const BASE_OG_IMAGE_HEIGHT = "630";
export const BASE_OG_IMAGE_TYPE = "image/jpeg";

export const DEFAULT_SITE_URL = "https://sainikdhaba.com";
export const DEFAULT_TITLE =
  "Sainik Dhaba — Ambient Rooms from Everyday India | Retro Hindi Music & Sounds";
export const DEFAULT_DESCRIPTION =
  "An always-on radio for the places India grew up in — roadside dhabas, local salons, night buses, and chai tapris. Stream retro Hindi songs, ambient soundscapes, and everyday nostalgia.";
export const DEFAULT_KEYWORDS =
  "Sainik Dhaba, ambient Indian music, retro Hindi songs, 90s Bollywood radio, highway dhaba ambience, chai tapri sounds, Indian nostalgia, lo-fi radio India, salon radio, night bus Hindi songs, cassette player online";
export const DEFAULT_AUTHOR = "Sainik Dhaba";
export const DEFAULT_PUBLISHER = "Sainik Dhaba";

export function getSiteUrl(): string {
  const envUrl =
    (typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env as Record<string, string | undefined>)["VITE_SITE_URL"]
      : undefined) ||
    (typeof process !== "undefined" && process.env
      ? process.env["SITE_URL"] || process.env["VITE_SITE_URL"]
      : undefined) ||
    "";

  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return DEFAULT_SITE_URL;
}

export function getCanonicalUrl(path = "/"): string {
  const siteUrl = getSiteUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${cleanPath === "/" ? "" : cleanPath}`;
}

export function getFullImageUrl(imagePath = BASE_OG_IMAGE): string {
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  const siteUrl = getSiteUrl();
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return siteUrl ? `${siteUrl}${cleanPath}` : cleanPath;
}

export interface MetaOptions {
  title?: string;
  description?: string;
  keywords?: string | string[];
  author?: string;
  publisher?: string;
  image?: string;
  imageAlt?: string;
  type?: string;
  robots?: string;
  canonicalUrl?: string;
}

export function buildSeoMeta({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  author = DEFAULT_AUTHOR,
  publisher = DEFAULT_PUBLISHER,
  image = BASE_OG_IMAGE,
  imageAlt = BASE_OG_IMAGE_ALT,
  type = "website",
  robots,
  canonicalUrl,
}: MetaOptions = {}) {
  const imageUrl = getFullImageUrl(image);
  const keywordsContent = Array.isArray(keywords) ? keywords.join(", ") : keywords;
  const siteUrl = getSiteUrl();
  const pageUrl = canonicalUrl || siteUrl;

  const tags: Array<Record<string, string>> = [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: keywordsContent },
    { name: "author", content: author },
    { name: "publisher", content: publisher },
    { property: "og:site_name", content: "Sainik Dhaba" },
    { property: "og:type", content: type },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: imageUrl },
    { property: "og:image:secure_url", content: imageUrl },
    { property: "og:image:type", content: BASE_OG_IMAGE_TYPE },
    { property: "og:image:width", content: BASE_OG_IMAGE_WIDTH },
    { property: "og:image:height", content: BASE_OG_IMAGE_HEIGHT },
    { property: "og:image:alt", content: imageAlt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: imageUrl },
    { name: "twitter:image:alt", content: imageAlt },
  ];

  if (pageUrl) {
    tags.push({ property: "og:url", content: pageUrl });
  }

  if (author) {
    tags.push({ property: "article:author", content: author });
  }

  if (publisher) {
    tags.push({ property: "article:publisher", content: publisher });
  }

  if (robots) {
    tags.push({ name: "robots", content: robots });
  }

  return tags;
}
