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
import { Button } from "@/components/ui/button";

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
  const artistDetails =
    subtitleFrom(nowPlaying.title, nowPlaying.channel) ??
    ([track?.artist, track?.year].filter(Boolean).join(" · ") || "गीत की जानकारी आ रही है…");

  const duration = nowPlaying.duration;
  const progress = duration > 0 ? Math.min(100, (nowPlaying.position / duration) * 100) : 0;
  const watchUrl = nowPlaying.videoId
    ? `https://www.youtube.com/watch?v=${nowPlaying.videoId}`
    : track
    ? `https://music.youtube.com/search?q=${encodeURIComponent(track.search_query ?? track.title)}`
    : null;

  return (
    <div className="pointer-events-auto w-[min(96vw,50rem)] rounded-lg border-2 border-ink/70 bg-cinema-cream/95 p-2.5 text-ink shadow-lift backdrop-blur-sm sm:p-3">
      <div className="flex items-center gap-3 border-b border-ink/20 pb-2.5">
        <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-sm border-2 border-ink/40 bg-night shadow-tile sm:size-[4.5rem]">
          {nowPlaying.videoId || track?.youtube_id ? (
            <img
              key={nowPlaying.videoId ?? track?.youtube_id}
              src={`https://i.ytimg.com/vi/${nowPlaying.videoId ?? track?.youtube_id}/mqdefault.jpg`}
              alt={`${title} cover art`}
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full flex-col items-center justify-center bg-terracotta text-cinema-cream" aria-label="Cover art loading">
              <Music2 className="size-5" aria-hidden />
              <span className="mt-1 font-vintage-deva text-[9px]">संगीत</span>
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-cinema-display text-base leading-tight text-ink sm:text-lg">{title}</p>
          <p className="mt-1 truncate text-[11px] font-semibold text-ink/70 sm:text-xs">
            {musicBlocked ? (
              "गीत उपलब्ध नहीं है — माहौल की आवाज़ चल रही है।"
            ) : (
              <><span className="text-terracotta">कलाकार</span> · {artistDetails}</>
            )}
          </p>
          {!musicBlocked && (nowPlaying.videoId || track) && (
            <p
              key={nowPlaying.videoId ?? track?.id}
              className="mt-1 font-vintage-deva text-[11px] text-terracotta"
              aria-live="polite"
            >
              अभी बज रहा है
            </p>
          )}
        </div>
        {isCuratedPlaylist && nowPlaying.total > 0 && (
          <span className="shrink-0 text-[10px] font-semibold tabular-nums text-ink/50">
            {nowPlaying.index + 1}/{nowPlaying.total}
          </span>
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 sm:gap-4">
        <Button type="button" variant="ghost" size="icon" onClick={onPrevious} aria-label="Previous track" className="size-10 rounded-full border border-ink/30 text-ink hover:bg-ink/10">
          <SkipBack className="size-4" aria-hidden />
        </Button>

        <div className={`cassette-window relative flex h-14 min-w-0 items-center justify-center gap-5 overflow-hidden rounded-sm border-2 border-ink/60 bg-night px-4 shadow-inner sm:h-16 sm:gap-10 ${isPlaying ? "cassette-running" : ""}`}>
          <div className="pointer-events-none absolute inset-x-5 top-1.5 h-px bg-cream/15" aria-hidden />
          {["left", "right"].map((side) => (
            <span key={side} className={`cassette-spool cassette-spool-${side} relative flex size-11 items-center justify-center rounded-full border-2 border-cream/35 bg-cinema`} aria-hidden>
              <span className={`cassette-reel relative flex size-9 items-center justify-center rounded-full border-[3px] border-cinema-cream bg-ink ${isPlaying ? "cassette-reel-playing" : ""}`}>
                <span className="cassette-reel-hole cassette-reel-hole-a" />
                <span className="cassette-reel-hole cassette-reel-hole-b" />
                <span className="cassette-reel-hole cassette-reel-hole-c" />
                <span className="relative z-10 size-2.5 rounded-full border-2 border-ink bg-cinema-gold" />
              </span>
            </span>
          ))}
          <span className="cassette-tape absolute left-[calc(50%-2.75rem)] right-[calc(50%-2.75rem)] bottom-2 h-0.5 bg-cinema-clay" aria-hidden />
          <div className="absolute bottom-0 left-1/2 h-3 w-24 -translate-x-1/2 border-x border-t border-cream/25 bg-ink" aria-hidden />
        </div>

        <Button type="button" variant="ghost" size="icon" onClick={onNext} aria-label="Next track" className="size-10 rounded-full border border-ink/30 text-ink hover:bg-ink/10">
          <SkipForward className="size-4" aria-hidden />
        </Button>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-ink/55">
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
          className="group relative h-3 flex-1 rounded-full"
        >
          <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-ink/20" />
          <span
            className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-terracotta transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </button>
        <span className="w-8 shrink-0 text-[10px] tabular-nums text-ink/55">{clock(duration)}</span>
        <Button type="button" onClick={onToggle} aria-label={isPlaying ? "Pause" : "Play"} size="icon" className="size-11 rounded-full bg-terracotta text-primary-foreground shadow-tile hover:bg-terracotta/90">
          {isPlaying ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => setShowMix((s) => !s)} aria-expanded={showMix} aria-label="Sound mix" className={`size-9 rounded-full border border-ink/25 ${showMix ? "bg-mustard text-ink" : "text-ink/70 hover:bg-ink/10"}`}>
          <Volume2 className="size-4" aria-hidden />
        </Button>
        {watchUrl && (
          <a
            href={watchUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open on YouTube"
            className="shrink-0 text-ink/55 transition-colors hover:text-ink"
          >
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}
      </div>

      {showMix && (
        <div className="mt-2.5 grid gap-2.5 border-t border-ink/20 pt-2.5 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Volume1 className="size-3.5 shrink-0 text-ink/65" aria-hidden />
            <span className="w-14 shrink-0 text-[10.5px] text-ink/65">Music</span>
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
              className={`shrink-0 ${ambienceEnabled ? "text-terracotta" : "text-ink/45"}`}
            >
              {ambienceEnabled ? (
                <Waves className="size-3.5" aria-hidden />
              ) : (
                <VolumeX className="size-3.5" aria-hidden />
              )}
            </button>
            <span className="w-14 shrink-0 text-[10.5px] text-ink/65">Ambience</span>
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
