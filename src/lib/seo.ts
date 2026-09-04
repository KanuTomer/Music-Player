export const BASE_OG_IMAGE = "/sainik-dhaba-og.jpg";
export const BASE_OG_IMAGE_ALT = "Sainik Dhaba — Highway dhaba with warm lights and chai";
export const BASE_OG_IMAGE_WIDTH = "1200";
export const BASE_OG_IMAGE_HEIGHT = "630";
export const BASE_OG_IMAGE_TYPE = "image/jpeg";

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
  return "";
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
  image?: string;
  imageAlt?: string;
  type?: string;
  robots?: string;
}

export function buildSeoMeta({
  title = "Sainik Dhaba — ambient rooms from everyday India",
  description = "An always-on radio for the places India grew up in — barbershops, night buses, railway platforms. Press play and sit there a while.",
  image = BASE_OG_IMAGE,
  imageAlt = BASE_OG_IMAGE_ALT,
  type = "website",
  robots,
}: MetaOptions = {}) {
  const imageUrl = getFullImageUrl(image);

  const tags = [
    { title },
    { name: "description", content: description },
    { name: "author", content: "Sainik Dhaba" },
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

  if (robots) {
    tags.push({ name: "robots", content: robots });
  }

  return tags;
}
