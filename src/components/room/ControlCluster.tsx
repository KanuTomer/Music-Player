import {
  ChevronUp,
  ExternalLink,
  Minus,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
} from "lucide-react";
import { useEffect, useState } from "react";

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
    .map((p) =>
      p
        .replace(NOISE, "")
        .replace(/[[\]()]/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
  return parts[0] ?? raw.trim();
}

function subtitleFrom(raw: string | null, channel: string | null) {
  if (!raw) return channel;
  const parts = raw
    .split(/[|｜–—]/)
    .map((p) =>
      p
        .replace(NOISE, "")
        .replace(/[[\]()]/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
  const rest = parts
    .slice(1)
    .filter((p) => p.length > 1)
    .slice(0, 2);
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
  musicBlocked: boolean;
}) {
  const [showMix, setShowMix] = useState(false);
  const [minimized, setMinimized] = useState(false);

  // Remember the user's preferred player size between visits.
  useEffect(() => {
    if (window.localStorage.getItem("sd.player.minimized") === "1") setMinimized(true);
  }, []);
  useEffect(() => {
    window.localStorage.setItem("sd.player.minimized", minimized ? "1" : "0");
  }, [minimized]);

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

  const cover = nowPlaying.videoId ?? track?.youtube_id ?? null;

  if (minimized) {
    return (
      <div className="pointer-events-auto w-[min(96vw,30rem)] rounded-full border border-charcoal-line/60 bg-charcoal/92 p-2 pr-3 text-cream shadow-lift ring-1 ring-cream/5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cream/15 bg-charcoal-soft">
            {cover ? (
              <img
                key={cover}
                src={`https://i.ytimg.com/vi/${cover}/mqdefault.jpg`}
                alt={`${title} cover art`}
                className="size-full animate-fade-in object-cover"
              />
            ) : (
              <Music2 className="size-4 text-ember" aria-hidden />
            )}
          </span>

          <div key={cover ?? "idle"} className="min-w-0 flex-1 animate-fade-in">
            <p className="truncate font-cinema-display text-[13px] leading-tight text-cream">
              {title}
            </p>
            <p className="truncate text-[10.5px] text-cream/55">{artistDetails}</p>
            <span
              className="mt-1 block h-[2px] w-full overflow-hidden rounded-full bg-cream/15"
              aria-hidden
            >
              <span
                className="block h-full rounded-full bg-ember"
                style={{ width: `${progress}%` }}
              />
            </span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            aria-label="Previous track"
            className="size-8 shrink-0 rounded-full text-cream/70 hover:bg-cream/10 hover:text-cream"
          >
            <SkipBack className="size-3.5" aria-hidden />
          </Button>
          <Button
            type="button"
            onClick={onToggle}
            aria-label={isPlaying ? "Pause" : "Play"}
            size="icon"
            className="size-9 shrink-0 rounded-full bg-ember text-charcoal hover:bg-ember/90 active:scale-95"
          >
            {isPlaying ? (
              <Pause className="size-3.5" aria-hidden />
            ) : (
              <Play className="size-3.5" aria-hidden />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onNext}
            aria-label="Next track"
            className="size-8 shrink-0 rounded-full text-cream/70 hover:bg-cream/10 hover:text-cream"
          >
            <SkipForward className="size-3.5" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMinimized(false)}
            aria-label="Expand player to cassette mode"
            title="कैसेट मोड"
            className="size-8 shrink-0 rounded-full border border-cream/20 text-cream/70 hover:bg-cream/10 hover:text-cream"
          >
            <ChevronUp className="size-3.5" aria-hidden />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto w-[min(96vw,44rem)] rounded-xl border border-charcoal-line/60 bg-charcoal/92 p-3 text-cream shadow-lift ring-1 ring-cream/5 backdrop-blur-md sm:p-4">
      <div className="flex items-center gap-3 border-b border-cream/10 pb-3">
        <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-cream/15 bg-charcoal-soft sm:size-[4.5rem]">
          {nowPlaying.videoId || track?.youtube_id ? (
            <img
              key={nowPlaying.videoId ?? track?.youtube_id}
              src={`https://i.ytimg.com/vi/${nowPlaying.videoId ?? track?.youtube_id}/mqdefault.jpg`}
              alt={`${title} cover art`}
              className="size-full animate-fade-in object-cover"
            />
          ) : (
            <span
              className="flex size-full flex-col items-center justify-center bg-ember/90 text-charcoal"
              aria-label="Cover art loading"
            >
              <Music2 className="size-5" aria-hidden />
              <span className="mt-1 font-vintage-deva text-[9px]">संगीत</span>
            </span>
          )}
        </span>

        <div
          key={nowPlaying.videoId ?? track?.id ?? "idle"}
          className="min-w-0 flex-1 animate-fade-in"
        >
          <p className="truncate font-cinema-display text-lg leading-tight text-cream sm:text-xl">
            {title}
          </p>
          <p className="mt-1 truncate text-[11px] font-medium text-cream/60 sm:text-xs">
            {musicBlocked ? (
              "गीत अभी उपलब्ध नहीं है — कृपया अगला गीत चुनें।"
            ) : (
              <>
                <span className="text-ember">कलाकार</span> · {artistDetails}
              </>
            )}
          </p>
          {!musicBlocked && (nowPlaying.videoId || track) && (
            <p
              className="mt-1 flex items-center gap-1.5 font-vintage-deva text-[11px] text-ember"
              aria-live="polite"
            >
              <span
                className="animate-bulb inline-block size-1.5 rounded-full bg-ember"
                aria-hidden
              />
              अभी बज रहा है
            </p>
          )}
        </div>

        {isCuratedPlaylist && nowPlaying.total > 0 && (
          <span className="shrink-0 rounded-full border border-cream/15 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-cream/50">
            {nowPlaying.index + 1}/{nowPlaying.total}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 sm:gap-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onPrevious}
          aria-label="Previous track"
          className="size-10 rounded-full border border-cream/20 text-cream/80 hover:bg-cream/10 hover:text-cream"
        >
          <SkipBack className="size-4" aria-hidden />
        </Button>

        <div
          className={`cassette-shell relative h-24 min-w-0 overflow-hidden rounded-[6px] border border-cream/15 bg-charcoal-soft px-3 py-2 shadow-inner sm:h-28 ${isPlaying ? "cassette-running" : ""}`}
        >
          {/* corner screws */}
          <span className="cassette-screw left-1.5 top-1.5" aria-hidden />
          <span className="cassette-screw right-1.5 top-1.5" aria-hidden />
          <span className="cassette-screw left-1.5 bottom-1.5" aria-hidden />
          <span className="cassette-screw right-1.5 bottom-1.5" aria-hidden />

          {/* paper label with the clear hub window cut into it */}
          <div className="relative mx-auto h-full max-w-[26rem] rounded-[3px] bg-cinema-cream px-2 pt-1.5 shadow-tile">
            <div className="flex items-center justify-between">
              <span className="h-[3px] flex-1 bg-ember/80" aria-hidden />
              <span className="px-2 font-cinema-display text-[10px] tracking-[0.18em] text-charcoal/75">
                SAINIK DHABA
              </span>
              <span className="h-[3px] flex-1 bg-charcoal-line/60" aria-hidden />
            </div>

            <div className="cassette-window relative mx-auto mt-1.5 flex h-[3.1rem] items-center justify-center gap-8 rounded-[3px] border border-ink/50 bg-night/95 px-4 sm:h-[3.6rem] sm:gap-12">
              <span
                className="cassette-tape absolute inset-x-6 bottom-1.5 h-[3px] bg-cinema-clay"
                aria-hidden
              />
              {["left", "right"].map((side) => (
                <span
                  key={side}
                  className={`cassette-spool cassette-spool-${side} relative flex size-10 items-center justify-center rounded-full border-2 border-cream/30 bg-cinema sm:size-11`}
                  aria-hidden
                >
                  <span
                    className={`cassette-reel relative flex size-7 items-center justify-center rounded-full border-[3px] border-cinema-cream bg-ink sm:size-8 ${isPlaying ? "cassette-reel-playing" : ""}`}
                  >
                    <span className="cassette-reel-hole cassette-reel-hole-a" />
                    <span className="cassette-reel-hole cassette-reel-hole-b" />
                    <span className="cassette-reel-hole cassette-reel-hole-c" />
                    <span className="relative z-10 size-2 rounded-full border-2 border-ink bg-cinema-gold" />
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* head + capstan openings along the bottom edge */}
          <div
            className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-3"
            aria-hidden
          >
            <span className="h-2.5 w-4 rounded-t-[2px] border-x border-t border-cream/25 bg-ink" />
            <span className="h-3 w-10 rounded-t-[2px] border-x border-t border-cream/30 bg-ink" />
            <span className="h-2.5 w-4 rounded-t-[2px] border-x border-t border-cream/25 bg-ink" />
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onNext}
          aria-label="Next track"
          className="size-10 rounded-full border border-cream/20 text-cream/80 hover:bg-cream/10 hover:text-cream"
        >
          <SkipForward className="size-4" aria-hidden />
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-cream/45">
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
          className="group relative h-4 flex-1 rounded-full"
        >
          <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-cream/15" />
          <span
            className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-ember transition-[width]"
            style={{ width: `${progress}%` }}
          />
          <span
            className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember opacity-0 shadow-tile transition-opacity group-hover:opacity-100"
            style={{ left: `${progress}%` }}
            aria-hidden
          />
        </button>
        <span className="w-8 shrink-0 text-[10px] tabular-nums text-cream/45">
          {clock(duration)}
        </span>
        <Button
          type="button"
          onClick={onToggle}
          aria-label={isPlaying ? "Pause" : "Play"}
          size="icon"
          className="size-11 rounded-full bg-ember text-charcoal shadow-lift transition-transform hover:bg-ember/90 active:scale-95"
        >
          {isPlaying ? (
            <Pause className="size-4" aria-hidden />
          ) : (
            <Play className="size-4" aria-hidden />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowMix((s) => !s)}
          aria-expanded={showMix}
          aria-label="Sound mix"
          className={`size-9 rounded-full border border-cream/20 ${showMix ? "bg-ember text-charcoal" : "text-cream/70 hover:bg-cream/10 hover:text-cream"}`}
        >
          <Volume2 className="size-4" aria-hidden />
        </Button>
        {watchUrl && (
          <a
            href={watchUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open on YouTube"
            className="shrink-0 text-cream/45 transition-colors hover:text-ember"
          >
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}
      </div>

      {showMix && (
        <div className="mt-3 flex items-center gap-2 border-t border-cream/10 pt-3">
          <Volume1 className="size-3.5 shrink-0 text-cream/60" aria-hidden />
          <span className="w-14 shrink-0 text-[10.5px] text-cream/60">Music</span>
          <Slider
            value={[Math.round(musicVolume * 100)]}
            max={100}
            step={1}
            aria-label="Music volume"
            onValueChange={(v) => onMusicVolume((v[0] ?? 0) / 100)}
          />
        </div>
      )}
    </div>
  );
}
