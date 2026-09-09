import { createFileRoute } from "@tanstack/react-router";
import { SecretCassetteExperience } from "@/components/room/SecretCassetteExperience";
import { loadRoomRoute } from "@/lib/room-route";
import { buildSeoMeta } from "@/lib/seo";
import { RoomRouteError } from "@/components/room/RoomRouteError";

export const Route = createFileRoute("/room/$slug/cassette")({
  loader: ({ params }) => loadRoomRoute(params.slug, true),
  head: ({ loaderData }) => ({
    meta: buildSeoMeta({
      title: loaderData
        ? `${loaderData.room.scene.title_en} cassette — Sainik Dhaba`
        : "Cassette unavailable — Sainik Dhaba",
      description: "A hidden cassette player inside Sainik Dhaba.",
      robots: "noindex, nofollow",
    }),
  }),
  component: CassettePage,
  errorComponent: RoomRouteError,
});

function CassettePage() {
  const { room, scenes } = Route.useLoaderData();
  return <SecretCassetteExperience room={room} scenes={scenes} />;
}
