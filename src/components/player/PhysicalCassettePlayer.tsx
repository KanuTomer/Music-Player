import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { PhysicalCassetteBody } from "@/components/player/PhysicalCassetteBody";
import { getPlayerDisplay } from "@/lib/player-display";
import { physicalCassetteLabels } from "@/lib/physical-cassette";
import { usePlayer } from "@/lib/player";

const CASSETTE_CUE_URL = "/local-audio/cassette-tape.wav";
const CASSETTE_CUE_DURATION_MS = 1200;
const CASSETTE_REWIND_URL = "/local-audio/cassette-rewind.wav";
const CASSETTE_REWIND_DURATION_MS = 3000;
const CASSETTE_REWIND_PLAYBACK_RATE = 4.992 / 3;

function usePrefersReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduceMotion;
}

function useCassetteTransportCue() {
  const audioRef = useRef(new Set<HTMLAudioElement>());
  const timerRef = useRef(new Set<number>());

  useEffect(
    () => () => {
      for (const timer of timerRef.current) window.clearTimeout(timer);
      for (const audio of audioRef.current) {
        audio.onended = null;
        audio.pause();
        audio.src = "";
      }
      timerRef.current.clear();
      audioRef.current.clear();
    },
    [],
  );

  return () => {
    const cue = new Audio(CASSETTE_CUE_URL);
    cue.volume = 0.22;
    cue.preload = "auto";
    audioRef.current.add(cue);
    cue.onended = () => audioRef.current.delete(cue);
    void cue.play().catch(() => audioRef.current.delete(cue));
    const timer = window.setTimeout(() => {
      cue.onended = null;
      cue.pause();
      cue.currentTime = 0;
      audioRef.current.delete(cue);
      timerRef.current.delete(timer);
    }, CASSETTE_CUE_DURATION_MS);
    timerRef.current.add(timer);
  };
}

function useCassetteRewindSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    if (!audioRef.current) return;
    audioRef.current.onended = null;
    audioRef.current.pause();
    audioRef.current.src = "";
    audioRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  return useCallback(() => {
    stop();
    const rewind = new Audio(CASSETTE_REWIND_URL);
    rewind.volume = 0.3;
    rewind.preload = "auto";
    rewind.playbackRate = CASSETTE_REWIND_PLAYBACK_RATE;
    rewind.preservesPitch = false;
    audioRef.current = rewind;
    rewind.onended = () => {
      if (audioRef.current === rewind) audioRef.current = null;
    };
    void rewind.play().catch(() => {
      if (audioRef.current === rewind) audioRef.current = null;
    });
    timerRef.current = window.setTimeout(stop, CASSETTE_REWIND_DURATION_MS + 120);
  }, [stop]);
}

function DeckControl({
  action,
  label,
  children,
  primary = false,
  disabled = false,
}: {
  action: () => void;
  label: string;
  children: ReactNode;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        action();
        e.currentTarget.blur();
      }}
      disabled={disabled}
      aria-label={label}
      className={`grid size-11 cursor-pointer place-items-center rounded-lg border shadow-[inset_0_1px_rgba(255,255,255,0.22),0_2px_3px_rgba(0,0,0,0.36)] transition-[transform,background-color,box-shadow] hover:-translate-y-px active:translate-y-[1px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember sm:size-[3.75rem] ${
        primary
          ? "border-[#d27e36] bg-[linear-gradient(180deg,#d87537,#9d451e)] text-[#241209]"
          : "border-[#9f773f]/55 bg-[linear-gradient(180deg,#4a3421,#281a11)] text-[#ebd7a9]"
      }`}
    >
      {children}
    </button>
  );
}

