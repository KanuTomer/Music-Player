export type ThemeInfo = {
  slug: AllowedSlug;
  displayName: string;
};

/** The only seven Jagahs surfaced in the application. */
export const ALLOWED_SLUGS = [
  "nai-ki-dukaan",
  "corporate-majdoor",
  "bus-driver",
  "bartan-time",
  "raj-mistri",
  "sainik-dhaba",
  "papa-ke-gaane",
] as const;

export type AllowedSlug = (typeof ALLOWED_SLUGS)[number];

export const themeMap: Record<AllowedSlug, ThemeInfo> = {
  "nai-ki-dukaan": { slug: "nai-ki-dukaan", displayName: "Deluxe Salon" },
  "corporate-majdoor": {
    slug: "corporate-majdoor",
    displayName: "Corporate Majdoor",
  },
  "bus-driver": { slug: "bus-driver", displayName: "Bus Driver" },
  "bartan-time": { slug: "bartan-time", displayName: "Bartan Time" },
  "raj-mistri": { slug: "raj-mistri", displayName: "Raju Mistri" },
  "sainik-dhaba": { slug: "sainik-dhaba", displayName: "Sainik Dhaba" },
  "papa-ke-gaane": { slug: "papa-ke-gaane", displayName: "Papa Ke Gaane" },
};

export function isAllowedSlug(slug: string): slug is AllowedSlug {
  return (ALLOWED_SLUGS as readonly string[]).includes(slug);
}

export function getThemeInfo(slug: string): ThemeInfo | null {
  if (!isAllowedSlug(slug)) return null;
  return themeMap[slug];
}
