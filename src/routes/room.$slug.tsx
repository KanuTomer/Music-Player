import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { getRoom, listScenes } from "@/lib/rooms.functions";
import { RoomExperience } from "@/components/room/RoomExperience";

export const Route = createFileRoute("/room/$slug")({
  loader: async ({ params }) => {
    const [room, scenes] = await Promise.all([
      getRoom({ data: { slug: params.slug } }),
      listScenes(),
    ]);
    if (!room) throw notFound();
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
    const title = `${scene.title_hi} / ${scene.title_en} — Sainik Dhaba`;
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
  return <RoomExperience key={room.scene.slug} room={room} scenes={scenes} />;
}

function RoomNotFound() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <Heart className="size-6 text-primary" aria-hidden />
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
