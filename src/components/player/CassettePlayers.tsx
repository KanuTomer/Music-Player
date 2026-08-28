import {
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { getPlayerDisplay, clock } from "@/lib/player-display";
import { usePlayer } from "@/lib/player";
import { AmbienceControl } from "@/components/player/AmbienceControl";
import { CassetteBody } from "@/components/player/CassetteBody";
import { PlayerDetailsSheet } from "@/components/player/PlayerDetailsSheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

function Cover({
  coverId,
  title,
  compact = false,
}: {
  coverId: string | null;
  title: string;
  compact?: boolean;
}) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-cream/15 bg-charcoal-soft ${
        compact ? "size-11" : "size-16 sm:size-[4.5rem]"
      }`}
    >
      {coverId ? (
        <img
          key={coverId}
          src={`https://i.ytimg.com/vi/${coverId}/mqdefault.jpg`}
          alt={`${title} cover art`}
          className="size-full animate-fade-in object-cover"
        />
      ) : (
        <span className="flex size-full flex-col items-center justify-center bg-ember/90 text-charcoal">
          <Music2 className={compact ? "size-4" : "size-5"} aria-hidden />
          {!compact ? <span className="mt-1 font-vintage-deva text-[9px]">संगीत</span> : null}
        </span>
      )}
    </span>
  );
}

function SeekBar({ compact = false }: { compact?: boolean }) {
  const player = usePlayer();
  const duration = player.nowPlaying.duration;
  const progress = duration > 0 ? Math.min(100, (player.nowPlaying.position / duration) * 100) : 0;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {!compact ? (
        <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-cream/45">
          {clock(player.nowPlaying.position)}
        </span>
      ) : null}
      <button
        type="button"
        aria-label="Seek"
        onClick={(event) => {
          if (duration <= 0) return;
          const rect = event.currentTarget.getBoundingClientRect();
          player.seek(((event.clientX - rect.left) / rect.width) * duration);
        }}
        className="group relative h-5 min-w-12 flex-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ember"
      >
        <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-cream/15" />
        <span
          className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-ember transition-[width] motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
        <span
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember opacity-0 shadow-tile transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{ left: `${progress}%` }}
          aria-hidden
        />
      </button>
      {!compact ? (
        <span className="w-8 shrink-0 text-[10px] tabular-nums text-cream/45">
          {clock(duration)}
        </span>
      ) : null}
    </div>
  );
}

function TransportButton({
  action,
  label,
  children,
  compact = false,
}: {
  action: () => void;
  label: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={action}
      aria-label={label}
      className={`${compact ? "size-9" : "size-10"} shrink-0 rounded-full border border-cream/20 text-cream/80 hover:bg-cream/10 hover:text-cream`}
    >
      {children}
    </Button>
  );
}

function PlayButton({ compact = false }: { compact?: boolean }) {
  const player = usePlayer();
  return (
    <Button
      type="button"
      onClick={player.toggle}
      aria-label={player.isPlaying ? "Pause" : "Play"}
      size="icon"
      className={`${compact ? "size-11" : "size-11"} shrink-0 rounded-full bg-ember text-charcoal shadow-lift transition-transform hover:bg-ember/90 active:scale-95`}
    >
      {player.isPlaying ? (
        <Pause className="size-4" aria-hidden />
      ) : (
        <Play className="size-4" aria-hidden />
      )}
    </Button>
  );
}

