import { createFileRoute, Link } from "@tanstack/react-router";
import { DoorClosed } from "lucide-react";
import { RoomExperience } from "@/components/room/RoomExperience";
import { buildSeoMeta, getCanonicalUrl } from "@/lib/seo";
import { loadRoomRoute } from "@/lib/room-route";
import { RoomRouteError } from "@/components/room/RoomRouteError";

export const Route = createFileRoute("/room/$slug/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { song?: string | undefined; track?: string | undefined } => {
    return {
      song: typeof search["song"] === "string" ? search["song"] : undefined,
      track: typeof search["track"] === "string" ? search["track"] : undefined,
    };
  },
  loader: ({ params }) => loadRoomRoute(params.slug),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: buildSeoMeta({
          title: "Room unavailable — Sainik Dhaba",
          robots: "noindex, nofollow",
        }),
      };
    }
    const { scene } = loaderData.room;
    const title = `Sainik Dhaba · ${scene.title_en} 📻 — Ambient Music & Atmosphere`;
    const canonicalUrl = getCanonicalUrl(`/room/${scene.slug}`);
    const keywords = [
      "Sainik Dhaba",
      scene.title_en,
      scene.title_hi,
      "Indian ambient room",
      "retro Hindi music",
      "ambient radio",
      "nostalgia soundscape",
      "lo-fi India",
    ].filter(Boolean) as string[];

    return {
      links: [{ rel: "canonical", href: canonicalUrl }],
      meta: buildSeoMeta({
        title,
        description:
          scene.hook ||
          `Sit inside ${scene.title_en} on Sainik Dhaba. Continuous retro Hindi music, ambient soundscapes, and everyday nostalgia.`,
        keywords,
        canonicalUrl,
        imageAlt: `Sainik Dhaba — ${scene.title_en}`,
      }),
    };
  },
  component: RoomPage,
  notFoundComponent: RoomNotFound,
  errorComponent: RoomRouteError,
});

function RoomPage() {
  const { room, scenes } = Route.useLoaderData();
  const search = Route.useSearch();
  const initialTrackId = search.song || search.track;
  return (
    <div className="h-dvh bg-night">
      <RoomExperience
        key={room.scene.slug}
        room={room}
        scenes={scenes}
        initialTrackId={initialTrackId}
      />
    </div>
  );
}

function RoomNotFound() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <DoorClosed className="size-6 text-primary" aria-hidden />
      <p className="font-signage text-xl font-bold">Ye kamra band hai</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        This room does not exist — maybe it was remixed away.
      </p>
      <Link
        to="/"
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Wapas dhaba
      </Link>
    </div>
  );
}
