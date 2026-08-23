/** Resolve a search phrase to a playable YouTube video id by scraping results HTML. */
export async function resolveYouTubeId(query: string): Promise<string | null> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    query,
  )}&sp=EgIQAQ%253D%253D`;
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const seen = new Set<string>();
    const re = /"videoId":"([A-Za-z0-9_-]{11})"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      const id = m[1]!;
      if (!seen.has(id)) seen.add(id);
      if (seen.size >= 1) break;
    }
    return [...seen][0] ?? null;
  } catch {
    return null;
  }
}
