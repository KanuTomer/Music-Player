import {
  ExternalLink,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  Waves,
} from "lucide-react";
import { useState } from "react";
import type { Track } from "@/lib/rooms.functions";
import type { NowPlaying } from "@/lib/player";
import { Slider } from "@/components/ui/slider";

const NOISE =
  /\b(official\s*(music\s*)?(video|audio|lyrical|lyric)?|full\s*(video\s*)?song|lyrical(\s*video)?|hd|4k|remastered|audio|video song|with lyrics)\b/gi;

/** YouTube titles are messy — pull out a song name and a likely artist/film. */
function readableTitle(raw: string | null) {
  if (!raw) return null;
  const parts = raw
    .split(/[|｜–—]/)
    .map((p) => p.replace(NOISE, "").replace(/[\[\]()]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return parts[0] ?? raw.trim();
}

function subtitleFrom(raw: string | null, channel: string | null) {
  if (!raw) return channel;
  const parts = raw
    .split(/[|｜–—]/)
    .map((p) => p.replace(NOISE, "").replace(/[\[\]()]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const rest = parts.slice(1).filter((p) => p.length > 1).slice(0, 2);
  return rest.length ? rest.join(" · ") : channel;
}

function clock(s: number) {
  if (!Number.isFinite(s) || s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function ControlCluster({
  track,
  nowPlaying,
  isCuratedPlaylist,
  isPlaying,
  onToggle,
  onNext,
  onPrevious,
  onSeek,
  musicVolume,
  onMusicVolume,
  ambience,
  ambienceEnabled,
  onAmbience,
  onToggleAmbience,
  musicBlocked,
}: {
  track: Track | null;
  nowPlaying: NowPlaying;
  isCuratedPlaylist: boolean;
  isPlaying: boolean;
  onToggle: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (seconds: number) => void;
  musicVolume: number;
  onMusicVolume: (v: number) => void;
  ambience: number;
  ambienceEnabled: boolean;
  onAmbience: (v: number) => void;
  onToggleAmbience: () => void;
  musicBlocked: boolean;
}) {
  const [showMix, setShowMix] = useState(false);

  const liveTitle = readableTitle(nowPlaying.title);
  const title = liveTitle ?? track?.title ?? "Tuning in…";
  const subtitle =
    subtitleFrom(nowPlaying.title, nowPlaying.channel) ??
    [track?.artist, track?.year].filter(Boolean).join(" · ") ||
    "Ambience only";

  const duration = nowPlaying.duration;
  const progress = duration > 0 ? Math.min(100, (nowPlaying.position / duration) * 100) : 0;
  const watchUrl = nowPlaying.videoId
    ? `https://www.youtube.com/watch?v=${nowPlaying.videoId}`
    : track
    ? `https://music.youtube.com/search?q=${encodeURIComponent(track.search_query ?? track.title)}`
    : null;

  return (
    <div className="pointer-events-auto w-[min(96vw,44rem)] rounded-2xl border border-cream/20 bg-night/60 px-3 py-2.5 text-cream shadow-lift backdrop-blur-md">
      <div className="z-2 flex items-center gap-2.5">
        <span
          className={`relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-cream/20 bg-cream/10 ${
            isPlaying ? "animate-pulse" : ""
          }`}
          aria-hidden
        >
          {nowPlaying.videoId ? (
            <img
              src={`https://i.ytimg.com/vi/${nowPlaying.videoId}/default.jpg`}
              alt=""
              className="size-full rounded-xl object-cover"
            />
          ) : (
            <Music2 className="size-4 text-cream/70" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] leading-tight font-semibold text-cream">{title}</p>
          <p className="truncate text-[11px] leading-tight text-cream/65">
            {musicBlocked ? "Music unavailable here — ambience is still playing." : subtitle}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onPrevious}
            aria-label="Previous track"
            className="flex size-8 items-center justify-center rounded-full border border-cream/25 text-cream transition-colors hover:bg-cream/15"
          >
            <SkipBack className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-tile transition-transform hover:scale-105 active:scale-95"
          >
            {isPlaying ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next track"
            className="flex size-8 items-center justify-center rounded-full border border-cream/25 text-cream transition-colors hover:bg-cream/15"
          >
            <SkipForward className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setShowMix((s) => !s)}
            aria-expanded={showMix}
            aria-label="Sound mix"
            className={`flex size-8 items-center justify-center rounded-full border transition-colors ${
              showMix
                ? "border-accent/60 bg-accent/15 text-accent"
                : "border-cream/25 text-cream/75 hover:bg-cream/15"
            }`}
          >
            <Volume2 className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="z-2 mt-2 flex items-center gap-2">
        <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-cream/55">
          {clock(nowPlaying.position)}
        </span>
        <button
          type="button"
          aria-label="Seek"
          onClick={(e) => {
            if (duration <= 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            onSeek(((e.clientX - rect.left) / rect.width) * duration);
          }}
          className="group relative h-2.5 flex-1 rounded-full"
        >
          <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-cream/20" />
          <span
            className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-accent transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </button>
        <span className="w-8 shrink-0 text-[10px] tabular-nums text-cream/55">{clock(duration)}</span>
        {isCuratedPlaylist && nowPlaying.total > 0 && (
          <span className="hidden shrink-0 text-[10px] tabular-nums text-cream/45 sm:inline">
            {nowPlaying.index + 1}/{nowPlaying.total}
          </span>
        )}
        {watchUrl && (
          <a
            href={watchUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open on YouTube"
            className="shrink-0 text-cream/55 transition-colors hover:text-cream"
          >
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}
      </div>

      {showMix && (
        <div className="z-2 mt-2 grid gap-2 border-t border-cream/20 pt-2 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Volume1 className="size-3.5 shrink-0 text-cream/65" aria-hidden />
            <span className="w-14 shrink-0 text-[10.5px] text-cream/65">Music</span>
            <Slider
              value={[Math.round(musicVolume * 100)]}
              max={100}
              step={1}
              aria-label="Music volume"
              onValueChange={(v) => onMusicVolume((v[0] ?? 0) / 100)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleAmbience}
              aria-label={ambienceEnabled ? "Turn off theme sound" : "Turn on theme sound"}
              className={`shrink-0 ${ambienceEnabled ? "text-accent" : "text-cream/45"}`}
            >
              {ambienceEnabled ? (
                <Waves className="size-3.5" aria-hidden />
              ) : (
                <VolumeX className="size-3.5" aria-hidden />
              )}
            </button>
            <span className="w-14 shrink-0 text-[10.5px] text-cream/65">Ambience</span>
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
      )}
    </div>
  );
}
