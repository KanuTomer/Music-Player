import { ExternalLink, Pause, Play, SkipForward, Volume2 } from "lucide-react";
import { useState } from "react";
import type { Track } from "@/lib/rooms.functions";
import { Slider } from "@/components/ui/slider";

function youtubeSearch(t: Track) {
  return t.youtube_id
    ? `https://music.youtube.com/watch?v=${t.youtube_id}`
    : `https://music.youtube.com/search?q=${encodeURIComponent(t.search_query ?? t.title)}`;
}

function spotifySearch(t: Track) {
  return `https://open.spotify.com/search/${encodeURIComponent(
    `${t.title} ${t.artist ?? ""}`.trim(),
  )}`;
}

export function ControlCluster({
  track,
  isPlaying,
  onToggle,
  onNext,
  ambience,
  onAmbience,
  musicBlocked,
}: {
  track: Track | null;
  isPlaying: boolean;
  onToggle: () => void;
  onNext: () => void;
  ambience: number;
  onAmbience: (v: number) => void;
  musicBlocked: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="paper pointer-events-auto w-[min(96vw,44rem)] rounded-2xl border border-border/70 bg-background/80 px-3 py-2 shadow-lift backdrop-blur-md">
      <div className="z-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95"
        >
          {isPlaying ? (
            <Pause className="size-4" aria-hidden />
          ) : (
            <Play className="size-4" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next track"
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border/70 transition-colors hover:bg-accent/40"
        >
          <SkipForward className="size-4" aria-hidden />
        </button>

        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="min-w-0 flex-1 rounded-lg px-2 py-1 text-left transition-colors hover:bg-accent/30"
        >
          <p className="truncate text-[13px] leading-tight font-semibold">
            {track ? track.title : "Ambience only"}
          </p>
          <p className="truncate text-[11px] leading-tight text-muted-foreground">
            {track
              ? [track.artist, track.year].filter(Boolean).join(" · ")
              : "Sun rahe ho? Ye kamre ki hawa hai."}
          </p>
        </button>

        <div className="hidden w-32 items-center gap-2 sm:flex">
          <Volume2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <Slider
            value={[Math.round(ambience * 100)]}
            max={100}
            step={1}
            aria-label="Ambience volume"
            onValueChange={(v) => onAmbience((v[0] ?? 0) / 100)}
          />
        </div>
      </div>

      {expanded && track && (
        <div className="z-2 mt-2 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2 text-[11px]">
          <span className="text-muted-foreground">Listen to the full track:</span>
          <a
            href={spotifySearch(track)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-0.5 hover:bg-accent/40"
          >
            Spotify <ExternalLink className="size-3" aria-hidden />
          </a>
          <a
            href={youtubeSearch(track)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-0.5 hover:bg-accent/40"
          >
            YT Music <ExternalLink className="size-3" aria-hidden />
          </a>
          {musicBlocked && (
            <span className="text-muted-foreground">
              Music unavailable in your region — ambience is still playing.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
