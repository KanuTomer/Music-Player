import { ExternalLink, Pause, Play, SkipForward, Volume2, VolumeX } from "lucide-react";
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
  isCuratedPlaylist,
  isPlaying,
  onToggle,
  onNext,
  ambience,
  ambienceEnabled,
  onAmbience,
  onToggleAmbience,
  musicBlocked,
}: {
  track: Track | null;
  isCuratedPlaylist: boolean;
  isPlaying: boolean;
  onToggle: () => void;
  onNext: () => void;
  ambience: number;
  ambienceEnabled: boolean;
  onAmbience: (v: number) => void;
  onToggleAmbience: () => void;
  musicBlocked: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="pointer-events-auto w-[min(96vw,44rem)] rounded-2xl border border-cream/20 bg-night/55 px-3 py-2 text-cream shadow-lift backdrop-blur-md">
      <div className="z-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-tile transition-transform hover:scale-105 active:scale-95"
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
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-cream/25 text-cream transition-colors hover:bg-cream/15"
        >
          <SkipForward className="size-4" aria-hidden />
        </button>

        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="min-w-0 flex-1 rounded-lg px-2 py-1 text-left transition-colors hover:bg-cream/10"
        >
          <p className="truncate text-[13px] leading-tight font-semibold text-cream">
            {isCuratedPlaylist ? "Theme playlist" : track ? track.title : "Ambience only"}
          </p>
          <p className="truncate text-[11px] leading-tight text-cream/65">
            {isCuratedPlaylist
              ? "Curated on YouTube"
              : track
              ? [track.artist, track.year].filter(Boolean).join(" · ")
              : "Sun rahe ho? Ye kamre ki hawa hai."}
          </p>
        </button>

        <button
          type="button"
          onClick={onToggleAmbience}
          aria-label={ambienceEnabled ? "Turn off theme sound" : "Turn on theme sound"}
          title={ambienceEnabled ? "Theme sound on" : "Theme sound off"}
          className={`flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
            ambienceEnabled
              ? "border-accent/60 bg-accent/15 text-accent"
              : "border-cream/25 text-cream/65 hover:bg-cream/15"
          }`}
        >
          {ambienceEnabled ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
        </button>

        <div className={`hidden w-24 items-center gap-2 transition-opacity sm:flex ${ambienceEnabled ? "opacity-100" : "pointer-events-none opacity-35"}`}>
          <Slider
            value={[Math.round(ambience * 100)]}
            max={100}
            step={1}
            disabled={!ambienceEnabled}
            aria-label="Ambience volume"
            onValueChange={(v) => onAmbience((v[0] ?? 0) / 100)}
          />
        </div>
      </div>

      {expanded && track && !isCuratedPlaylist && (
        <div className="z-2 mt-2 flex flex-wrap items-center gap-2 border-t border-cream/20 pt-2 text-[11px]">
          <span className="text-cream/65">Listen to the full track:</span>
          <a
            href={spotifySearch(track)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-cream/25 px-2 py-0.5 text-cream hover:bg-cream/15"
          >
            Spotify <ExternalLink className="size-3" aria-hidden />
          </a>
          <a
            href={youtubeSearch(track)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-cream/25 px-2 py-0.5 text-cream hover:bg-cream/15"
          >
            YT Music <ExternalLink className="size-3" aria-hidden />
          </a>
          {musicBlocked && (
            <span className="text-cream/65">
              Music unavailable in your region — ambience is still playing.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
