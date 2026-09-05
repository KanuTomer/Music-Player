import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { buildSeoMeta } from "@/lib/seo";

const TITLE = "Generate your own room — coming soon | Sainik Dhaba";
const DESC =
  "Custom AI-generated rooms are parked for a future release. For now, step into the hand-built Hindi rooms of Sainik Dhaba.";

export const Route = createFileRoute("/generate")({
  head: () => ({
    meta: buildSeoMeta({
      title: TITLE,
      description: DESC,
      robots: "noindex",
    }),
  }),
  component: GeneratePage,
});

function GeneratePage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar />
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <Sparkles className="size-6 text-primary" aria-hidden />
        <h1 className="font-signage text-xl font-bold">Ye counter abhi band hai</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Making your own room is parked for a later release. Filhaal ke liye, hand-built kamron
          mein baith jao.
        </p>
        <Link
          to="/"
          className="mt-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          All rooms
        </Link>
      </main>
    </div>
  );
}
