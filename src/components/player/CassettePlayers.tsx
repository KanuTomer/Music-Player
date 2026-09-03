import {
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { getPlayerDisplay, clock } from "@/lib/player-display";
import { usePlayer } from "@/lib/player";
import { AmbienceControl } from "@/components/player/AmbienceControl";
import { CassetteBody } from "@/components/player/CassetteBody";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SmoothReveal } from "@/components/ui/smooth-reveal";

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
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-black/40 shadow-sm ring-1 ring-white/10 ${
        compact ? "size-9" : "size-10 sm:size-11"
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
        <span className="flex size-full flex-col items-center justify-center bg-gradient-to-br from-ember to-terracotta text-charcoal shadow-inner">
          <Music2 className={compact ? "size-3.5" : "size-4"} aria-hidden />
          {!compact ? <span className="mt-0.5 font-vintage-deva text-[8px] font-bold">संगीत</span> : null}
        </span>
      )}
    </span>
  );
}

function LiveEqualizer({ isPlaying, status }: { isPlaying: boolean; status: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-ember/30 bg-ember/15 px-2.5 py-0.5 font-vintage-deva text-[9.5px] text-ember-300 shadow-xs backdrop-blur-xs">
      {isPlaying ? (
        <div className="flex h-3 items-end gap-0.5" aria-hidden>
          <span className="w-0.5 rounded-full bg-ember animate-wave-1" />
          <span className="w-0.5 rounded-full bg-ember animate-wave-2" />
          <span className="w-0.5 rounded-full bg-ember animate-wave-3" />
          <span className="w-0.5 rounded-full bg-ember animate-wave-4" />
        </div>
      ) : (
        <span
          className={`inline-block size-1.5 rounded-full bg-ember ${
            status === "loading" ? "animate-ping" : "opacity-60"
          }`}
          aria-hidden
        />
      )}
      <span className="font-semibold tracking-wide">
        {status === "loading" ? "ट्यून" : isPlaying ? "बज रहा है" : "रोक दिया"}
      </span>
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
        <span className="w-8 shrink-0 text-right font-mono text-[10px] font-semibold tabular-nums text-cream/60">
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
        className="group relative flex h-5 min-w-10 flex-1 cursor-pointer items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ember"
      >
        <span className="absolute inset-x-0 h-1 rounded-full bg-white/15" />
        <span
          className="absolute left-0 h-1 rounded-full bg-gradient-to-r from-ember via-mustard to-ember shadow-[0_0_8px_rgba(240,126,70,0.6)] transition-[width] motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
        <span
          className="absolute size-3 -translate-x-1/2 rounded-full border border-white/80 bg-gradient-to-b from-white via-amber-200 to-ember shadow-[0_0_6px_rgba(240,126,70,0.8)] transition-transform group-hover:scale-125 group-focus-visible:scale-125"
          style={{ left: `${progress}%` }}
          aria-hidden
        />
      </button>
      {!compact ? (
        <span className="w-8 shrink-0 font-mono text-[10px] font-semibold tabular-nums text-cream/60">
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
      className={`${
        compact ? "size-8" : "size-8.5 sm:size-9"
      } shrink-0 rounded-full border border-white/15 bg-white/5 text-cream/80 shadow-xs transition-all hover:scale-105 hover:border-white/35 hover:bg-white/15 hover:text-cream active:scale-95`}
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
      className={`${
        compact ? "size-9" : "size-10 sm:size-11"
      } shrink-0 rounded-full border-0 bg-gradient-to-br from-[#f27a42] via-[#e2612a] to-[#c74c1a] text-charcoal shadow-[0_3px_14px_rgba(240,126,70,0.45),inset_0_1px_1px_rgba(255,255,255,0.45)] ring-1 ring-ember/40 transition-all hover:scale-105 hover:shadow-[0_4px_20px_rgba(240,126,70,0.65)] hover:brightness-110 active:scale-95`}
    >
      {player.isPlaying ? (
        <Pause className={compact ? "size-4" : "size-4.5 sm:size-5"} aria-hidden fill="currentColor" />
      ) : (
        <Play className={`${compact ? "size-4" : "size-4.5 sm:size-5"} translate-x-0.5`} aria-hidden fill="currentColor" />
      )}
    </Button>
  );
}

export function FullCassettePlayer() {
  const player = usePlayer();
  const [showVolume, setShowVolume] = useState(false);
  const display = getPlayerDisplay({
    nowPlaying: player.nowPlaying,
    track: player.track,
    musicBlocked: player.musicBlocked,
  });

  if (!player.room) return null;

  return (
    <div className="pointer-events-auto isolate relative w-full max-w-[min(94vw,34rem)] overflow-hidden rounded-2xl border border-white/15 bg-black/35 p-2.5 sm:p-3.5 text-cream shadow-[0_16px_40px_rgba(0,0,0,0.5),0_0_24px_rgba(240,126,70,0.06)] ring-1 ring-white/10 backdrop-blur-xl">
      {/* Specular top border sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" aria-hidden />

      {/* Top row: Track info + Live indicator */}
      <div className="flex items-center gap-2.5 border-b border-white/10 pb-2">
        <Cover coverId={display.coverId} title={display.title} />
        <div key={display.coverId ?? "idle"} className="min-w-0 flex-1 animate-fade-in">
          <p className="truncate font-cinema-display text-sm font-bold tracking-tight text-cream drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] sm:text-base">
            {display.title}
          </p>
          <p className="mt-0.5 truncate text-[10.5px] font-medium text-cream/70 sm:text-xs">
            {display.status === "unavailable" ? (
              <span className="text-red-300">Track unavailable</span>
            ) : (
              <>
                <span className="font-semibold text-ember">कलाकार</span> · {display.subtitle}
              </>
            )}
          </p>
        </div>
        <LiveEqualizer isPlaying={player.isPlaying} status={display.status} />
      </div>

      {/* Cassette Deck Body */}
      <div className="mt-2">
        <CassetteBody
          variant="full"
          isPlaying={player.isPlaying}
          label={player.room.scene.title_en}
        />
      </div>

      {/* Seekbar */}
      <div className="mt-2">
        <SeekBar />
      </div>

      {/* Bottom Controls Deck - Symmetrical & High-end */}
      <div className="mt-2 flex items-center justify-between gap-1.5 border-t border-white/10 pt-2">
        {/* Left: Volume toggle */}
        <div className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowVolume((current) => !current)}
            aria-expanded={showVolume}
            aria-label="Music volume"
            className={`size-8.5 sm:size-9 rounded-full border border-white/15 bg-white/5 text-cream/80 transition-all hover:bg-white/15 hover:text-cream hover:border-white/30 active:scale-95 ${
              showVolume
                ? "bg-ember text-charcoal shadow-[0_0_10px_rgba(240,126,70,0.5)] border-ember/60 font-semibold"
                : ""
            }`}
          >
            {player.musicVolume === 0 ? (
              <VolumeX className="size-3.5" aria-hidden />
            ) : player.musicVolume < 0.5 ? (
              <Volume1 className="size-3.5" aria-hidden />
            ) : (
              <Volume2 className="size-3.5" aria-hidden />
            )}
          </Button>
        </div>

        {/* Center: Master Transport Deck */}
        <div className="flex items-center gap-2 sm:gap-3">
          <TransportButton action={player.previous} label="Previous track">
            <SkipBack className="size-3.5 sm:size-4" aria-hidden />
          </TransportButton>
          <PlayButton />
          <TransportButton action={player.next} label="Next track">
            <SkipForward className="size-3.5 sm:size-4" aria-hidden />
          </TransportButton>
        </div>

        {/* Right: Ambience Control */}
        <div className="flex items-center justify-end">
          <AmbienceControl
            level={player.ambienceLevel}
            onLevelChange={player.setAmbienceLevel}
            enabled={player.ambienceEnabled}
            active={player.ambienceActive}
            status={player.ambienceStatus}
            onToggle={player.toggleAmbience}
          />
        </div>
      </div>

      {/* Expandable Volume Drawer */}
      <SmoothReveal open={showVolume} className="mt-2">
        <div className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
          <Volume2 className="size-3.5 shrink-0 text-ember" aria-hidden />
          <span className="w-14 shrink-0 text-[11px] font-semibold text-cream/80">Volume</span>
          <Slider
            value={[Math.round(player.musicVolume * 100)]}
            max={100}
            step={1}
            aria-label="Music volume"
            onValueChange={(value) => player.setMusicVolume((value[0] ?? 0) / 100)}
            className="flex-1"
          />
          <span className="w-8 text-right font-mono text-[11px] tabular-nums text-cream/70 font-semibold">
            {Math.round(player.musicVolume * 100)}%
          </span>
        </div>
      </SmoothReveal>
    </div>
  );
}

export function CompactCassettePlayer({ className = "" }: { className?: string }) {
  const player = usePlayer();
  const display = getPlayerDisplay({
    nowPlaying: player.nowPlaying,
    track: player.track,
    musicBlocked: player.musicBlocked,
  });

  if (!player.room) return null;

  return (
    <div
      className={`paper relative overflow-hidden border border-white/15 bg-black/40 text-cream shadow-[0_12px_40px_-8px_rgba(0,0,0,0.65)] backdrop-blur-xl ring-1 ring-white/5 ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" aria-hidden />
      <div className="mx-auto grid w-full max-w-5xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2 sm:grid-cols-[auto_auto_minmax(8rem,1fr)_auto] sm:gap-3 sm:px-4">
        <CassetteBody
          variant="compact"
          isPlaying={player.isPlaying}
          label={player.room.scene.title_en}
        />

        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-[9.5px] font-bold tracking-[0.16em] text-ember uppercase">
            {player.room.scene.title_en}
          </p>
          <p className="truncate font-cinema-display text-sm font-bold leading-tight text-cream drop-shadow-sm">
            {display.title}
          </p>
          <p className="truncate text-[10.5px] text-cream/60 font-medium">{display.subtitle}</p>
        </div>

        <div className="min-w-0">
          <div className="mb-1 flex items-center justify-between gap-2 min-w-0 sm:hidden">
            <p className="truncate font-cinema-display text-[12px] font-bold leading-tight text-cream">
              {display.title}
            </p>
            <span className="truncate text-[8.5px] text-cream/50 font-medium">{player.room.scene.title_en}</span>
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
              enabled={player.ambienceEnabled}
              active={player.ambienceActive}
              status={player.ambienceStatus}
              onToggle={player.toggleAmbience}
            />
          </div>
        </div>

        <div className="col-span-3 flex items-center justify-between gap-2 border-t border-white/10 pt-1.5 sm:hidden">
          <p className="min-w-0 truncate text-[9.5px] text-cream/55 font-medium" aria-live="polite">
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
            enabled={player.ambienceEnabled}
            active={player.ambienceActive}
            status={player.ambienceStatus}
            onToggle={player.toggleAmbience}
          />
        </div>
      </div>
    </div>
  );
}