export function PhysicalCassettePlayer() {
  const player = usePlayer();
  const cue = useCassetteTransportCue();
  const rewindSound = useCassetteRewindSound();
  const reduceMotion = usePrefersReducedMotion();
  const rewindRafRef = useRef<number | null>(null);
  const [rewindProgress, setRewindProgress] = useState<number | null>(null);
  const display = getPlayerDisplay({
    nowPlaying: player.nowPlaying,
    track: player.track,
    musicBlocked: player.musicBlocked,
  });

  const progress =
    player.nowPlaying.duration > 0 ? player.nowPlaying.position / player.nowPlaying.duration : 0;
  const labels = physicalCassetteLabels({
    jagah: player.room?.scene.title_en ?? "Cassette",
    display,
    transitioning: player.musicTransitioning,
  });
  const startRewind = (direction: "next" | "previous") => {
    if (player.musicTransitioning) return;
    if (rewindRafRef.current != null) cancelAnimationFrame(rewindRafRef.current);
    setRewindProgress(progress);
    if (!reduceMotion) {
      const startedAt = performance.now();
      const animateTape = (now: number) => {
        const elapsed = Math.min(1, (now - startedAt) / CASSETTE_REWIND_DURATION_MS);
        const eased = elapsed < 0.5 ? 4 * elapsed ** 3 : 1 - (-2 * elapsed + 2) ** 3 / 2;
        setRewindProgress(progress * (1 - eased));
        if (elapsed < 1) rewindRafRef.current = requestAnimationFrame(animateTape);
        else rewindRafRef.current = null;
      };
      rewindRafRef.current = requestAnimationFrame(animateTape);
    }
    rewindSound();
    player[direction]({ delayMs: CASSETTE_REWIND_DURATION_MS, forcePlay: true });
  };

  useEffect(
    () => () => {
      if (rewindRafRef.current != null) cancelAnimationFrame(rewindRafRef.current);
      player.cancelPendingTrackChange();
    },
    [player.cancelPendingTrackChange],
  );

  useEffect(() => {
    if (!player.musicTransitioning) setRewindProgress(null);
  }, [player.musicTransitioning]);

  if (!player.room) return null;

  return (
    <div
      data-physical-cassette-player
      className="pointer-events-auto relative rounded-md border border-[#b98745]/35 bg-[linear-gradient(145deg,rgba(30,20,14,0.97),rgba(10,7,6,0.98))] p-2 text-cream shadow-[0_14px_30px_rgba(0,0,0,0.5),inset_0_1px_rgba(255,225,170,0.09)] sm:p-2.5"
      style={{ width: "min(92vw, 30rem, calc(42dvh * 1.92))" }}
    >
      <div className="flex items-stretch gap-2.5 sm:gap-3">
        <div className="min-w-0 flex-1">
          <PhysicalCassetteBody
            isPlaying={player.isPlaying && !player.musicTransitioning}
            isRewinding={!reduceMotion && player.musicTransitioning}
            reduceMotion={reduceMotion}
            label={player.room.scene.title_en}
            progress={rewindProgress ?? progress}
            title={labels.title}
            artist={labels.artist}
            faceColor={player.room.scene.palette.cool}
            accentColor={player.room.scene.palette.accent2 ?? player.room.scene.palette.accent}
          />
        </div>
        <div className="flex shrink-0 flex-col justify-center gap-1.5 pr-0.5">
          <DeckControl
            action={() => startRewind("next")}
            label="Next track"
            disabled={player.musicTransitioning}
          >
            <SkipForward className="size-5 sm:size-6" aria-hidden="true" />
          </DeckControl>
          <DeckControl
            action={() => {
              cue();
              player.toggle();
            }}
            label={player.isPlaying ? "Pause" : "Play"}
            primary
            disabled={player.musicTransitioning}
          >
            {player.isPlaying ? (
              <Pause className="size-5 sm:size-6" aria-hidden="true" strokeWidth={2.2} />
            ) : (
              <Play
                className="size-5 sm:size-6"
                aria-hidden="true"
                strokeWidth={2.2}
                strokeLinejoin="round"
              />
            )}
          </DeckControl>
          <DeckControl
            action={() => startRewind("previous")}
            label="Previous track"
            disabled={player.musicTransitioning}
          >
            <SkipBack className="size-5 sm:size-6" aria-hidden="true" />
          </DeckControl>
        </div>
      </div>
    </div>
  );
}
