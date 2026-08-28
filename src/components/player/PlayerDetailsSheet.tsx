import { ExternalLink, ListMusic, Music2, Radio, Volume1 } from "lucide-react";
import { useEffect, useState } from "react";
import { getPlayerDisplay } from "@/lib/player-display";
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

  useEffect(() => {
    const media = window.matchMedia("(min-width: 640px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  if (!player.room) return null;
  const display = getPlayerDisplay({
    nowPlaying: player.nowPlaying,
    track: player.track,
    musicBlocked: player.musicBlocked,
  });
  const watchUrl = player.nowPlaying.videoId
    ? `https://www.youtube.com/watch?v=${player.nowPlaying.videoId}`
    : player.track
      ? `https://music.youtube.com/search?q=${encodeURIComponent(player.track.search_query ?? player.track.title)}`
      : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={desktop ? "right" : "bottom"}
        className="max-h-[88dvh] overflow-y-auto border-cream/15 bg-charcoal text-cream motion-reduce:transition-none motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none sm:h-full sm:w-[min(26rem,92vw)]"
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

          <section className="rounded-2xl border border-dashed border-cream/15 bg-cream/[0.03] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-cream/70">
              <ListMusic className="size-4 text-ember" aria-hidden /> Queue
            </div>
            <p className="mt-2 text-xs leading-relaxed text-cream/50">
              The authoritative queue and upcoming-track details arrive in Milestone 4.
            </p>
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
