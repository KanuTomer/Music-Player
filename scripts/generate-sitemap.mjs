import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const SITEMAP_PATH = path.join(ROOT_DIR, "public", "sitemap.xml");

const SITE_URL = process.env.VITE_SITE_URL || process.env.SITE_URL || "https://sainikdhaba.com";
const BASE_URL = SITE_URL.replace(/\/$/, "");

// 7 official active themes from src/lib/theme-data.ts
const ROOM_SLUGS = [
  "sainik-dhaba",
  "nai-ki-dukaan",
  "corporate-majdoor",
  "bus-driver",
  "bartan-time",
  "raj-mistri",
  "papa-ke-gaane",
];

const today = new Date().toISOString().split("T")[0];

const urls = [
  {
    loc: `${BASE_URL}/`,
    lastmod: today,
    changefreq: "daily",
    priority: "1.0",
  },
  ...ROOM_SLUGS.map((slug) => ({
    loc: `${BASE_URL}/room/${slug}`,
    lastmod: today,
    changefreq: "weekly",
    priority: slug === "sainik-dhaba" ? "0.9" : "0.8",
  })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

fs.writeFileSync(SITEMAP_PATH, xml, "utf8");
console.log(`Successfully generated ${SITEMAP_PATH} with ${urls.length} URLs.`);
