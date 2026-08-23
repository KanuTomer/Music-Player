import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { MiniPlayer } from "@/components/MiniPlayer";

const TITLE = "Generate a room — Sainik Dhaba";
const DESC =
  "Type any Indian micro-space — a 1998 Kanpur cyber cafe, a Coimbatore sweet shop — and get a playable ambient room built for it.";

export const Route = createFileRoute("/generate")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: GeneratePage,
});

const EXAMPLES = [
  "1998 Kanpur cyber cafe",
  "Coimbatore sweet shop, 4pm",
  "Shimla bus stand in the rain",
  "Hostel corridor before exams",
];

function GeneratePage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
        <span className="signboard flex size-12 items-center justify-center rounded-xl">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-xl leading-tight font-extrabold sm:text-2xl">
            अपना कमरा बनाइए / Build your own room
          </h1>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            The generator is being wired up next — it will turn any typed micro-space into a
            playable room with its own playlist, one-liners and palette.
          </p>
        </div>
        <div className="flex max-w-lg flex-wrap justify-center gap-2">
          {EXAMPLES.map((e) => (
            <span
              key={e}
              className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-[12px] text-muted-foreground"
            >
              {e}
            </span>
          ))}
        </div>
        <Link
          to="/"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Meanwhile, sit in a hand-built room
        </Link>
      </div>
      <MiniPlayer />
    </div>
  );
}
