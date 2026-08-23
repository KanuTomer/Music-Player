import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { MiniPlayer } from "@/components/MiniPlayer";

const TITLE = "My Dhaba — your saved rooms | Sainik Dhaba";
const DESC =
  "Your saved rooms, generated micro-spaces and custom ambient mixes, all in one place.";

export const Route = createFileRoute("/my-dhaba")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: MyDhaba,
});

function MyDhaba() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <Bookmark className="size-6 text-primary" aria-hidden />
        <h1 className="text-xl font-extrabold">मेरा ढाबा / My Dhaba</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Saving rooms and custom mixes arrives with accounts in the next pass. Everything
          else works without signing in.
        </p>
        <Link
          to="/"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Browse rooms
        </Link>
      </div>
      <MiniPlayer />
    </div>
  );
}
