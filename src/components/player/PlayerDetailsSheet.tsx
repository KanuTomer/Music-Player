import { ExternalLink, ListMusic, Music2, Radio, Volume1, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { getPlayerDisplay } from "@/lib/player-display";
import { upcomingQueue } from "@/lib/queue";
import { usePlayer } from "@/lib/player";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

export function PlayerDetailsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const player = usePlayer();
  const [desktop, setDesktop] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 640px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => setVisibleCount(40), [player.room?.curatedSet.id]);

  if (!player.room) return null;
  const display = getPlayerDisplay({
    nowPlaying: player.nowPlaying,
    track: player.track,
    musicBlocked: player.musicBlocked,
  });
  const currentItem = player.playlist[player.nowPlaying.index] ?? null;
  const watchUrl = currentItem?.sources[0]?.source_url ?? null;
  const orderedQueue = upcomingQueue(player.playlist, player.nowPlaying.index);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={desktop ? "right" : "bottom"}
        className="max-h-[88dvh] overflow-y-auto border-cream/15 bg-charcoal text-cream motion-reduce:transition-none motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none sm:h-full sm:w-[min(30rem,94vw)]"
      >
        <SheetTitle className="pr-10 font-signage text-2xl text-cream">Player details</SheetTitle>
        <SheetDescription className="mt-1 text-sm text-cream/55">
          Verified playback information and listening controls.
        </SheetDescription>

        <div className="mt-6 space-y-5">
          <section className="rounded-2xl border border-cream/10 bg-night/45 p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-ember uppercase">
              <Radio className="size-3.5" aria-hidden /> Current Jagah
            </div>
            <p className="mt-2 font-deva text-xl text-cream">{player.room.scene.title_hi}</p>
            <p className="text-sm text-cream/60">{player.room.scene.title_en}</p>
          </section>

          <section className="rounded-2xl border border-cream/10 p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-cream/10 bg-night">
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
                <p className="truncate font-cinema-display text-lg text-cream">{display.title}</p>
                <p className="truncate text-xs text-cream/55">{display.subtitle}</p>
                <p className="mt-1 text-[10px] font-medium text-ember" aria-live="polite">
                  {display.status === "unavailable"
                    ? "Track unavailable — advancing automatically"
                    : display.status === "loading"
                      ? "Tuning in…"
                      : "Playing from YouTube"}
                </p>
              </div>
            </div>
            {watchUrl ? (
              <a
                href={watchUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-full border border-cream/15 text-xs font-semibold text-cream/70 hover:bg-cream/10 hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
              >
                <ExternalLink className="size-3.5" aria-hidden /> Open source on YouTube
              </a>
            ) : null}
          </section>

          <section className="rounded-2xl border border-cream/10 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-cream/70">
              <Waves className="size-4 text-teal-400" aria-hidden /> Ambience
              <span className="ml-auto capitalize text-cream/45">{player.ambienceStatus}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-cream/50">
              Three-layer location audio · {player.ambienceLevel}%
            </p>
            {player.room.ambience?.stems
              .flatMap((stem) => stem.sources)
              .map((source) => (
                <a
                  key={`${source.source_url}-${source.source_order}`}
                  href={source.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex min-h-10 items-center gap-2 rounded-xl border border-cream/10 px-3 text-[11px] text-cream/60 hover:bg-cream/10 hover:text-cream"
                >
                  <ExternalLink className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">{source.source_title}</span>
                </a>
              ))}
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

          <section className="rounded-2xl border border-cream/15 bg-cream/[0.03] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-cream/70">
              <ListMusic className="size-4 text-ember" aria-hidden /> Queue
              <span className="ml-auto tabular-nums text-cream/45">
                {player.playlist.length} tracks
              </span>
            </div>
            <ol className="mt-3 space-y-2" aria-label="Upcoming music queue">
              {orderedQueue.slice(0, visibleCount).map((item, queueIndex) => (
                <li
                  key={`${item.id}-${queueIndex}`}
                  className={`rounded-xl border px-3 py-2 ${queueIndex === 0 ? "border-ember/55 bg-ember/10" : "border-cream/10 bg-night/25"}`}
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
      </SheetContent>
    </Sheet>
  );
}
