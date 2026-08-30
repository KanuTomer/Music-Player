import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { DoorClosed } from "lucide-react";
import { getRoom, listScenes } from "@/lib/rooms.functions";
import { RoomExperience } from "@/components/room/RoomExperience";
import { isAllowedSlug } from "@/lib/theme-data";

export const Route = createFileRoute("/room/$slug")({
  loader: async ({ params }) => {
    const retiredRedirects: Record<string, string> = {
      "doordarshan-shaam": "papa-ke-gaane",
      "raat-ki-bus": "bus-driver",
      "chai-ki-tapri": "bartan-time",
    };

    if (params.slug in retiredRedirects) {
      throw redirect({
        to: "/room/$slug",
        params: { slug: retiredRedirects[params.slug] },
      });
    }

    // Check if the requested slug is one of the 7 allowed themes
    if (!isAllowedSlug(params.slug)) {
      throw notFound();
    }

    const [room, allScenes] = await Promise.all([
      getRoom({ data: { slug: params.slug } }),
      listScenes(),
    ]);
    if (!room) throw notFound();

    // Filter scenes list to only include allowed ones
    const scenes = allScenes.filter((scene) => isAllowedSlug(scene.slug));

    return { room, scenes };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Room unavailable — Sainik Dhaba" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { scene } = loaderData.room;
    const title = `Sainik Dhaba · ${scene.title_en} 📻`;
    return {
      meta: [
        { title },
        { name: "description", content: scene.hook },
        { property: "og:title", content: title },
        { property: "og:description", content: scene.hook },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: RoomPage,
  notFoundComponent: RoomNotFound,
  errorComponent: RoomError,
});

function RoomPage() {
  const { room, scenes } = Route.useLoaderData();
  return (
    <div className="h-dvh bg-night">
      <RoomExperience key={room.scene.slug} room={room} scenes={scenes} />
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

function RoomError() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="font-signage text-xl font-bold">Line kat gayi</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Kamra load nahi hua. Ek baar phir koshish karein?
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Retry
      </button>
    </div>
  );
}
