import { ListMusic, Music2, Radio, Volume1, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { getPlayerDisplay } from "@/lib/player-display";
import { upcomingQueue } from "@/lib/queue";
import { usePlayer } from "@/lib/player";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { AmbienceControl } from "@/components/player/AmbienceControl";

export function PlayerDetailsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const player = usePlayer();
  const [visibleCount, setVisibleCount] = useState(40);

  useEffect(() => setVisibleCount(40), [player.room?.curatedSet.id]);

  if (!player.room) return null;
  const display = getPlayerDisplay({
    nowPlaying: player.nowPlaying,
    track: player.track,
    musicBlocked: player.musicBlocked,
  });
  const orderedQueue = upcomingQueue(player.playlist, player.nowPlaying.index);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88dvh] w-[min(94vw,58rem)] max-w-none flex-col gap-0 overflow-hidden border-cream/15 bg-charcoal p-0 text-cream sm:rounded-2xl">
        <header className="shrink-0 border-b border-cream/10 px-5 py-4 pr-16 sm:px-6 sm:py-5">
          <DialogTitle className="font-signage text-2xl text-cream">Player details</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-cream/55">
            Queue, ambience and listening controls.
          </DialogDescription>
        </header>

        <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="space-y-4">
              <section className="rounded-2xl border border-cream/10 bg-night/45 p-4">
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-ember uppercase">
                  <Radio className="size-3.5" aria-hidden /> Current Jagah
                </div>
                <p className="mt-2 font-deva text-xl text-cream">{player.room.scene.title_hi}</p>
                <p className="text-sm text-cream/60">{player.room.scene.title_en}</p>
              </section>

              <section className="rounded-2xl border border-cream/10 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-cream/10 bg-night">
                    {display.coverId ? (
                      <img
                        src={`https://i.ytimg.com/vi/${display.coverId}/mqdefault.jpg`}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <Music2 className="size-4 text-ember" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base sm:text-lg font-bold text-cream">
                      {display.title}
                    </p>
                    <p className="truncate text-xs text-cream/70 mt-0.5">{display.subtitle}</p>
                    <p className="mt-1 text-[10px] font-medium text-ember" aria-live="polite">
                      {display.status === "unavailable"
                        ? "Track unavailable — advancing automatically"
                        : display.status === "loading"
                          ? "Tuning in…"
                          : "Now playing"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-cream/10 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-cream/70">
                  <Waves className="size-4 text-teal-400" aria-hidden /> Ambience
                  <span className="ml-auto capitalize text-cream/45">
                    {player.ambienceEnabled ? player.ambienceStatus : "off"}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-cream/50">
                  Location atmosphere · {player.ambienceLevel}%
                </p>
                <div className="mt-4 flex justify-start">
                  <AmbienceControl
                    level={player.ambienceLevel}
                    onLevelChange={player.setAmbienceLevel}
                    enabled={player.ambienceEnabled}
                    active={player.ambienceActive}
                    status={player.ambienceStatus}
                    onToggle={player.toggleAmbience}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-cream/10 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-cream/70">
                  <Volume1 className="size-4" aria-hidden /> Music volume
                  <span className="ml-auto tabular-nums text-cream/45">
                    {Math.round(player.musicVolume * 100)}%
                  </span>
                </div>
                <Slider
                  value={[Math.round(player.musicVolume * 100)]}
                  max={100}
                  step={1}
                  aria-label="Music volume"
                  onValueChange={(value) => player.setMusicVolume((value[0] ?? 0) / 100)}
                  className="mt-4"
                />
              </section>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  player.leave();
                  onOpenChange(false);
                }}
                className="min-h-11 w-full rounded-full border border-cream/15 text-cream/65 hover:bg-cream/10 hover:text-cream"
              >
                End listening session
              </Button>
            </div>

            <section className="min-h-0 rounded-2xl border border-cream/15 bg-cream/[0.03] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-cream/70">
                <ListMusic className="size-4 text-ember" aria-hidden /> Queue
                <span className="ml-auto tabular-nums text-cream/45">
                  {player.playlist.length} tracks
                </span>
              </div>
              <ol
                className="mt-3 max-h-[48dvh] space-y-2 overflow-y-auto pr-1 lg:max-h-[58dvh]"
                aria-label="Upcoming music queue"
              >
                {orderedQueue.slice(0, visibleCount).map((item, queueIndex) => (
                  <li
                    key={`${item.id}-${queueIndex}`}
                    className={`rounded-xl border px-3 py-2 ${
                      queueIndex === 0
                        ? "border-ember/55 bg-ember/10"
                        : "border-cream/10 bg-night/25"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-8 shrink-0 pt-0.5 text-[10px] font-bold tracking-wide text-ember uppercase">
                        {queueIndex === 0 ? "Now" : queueIndex === 1 ? "Next" : `+${queueIndex}`}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-cream">
                          {item.track.title}
                        </p>
                        <p className="truncate text-[11px] text-cream/50">
                          {[item.track.artist, item.track.year].filter(Boolean).join(" · ") ||
                            "Artist unavailable"}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              {visibleCount < orderedQueue.length ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setVisibleCount((count) => count + 40)}
                  className="mt-3 min-h-11 w-full rounded-full border border-cream/10 text-xs text-cream/65 hover:bg-cream/10"
                >
                  Show 40 more
                </Button>
              ) : null}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
