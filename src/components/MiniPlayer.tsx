import { Link } from "@tanstack/react-router";
import { ChevronUp, Pause, Play, X } from "lucide-react";
import { usePlayer } from "@/lib/player";

/** Persistent now-playing bar shown when the user navigates away from a room. */
export function MiniPlayer() {
  const { room, track, isPlaying, isCuratedPlaylist, toggle, leave } = usePlayer();
  if (!room) return null;

  return (
    <div className="paper relative shrink-0 border-t border-ink/15 bg-card/95 px-3 py-2 backdrop-blur">
      <span className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-terracotta via-mustard to-terracotta opacity-80" aria-hidden />
      <div className="z-2 mx-auto flex max-w-3xl items-center gap-2.5">

        <button
          type="button"
          onClick={toggle}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          {isPlaying ? (
            <Pause className="size-4" aria-hidden />
          ) : (
            <Play className="size-4" aria-hidden />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] leading-tight font-semibold">
            {room.scene.title_en}
          </p>
          <p className="truncate text-[11px] leading-tight text-muted-foreground">
            {isCuratedPlaylist ? "Theme playlist · YouTube" : track ? track.title : room.scene.title_hi}
          </p>
        </div>
        <Link
          to="/room/$slug"
          params={{ slug: room.scene.slug }}
          aria-label="Open room"
          className="flex size-9 items-center justify-center rounded-full border border-border/70 hover:bg-accent/40"
        >
          <ChevronUp className="size-4" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={leave}
          aria-label="Leave room"
          className="flex size-9 items-center justify-center rounded-full border border-border/70 hover:bg-accent/40"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
