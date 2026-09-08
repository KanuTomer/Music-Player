import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSeoMeta,
  getCanonicalUrl,
  getSiteUrl,
  DEFAULT_SITE_URL,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_AUTHOR,
  DEFAULT_PUBLISHER,
} from "./seo.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");

test("getSiteUrl returns configured default site URL when env is empty", () => {
  const url = getSiteUrl();
  assert.equal(url, DEFAULT_SITE_URL);
});

test("getCanonicalUrl produces valid absolute URLs", () => {
  assert.equal(getCanonicalUrl("/"), "https://sainikdhaba.com");
  assert.equal(getCanonicalUrl("/room/sainik-dhaba"), "https://sainikdhaba.com/room/sainik-dhaba");
});

test("buildSeoMeta generates all required meta tags including title, description, keywords, author, publisher", () => {
  const tags = buildSeoMeta();

  // Check title
  const titleTag = tags.find((t) => "title" in t);
  assert.ok(titleTag, "Should have a title tag");
  assert.equal(titleTag.title, DEFAULT_TITLE);

  // Helper to find by name or property
  const findMeta = (nameOrProp: string) =>
    tags.find((t) => t.name === nameOrProp || t.property === nameOrProp);

  // Check description
  const descTag = findMeta("description");
  assert.ok(descTag, "Should have description tag");
  assert.equal(descTag.content, DEFAULT_DESCRIPTION);

  // Check keywords
  const keywordsTag = findMeta("keywords");
  assert.ok(keywordsTag, "Should have keywords tag");
  assert.equal(keywordsTag.content, DEFAULT_KEYWORDS);

  // Check author
  const authorTag = findMeta("author");
  assert.ok(authorTag, "Should have author tag");
  assert.equal(authorTag.content, DEFAULT_AUTHOR);

  // Check publisher
  const publisherTag = findMeta("publisher");
  assert.ok(publisherTag, "Should have publisher tag");
  assert.equal(publisherTag.content, DEFAULT_PUBLISHER);

  // Check OpenGraph tags
  assert.equal(findMeta("og:title")?.content, DEFAULT_TITLE);
  assert.equal(findMeta("og:description")?.content, DEFAULT_DESCRIPTION);
  assert.equal(findMeta("og:site_name")?.content, "Sainik Dhaba");
  assert.ok(findMeta("og:image")?.content.startsWith("https://sainikdhaba.com/"));

  // Check Twitter tags
  assert.equal(findMeta("twitter:card")?.content, "summary_large_image");
  assert.equal(findMeta("twitter:title")?.content, DEFAULT_TITLE);
  assert.equal(findMeta("twitter:description")?.content, DEFAULT_DESCRIPTION);
});

test("buildSeoMeta allows custom keywords, author, publisher, and robots override", () => {
  const custom = buildSeoMeta({
    title: "Custom Title",
    description: "Custom Description",
    keywords: ["retro", "radio", "indian music"],
    author: "Custom Author",
    publisher: "Custom Publisher",
    robots: "noindex, nofollow",
    canonicalUrl: "https://sainikdhaba.com/custom",
  });

  const findMeta = (nameOrProp: string) =>
    custom.find((t) => t.name === nameOrProp || t.property === nameOrProp);

  assert.equal(findMeta("keywords")?.content, "retro, radio, indian music");
  assert.equal(findMeta("author")?.content, "Custom Author");
  assert.equal(findMeta("publisher")?.content, "Custom Publisher");
  assert.equal(findMeta("robots")?.content, "noindex, nofollow");
  assert.equal(findMeta("og:url")?.content, "https://sainikdhaba.com/custom");
});

test("public/robots.txt exists and includes Sitemap reference and crawler directives", () => {
  const robotsPath = path.join(ROOT_DIR, "public", "robots.txt");
  assert.ok(fs.existsSync(robotsPath), "public/robots.txt must exist");
  const content = fs.readFileSync(robotsPath, "utf8");

  assert.ok(content.includes("Sitemap: https://sainikdhaba.com/sitemap.xml"), "Must reference sitemap.xml");
  assert.ok(content.includes("Disallow: /admin"), "Must disallow /admin");
  assert.ok(content.includes("Disallow: /generate"), "Must disallow /generate");
  assert.ok(content.includes("Disallow: /room/*/cassette"), "Must disallow secret cassette player");
});

test("public/sitemap.xml exists and is valid XML containing all active rooms", () => {
  const sitemapPath = path.join(ROOT_DIR, "public", "sitemap.xml");
  assert.ok(fs.existsSync(sitemapPath), "public/sitemap.xml must exist");
  const content = fs.readFileSync(sitemapPath, "utf8");

  assert.ok(content.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), "Must have XML declaration");
  assert.ok(content.includes("<urlset"), "Must have urlset element");
  assert.ok(content.includes("https://sainikdhaba.com/</loc>"), "Must include root URL");

  const requiredSlugs = [
    "sainik-dhaba",
    "nai-ki-dukaan",
    "corporate-majdoor",
    "bus-driver",
    "bartan-time",
    "raj-mistri",
    "papa-ke-gaane",
  ];

  for (const slug of requiredSlugs) {
    assert.ok(
      content.includes(`https://sainikdhaba.com/room/${slug}</loc>`),
      `Sitemap must include /room/${slug}`,
    );
  }
});
