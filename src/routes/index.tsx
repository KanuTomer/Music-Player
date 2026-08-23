import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listScenes, type Scene } from "@/lib/rooms.functions";
import { SceneCard } from "@/components/SceneCard";
import { TopBar } from "@/components/TopBar";
import { MiniPlayer } from "@/components/MiniPlayer";
import { Skeleton } from "@/components/ui/skeleton";

const TITLE = "Sainik Dhaba — an always-on radio for the places India grew up in";
const DESC =
  "Tap into a 90s barbershop, a night bus, a railway platform or a sarkari daftar. Ambient sound, illustrated scenes and in-character chatter — no signup.";

export const Route = createFileRoute("/")({
  loader: () => listScenes(),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: Home,
  pendingComponent: HomeSkeleton,
  errorComponent: HomeError,
});

function usePageSize() {
  // 6 tiles on mobile portrait (2x3), 9 on desktop (3x3) — never scrolls.
  const [size, setSize] = useState(6);
  useEffect(() => {
    const apply = () => setSize(window.innerWidth >= 768 ? 9 : 6);
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);
  return size;
}

function Home() {
  const scenes = Route.useLoaderData();
  const [page, setPage] = useState(0);
  const pageSize = usePageSize();

  const tiles = useMemo(() => scenes.map((s: Scene) => ({ scene: s })), [scenes]);

  const pages = Math.max(1, Math.ceil(tiles.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const visible = tiles.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar />

      <div className="flex min-h-0 flex-1 flex-col px-3 pb-2 sm:px-5">
        <div className="flex shrink-0 items-center justify-between gap-2 py-2">
          <p className="text-[12px] text-muted-foreground">
            {scenes.length} kamre khule hain — tap kar ke andar aa jao
          </p>
          <Link
            to="/my-dhaba"
            className="rounded-full border border-border/70 px-2.5 py-1 text-[12px] font-medium hover:bg-accent/40"
          >
            My Dhaba
          </Link>
        </div>

        {tiles.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-center">
            <p className="font-signage text-lg font-bold">Yahan abhi sannata hai</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              No rooms are live right now. Thodi der mein wapas aana.
            </p>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-3 gap-2 sm:gap-3 md:grid-cols-3">
            {visible.map((t, i) => (
              <SceneCard key={t.scene?.slug ?? i} scene={t.scene!} />
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex shrink-0 items-center justify-center gap-3 pt-2">
            <button
              type="button"
              aria-label="Previous page"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="flex size-8 items-center justify-center rounded-full border border-border/70 disabled:opacity-40"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <div className="flex gap-1.5">
              {Array.from({ length: pages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Page ${i + 1}`}
                  onClick={() => setPage(i)}
                  className={`size-2 rounded-full transition-colors ${
                    i === safePage ? "bg-primary" : "bg-border"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next page"
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              disabled={safePage >= pages - 1}
              className="flex size-8 items-center justify-center rounded-full border border-border/70 disabled:opacity-40"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        )}
      </div>

      <MiniPlayer />
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar />
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-3 gap-2 p-3 sm:gap-3 sm:p-5 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="size-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function HomeError() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="font-signage text-xl font-bold">Line kat gayi</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        The rooms could not be loaded. Ek baar phir koshish karein?
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
