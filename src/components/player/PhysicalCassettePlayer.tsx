import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { PhysicalCassetteBody } from "@/components/player/PhysicalCassetteBody";
import { getPlayerDisplay } from "@/lib/player-display";
import { physicalCassetteLabels } from "@/lib/physical-cassette";
import { usePlayer } from "@/lib/player";

const CASSETTE_CUE_URL = "/local-audio/cassette-tape.wav";
const CASSETTE_CUE_DURATION_MS = 1200;

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

function DeckControl({
  action,
  label,
  children,
  primary = false,
}: {
  action: () => void;
  label: string;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={action}
      aria-label={label}
      className={`grid size-11 cursor-pointer place-items-center rounded-lg border shadow-[inset_0_1px_rgba(255,255,255,0.22),0_2px_3px_rgba(0,0,0,0.36)] transition-[transform,background-color,box-shadow] hover:-translate-y-px active:translate-y-[1px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember sm:size-[3.75rem] ${
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
  const display = getPlayerDisplay({
    nowPlaying: player.nowPlaying,
    track: player.track,
    musicBlocked: player.musicBlocked,
  });

  if (!player.room) return null;

  const progress =
    player.nowPlaying.duration > 0 ? player.nowPlaying.position / player.nowPlaying.duration : 0;
  const labels = physicalCassetteLabels({
    jagah: player.room.scene.title_en,
    display,
    transitioning: player.musicTransitioning,
  });
  const changeTrack = (action: () => void) => {
    cue();
    action();
  };

  return (
    <div
      data-physical-cassette-player
      className="pointer-events-auto relative rounded-md border border-[#b98745]/35 bg-[linear-gradient(145deg,rgba(30,20,14,0.97),rgba(10,7,6,0.98))] p-2 text-cream shadow-[0_14px_30px_rgba(0,0,0,0.5),inset_0_1px_rgba(255,225,170,0.09)] sm:p-2.5"
      style={{ width: "min(92vw, 30rem, calc(42dvh * 1.92))" }}
    >
      <div className="flex items-stretch gap-2.5 sm:gap-3">
        <div className="min-w-0 flex-1">
          <PhysicalCassetteBody
            isPlaying={player.isPlaying}
            label={player.room.scene.title_en}
            progress={progress}
            title={labels.title}
            artist={labels.artist}
            faceColor={player.room.scene.palette.cool}
            accentColor={player.room.scene.palette.accent2 ?? player.room.scene.palette.accent}
          />
        </div>
        <div className="flex shrink-0 flex-col justify-center gap-1.5 pr-0.5">
          <DeckControl action={() => changeTrack(player.next)} label="Next track">
            <SkipForward className="size-5 sm:size-6" aria-hidden="true" />
          </DeckControl>
          <DeckControl
            action={() => {
              cue();
              player.toggle();
            }}
            label={player.isPlaying ? "Pause" : "Play"}
            primary
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
          <DeckControl action={() => changeTrack(player.previous)} label="Previous track">
            <SkipBack className="size-5 sm:size-6" aria-hidden="true" />
          </DeckControl>
        </div>
      </div>
    </div>
  );
}
