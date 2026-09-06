import { notFound, redirect } from "@tanstack/react-router";
import { getRoom, listScenes } from "./rooms.functions";
import { isAllowedSlug } from "./theme-data";

const retiredRedirects: Record<string, string> = {
  "doordarshan-shaam": "papa-ke-gaane",
  "raat-ki-bus": "bus-driver",
  "chai-ki-tapri": "bartan-time",
};

export function resolveRetiredRoomSlug(slug: string) {
  return retiredRedirects[slug] ?? null;
}

export async function loadRoomRoute(slug: string, cassette = false) {
  const replacement = resolveRetiredRoomSlug(slug);
  if (replacement) {
    throw redirect({
      to: cassette ? "/room/$slug/cassette" : "/room/$slug",
      params: { slug: replacement },
    });
  }
  if (!isAllowedSlug(slug)) throw notFound();
  const [room, allScenes] = await Promise.all([getRoom({ data: { slug } }), listScenes()]);
  if (!room) throw notFound();
  return { room, scenes: allScenes.filter((scene) => isAllowedSlug(scene.slug)) };
}
