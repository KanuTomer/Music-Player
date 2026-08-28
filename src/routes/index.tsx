import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Compass, Heart, Lightbulb, Play } from "lucide-react";
import { getRoom, listScenes } from "@/lib/rooms.functions";
import { artFor } from "@/lib/scene-art";
import { videoForScene } from "@/lib/scene-media";
import { usePlayer } from "@/lib/player";
import { JagahExplorer } from "@/components/JagahExplorer";
import { InfoPlaceholderDialog } from "@/components/InfoPlaceholderDialog";
import { CompactCassettePlayer } from "@/components/player/CassettePlayers";
import { ISTClock } from "@/components/ISTClock";
import { Skeleton } from "@/components/ui/skeleton";
import { useJagahNavigation } from "@/hooks/useJagahNavigation";

const TITLE = "Sainik Dhaba — always-on ambience from the India we grew up in";
const DESC =
  "Sit inside a highway dhaba, a deluxe salon, a chai ki tapri or a night bus. Hindi film songs, moving scenes and in-character chatter — no signup.";

export const Route = createFileRoute("/")({
  loader: async () => {
    const scenes = await listScenes();
    const featured = scenes[0] ?? null;
    const room = featured ? await getRoom({ data: { slug: featured.slug } }) : null;
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
      { name: "twitter:description", content: DESC },
    ],
  }),
  component: Home,
  pendingComponent: HomeSkeleton,
  errorComponent: HomeError,
});

function Home() {
  const { room, scenes } = Route.useLoaderData();
  const navigate = useNavigate();
  const player = usePlayer();
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [dialog, setDialog] = useState<"suggest" | "support" | null>(null);
  const activeSlug = player.room?.scene.slug ?? null;
  const { selectScene, switchingSlug } = useJagahNavigation({
    activeSlug,
    closeExplorer: () => setExplorerOpen(false),
  });

  if (!room) return <HomeError />;
  const { scene } = room;
  const sceneVideo = videoForScene(scene.slug);

  const playFeatured = () => {
    player.openRoom(room);
    player.start();
    void navigate({ to: "/room/$slug", params: { slug: scene.slug } });
  };

  return (
    <div className="dark flex h-dvh flex-col overflow-hidden bg-night text-cream">
      <main className="relative min-h-0 flex-1 overflow-hidden">
        {sceneVideo ? (
          <video
            src={sceneVideo}
            poster={artFor(scene.art_key)}
            autoPlay
            muted
            loop
            playsInline
            aria-label={`${scene.title_en} — featured moving scene`}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <img
            src={artFor(scene.art_key)}
            alt={`${scene.title_en} — ${scene.hook}`}
            width={1536}
            height={1024}
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover"
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-r from-night via-night/72 to-night/15"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-night/85 via-transparent to-night/65"
          aria-hidden
        />
        <div className="vignette pointer-events-none absolute inset-0" aria-hidden />

        <header className="relative z-20 mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5">
          <a href="#featured" className="min-w-0">
            <span className="block font-deva text-xl leading-none font-bold text-cream sm:text-2xl">
              सैनिक ढाबा
            </span>
            <span className="mt-1 block text-[9px] font-semibold tracking-[0.24em] text-cream/55 uppercase">
              Sainik Dhaba
            </span>
          </a>
          <nav className="flex items-center gap-2" aria-label="Main navigation">
            <button
              type="button"
              aria-label="Open Jagah Explorer"
              onClick={() => setExplorerOpen(true)}
              className="flex min-h-11 items-center gap-2 rounded-full border border-cream/20 bg-charcoal/55 px-4 text-sm font-semibold text-cream backdrop-blur transition-colors hover:bg-charcoal/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
            >
              <Compass className="size-4" aria-hidden />
              <span className="hidden sm:inline">Jagah Explorer</span>
              <span className="sm:hidden">Explore</span>
            </button>
            <ISTClock
              inherit
              className="hidden rounded-full border border-cream/15 bg-charcoal/45 px-3 py-2.5 text-cream/60 backdrop-blur md:flex"
            />
          </nav>
        </header>

        <section
          id="featured"
          className="relative z-10 mx-auto flex h-[calc(100%-5rem)] w-full max-w-[1440px] items-end px-5 pb-8 sm:items-center sm:px-10 sm:pb-12 lg:px-16"
        >
          <div className="max-w-xl">
            <p className="mb-3 text-[10px] font-bold tracking-[0.28em] text-ember uppercase sm:text-xs">
              Featured Jagah · {scene.region ?? scene.category}
            </p>
            <h1 className="font-deva text-5xl leading-[0.95] font-bold text-cream sm:text-7xl">
              {scene.title_hi}
            </h1>
            <p className="mt-2 font-signage text-xl font-semibold text-cream sm:text-2xl">
              {scene.title_en}
            </p>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-cream/72 sm:text-base">
              {scene.hook}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={playFeatured}
                className="flex min-h-12 items-center gap-2 rounded-full bg-ember px-6 text-sm font-bold text-charcoal shadow-lift transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream active:scale-95"
              >
                <Play className="size-4 fill-current" aria-hidden /> Play this Jagah
              </button>
              <button
                type="button"
                onClick={() => setExplorerOpen(true)}
                className="flex min-h-12 items-center gap-2 rounded-full border border-cream/25 bg-charcoal/40 px-5 text-sm font-semibold text-cream backdrop-blur hover:bg-charcoal/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
              >
                <Compass className="size-4" aria-hidden /> Explore all Jagahs
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-cream/65">
              <button
                type="button"
                onClick={() => setDialog("suggest")}
                className="flex min-h-11 items-center gap-2 underline-offset-4 hover:text-cream hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
              >
                <Lightbulb className="size-4" aria-hidden /> Suggest a Jagah
              </button>
              <button
                type="button"
                onClick={() => setDialog("support")}
                className="flex min-h-11 items-center gap-2 underline-offset-4 hover:text-cream hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
              >
                <Heart className="size-4" aria-hidden /> Support Us
              </button>
            </div>
          </div>
        </section>
      </main>

      {player.room && !explorerOpen ? (
        <CompactCassettePlayer className="shrink-0 rounded-none border-x-0 border-b-0" />
      ) : null}

      <JagahExplorer
        scenes={scenes}
        activeSlug={activeSlug}
        open={explorerOpen}
        onOpenChange={setExplorerOpen}
        onSelect={selectScene}
        onPlaceholder={setDialog}
        switchingSlug={switchingSlug}
      />
      <InfoPlaceholderDialog
        kind="suggest"
        open={dialog === "suggest"}
        onOpenChange={(open) => setDialog(open ? "suggest" : null)}
      />
      <InfoPlaceholderDialog
        kind="support"
        open={dialog === "support"}
        onOpenChange={(open) => setDialog(open ? "support" : null)}
      />
    </div>
  );
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
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-night px-6 text-center text-cream">
      <p className="font-signage text-xl font-bold">Line kat gayi</p>
      <p className="max-w-sm text-sm text-cream/60">
        Jagahs load nahi hui. Ek baar phir koshish karein?
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="min-h-11 rounded-full bg-ember px-4 py-2 text-sm font-medium text-charcoal"
      >
        Retry
      </button>
    </div>
  );
}