export function FullCassettePlayer() {
  const player = usePlayer();
  const [showVolume, setShowVolume] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const display = getPlayerDisplay({
    nowPlaying: player.nowPlaying,
    track: player.track,
    musicBlocked: player.musicBlocked,
  });
  const progressLabel =
    player.isCuratedPlaylist && player.nowPlaying.total > 0
      ? `${player.nowPlaying.index + 1}/${player.nowPlaying.total}`
      : null;

  if (!player.room) return null;

  return (
    <>
      <div className="pointer-events-auto w-[min(96vw,44rem)] rounded-xl border border-charcoal-line/60 bg-charcoal/92 p-3 text-cream shadow-lift ring-1 ring-cream/5 backdrop-blur-md sm:p-4">
        <div className="flex items-center gap-3 border-b border-cream/10 pb-3">
          <Cover coverId={display.coverId} title={display.title} />
          <div key={display.coverId ?? "idle"} className="min-w-0 flex-1 animate-fade-in">
            <p className="truncate font-cinema-display text-lg leading-tight text-cream sm:text-xl">
              {display.title}
            </p>
            <p className="mt-1 truncate text-[11px] font-medium text-cream/60 sm:text-xs">
              {display.status === "unavailable" ? (
                "Track unavailable — advancing automatically"
              ) : (
                <>
                  <span className="text-ember">कलाकार</span> · {display.subtitle}
                </>
              )}
            </p>
            <p
              className="mt-1 flex items-center gap-1.5 font-vintage-deva text-[11px] text-ember"
              aria-live="polite"
            >
              <span
                className="animate-bulb inline-block size-1.5 rounded-full bg-ember"
                aria-hidden
              />
              {display.status === "loading" ? "ट्यून हो रहा है" : "अभी बज रहा है"}
            </p>
          </div>
          {progressLabel ? (
            <span className="shrink-0 rounded-full border border-cream/15 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-cream/50">
              {progressLabel}
            </span>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 sm:gap-4">
          <TransportButton action={player.previous} label="Previous track">
            <SkipBack className="size-4" aria-hidden />
          </TransportButton>
          <CassetteBody variant="full" isPlaying={player.isPlaying} label="Sainik Dhaba" />
          <TransportButton action={player.next} label="Next track">
            <SkipForward className="size-4" aria-hidden />
          </TransportButton>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="order-1 min-w-[10rem] flex-1">
            <SeekBar />
          </div>
          <div className="order-2 flex items-center gap-2">
            <PlayButton />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowVolume((current) => !current)}
              aria-expanded={showVolume}
              aria-label="Music volume"
              className={`size-11 rounded-full border border-cream/20 ${
                showVolume
                  ? "bg-ember text-charcoal"
                  : "text-cream/70 hover:bg-cream/10 hover:text-cream"
              }`}
            >
              <Volume2 className="size-4" aria-hidden />
            </Button>
            <AmbienceControl level={player.ambienceLevel} onLevelChange={player.setAmbienceLevel} />
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMoreOpen(true)}
              className="min-h-11 rounded-full border border-cream/20 px-3 text-xs text-cream/70 hover:bg-cream/10 hover:text-cream"
            >
              <MoreHorizontal className="mr-1.5 size-4" aria-hidden /> More
            </Button>
          </div>
        </div>

        {showVolume ? (
          <div className="mt-3 flex items-center gap-2 border-t border-cream/10 pt-3">
            <Volume1 className="size-3.5 shrink-0 text-cream/60" aria-hidden />
            <span className="w-14 shrink-0 text-[10.5px] text-cream/60">Music</span>
            <Slider
              value={[Math.round(player.musicVolume * 100)]}
              max={100}
              step={1}
              aria-label="Music volume"
              onValueChange={(value) => player.setMusicVolume((value[0] ?? 0) / 100)}
            />
          </div>
        ) : null}
      </div>
      <PlayerDetailsSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}

export function CompactCassettePlayer({ className = "" }: { className?: string }) {
  const player = usePlayer();
  const [moreOpen, setMoreOpen] = useState(false);
  const display = getPlayerDisplay({
    nowPlaying: player.nowPlaying,
    track: player.track,
    musicBlocked: player.musicBlocked,
  });

  if (!player.room) return null;

  return (
    <>
      <div
        className={`paper border border-cream/10 bg-charcoal/96 text-cream shadow-lift backdrop-blur ${className}`}
      >
        <div className="mx-auto grid w-full max-w-5xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2 sm:grid-cols-[auto_auto_minmax(8rem,1fr)_auto] sm:gap-3 sm:px-4">
          <CassetteBody
            variant="compact"
            isPlaying={player.isPlaying}
            label={player.room.scene.title_en}
          />

          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-[10px] font-bold tracking-[0.14em] text-ember uppercase">
              {player.room.scene.title_en}
            </p>
            <p className="truncate font-cinema-display text-sm leading-tight text-cream">
              {display.title}
            </p>
            <p className="truncate text-[10px] text-cream/50">{display.subtitle}</p>
          </div>

          <div className="min-w-0">
            <div className="mb-1.5 min-w-0 sm:hidden">
              <p className="truncate font-cinema-display text-[13px] leading-tight text-cream">
                {display.title}
              </p>
              <p className="truncate text-[9px] text-cream/45">{player.room.scene.title_en}</p>
            </div>
            <SeekBar compact />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <TransportButton action={player.previous} label="Previous track" compact>
              <SkipBack className="size-3.5" aria-hidden />
            </TransportButton>
            <PlayButton compact />
            <TransportButton action={player.next} label="Next track" compact>
              <SkipForward className="size-3.5" aria-hidden />
            </TransportButton>
            <div className="hidden sm:block">
              <AmbienceControl
                compact
                level={player.ambienceLevel}
                onLevelChange={player.setAmbienceLevel}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMoreOpen(true)}
              aria-label="More player details"
              className="size-11 shrink-0 rounded-full border border-cream/20 text-cream/70 hover:bg-cream/10 hover:text-cream"
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </Button>
          </div>

          <div className="col-span-3 flex items-center justify-between gap-2 border-t border-cream/10 pt-2 sm:hidden">
            <p className="min-w-0 truncate text-[10px] text-cream/45" aria-live="polite">
              {display.status === "unavailable"
                ? "Track unavailable — advancing"
                : display.status === "loading"
                  ? "Tuning in…"
                  : display.subtitle}
            </p>
            <AmbienceControl
              compact
              level={player.ambienceLevel}
              onLevelChange={player.setAmbienceLevel}
            />
          </div>
        </div>
      </div>
      <PlayerDetailsSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
