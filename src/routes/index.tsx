import { createFileRoute } from "@tanstack/react-router";
import { getRoom, listScenes } from "@/lib/rooms.functions";
import { RoomExperience } from "@/components/room/RoomExperience";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_SLUG = "sainik-dhaba";

const TITLE = "Sainik Dhaba — always-on ambience from the India we grew up in";
const DESC =
  "Sit inside a highway dhaba, a deluxe salon, a chai ki tapri or a night bus. Hindi songs, ambient sound and in-character chatter — no signup.";

export const Route = createFileRoute("/")({
  loader: async () => {
    const scenes = await listScenes();
    const slug = scenes.some((s) => s.slug === DEFAULT_SLUG)
      ? DEFAULT_SLUG
      : (scenes[0]?.slug ?? DEFAULT_SLUG);
    const room = await getRoom({ data: { slug } });
    return { room, scenes };
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: Home,
  pendingComponent: HomeSkeleton,
  errorComponent: HomeError,
});

function Home() {
  const { room, scenes } = Route.useLoaderData();
  if (!room) return <HomeError />;
  return <RoomExperience key={room.scene.slug} room={room} scenes={scenes} />;
}

function HomeSkeleton() {
  return (
    <div className="h-dvh w-full overflow-hidden p-0">
      <Skeleton className="size-full rounded-none" />
    </div>
  );
}

function HomeError() {
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
