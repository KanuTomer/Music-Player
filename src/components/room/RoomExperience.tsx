import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Heart, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { RoomPayload, Scene } from "@/lib/rooms.functions";
import { artFor } from "@/lib/scene-art";
import { usePlayer } from "@/lib/player";
import { forDaypart } from "@/lib/dayparts";
import { useRoomSocial } from "@/hooks/useRoomSocial";
import { playGag } from "@/lib/ambience";
import { ControlCluster } from "@/components/room/ControlCluster";
import { OneLinerCaption } from "@/components/room/OneLinerCaption";
import { ThemeSwitcher } from "@/components/room/ThemeSwitcher";
import { ISTClock } from "@/components/ISTClock";
import nightBusVideo from "@/assets/theme-night-bus-moving.mp4.asset.json";

function gagFor(slug: string) {
  if (slug === "raat-ki-bus") return "horn";
  if (slug === "ganpati-pandal") return "bell";
  if (slug === "sarkari-daftar") return "thud";
  return "snip";
}

export function RoomExperience({
  room,
  scenes,
}: {
  room: RoomPayload;
  scenes: Scene[];
}) {
  const { scene, oneliners } = room;
  const player = usePlayer();
  const social = useRoomSocial(`scene:${scene.slug}`);
  const [gagKind] = useState(() => gagFor(scene.slug));

  useEffect(() => {
    player.openRoom(room);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.scene.slug]);

  const lines = useMemo(
    () => forDaypart(oneliners, player.daypart),
    [oneliners, player.daypart],
  );

  const share = async () => {
    const url = window.location.href;
    const text = `Main ${scene.title_en} mein baitha hoon — Sainik Dhaba`;
    if (navigator.share) {
      try {
        await navigator.share({ title: scene.title_en, text, url });
        return;
      } catch {
        /* dismissed */
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied — bhej do kisi ko");
  };

  const active = !player.needsGate && player.isPlaying;

  return (
    <div className={`room-scene-enter relative h-dvh w-full overflow-hidden ${scene.is_dark ? "room-dark" : ""}`}>
      {scene.slug === "raat-ki-bus" ? (
        <video
          key={scene.art_key}
          src={nightBusVideo.url}
          poster={artFor(scene.art_key)}
          autoPlay
          muted
          loop
          playsInline
          aria-label={`${scene.title_en} — moving night bus view`}
          className="bus-journey absolute inset-0 size-full object-cover"
        />
      ) : (
        <img
          key={scene.art_key}
          src={artFor(scene.art_key)}
          alt={`${scene.title_en} — ${scene.hook}`}
          width={1536}
          height={1024}
          fetchPriority="high"
          className={`absolute inset-0 size-full object-cover transition-[transform,opacity] duration-[12s] ${
            active ? "scale-105" : "scale-100"
          }`}
        />
      )}
      {scene.slug === "doordarshan-shaam" && (
        <div className="scanlines pointer-events-none absolute inset-0 opacity-20" aria-hidden />
      )}
      <div className="vignette pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-night/70 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-night/80 to-transparent"
        aria-hidden
      />

      {/* top row: live pill · change theme · share */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 p-3">
        <div className="flex items-center gap-2 rounded-full border border-cream/20 bg-night/45 px-3 py-1.5 backdrop-blur">
          <span className="animate-bulb inline-block size-1.5 rounded-full bg-accent" aria-hidden />
          <span className="text-[12px] font-semibold text-cream">{social.listeners}</span>
          <span className="text-[11px] text-cream/60">sun rahe hain</span>
          <span className="hidden text-cream/30 sm:inline">·</span>
          <ISTClock inherit className="hidden items-center gap-1.5 text-[11px] text-cream/65 sm:flex" />
        </div>

        <div className="flex items-center gap-2">
          <ThemeSwitcher scenes={scenes} currentSlug={scene.slug} />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={share}
            aria-label="Share this room"
            className="flex size-10 items-center justify-center rounded-full border border-cream/25 bg-night/45 text-cream backdrop-blur transition-colors hover:bg-night/70"
          >
            <Share2 className="size-4" aria-hidden />
          </button>
          <Link
            to="/my-dhaba"
            aria-label="My Dhaba — saved rooms"
            className="flex size-10 items-center justify-center rounded-full border border-cream/25 bg-night/45 text-cream backdrop-blur transition-colors hover:bg-night/70"
          >
            <Heart className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      {/* room title, signage-style, centred */}
      <div className="pointer-events-none absolute inset-x-0 top-[16dvh] z-20 px-6 text-center">
        <h1 className="signage-text font-deva text-4xl leading-[1.05] text-cream sm:text-6xl">
          {scene.title_hi}
        </h1>
        <p className="mt-1 text-[11px] font-semibold tracking-[0.24em] text-cream/60 uppercase sm:text-[13px]">
          {scene.title_en}
        </p>
      </div>

      <OneLinerCaption lines={lines} active={active} />

      {scene.gag_label && (
        <div className="absolute right-3 bottom-28 z-30 sm:bottom-24">
        {scene.gag_label && (
          <button
            type="button"
            onClick={() => playGag(gagKind)}
            className="rounded-full border border-cream/25 bg-night/45 px-2.5 py-1 text-[11px] font-semibold text-cream backdrop-blur transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {scene.gag_label}
          </button>
        )}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center px-3">
        <ControlCluster
          track={player.track}
          isPlaying={player.isPlaying}
          onToggle={player.toggle}
          onNext={player.next}
          ambience={player.ambienceVolume}
          ambienceEnabled={player.ambienceEnabled}
          onAmbience={player.setAmbience}
          onToggleAmbience={player.toggleAmbience}
          musicBlocked={player.musicBlocked}
        />
      </div>

      {player.needsGate && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center px-6 text-center">
          <div className="absolute inset-0 bg-night/72 backdrop-blur-[3px]" aria-hidden />
          <div className="vignette absolute inset-0" aria-hidden />

          <div className="relative flex w-full max-w-sm flex-col items-center gap-3">
            <span className="ticket bg-accent px-3 py-[3px] text-[9.5px] font-bold tracking-[0.18em] text-accent-foreground uppercase">
              {scene.region ?? scene.category} · live
            </span>
            <h2 className="signage-text font-deva text-3xl leading-tight text-cream">
              {scene.title_hi}
            </h2>
            <p className="text-[12.5px] font-medium tracking-[0.16em] text-cream/60 uppercase">
              {scene.title_en}
            </p>
            <p className="max-w-xs text-sm leading-relaxed text-cream/80">{scene.hook}</p>
            <button
              type="button"
              onClick={player.start}
              className="animate-bulb mt-2 flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-bold text-accent-foreground shadow-lift transition-transform hover:scale-[1.03] active:scale-95"
            >
              <Sparkles className="size-4" aria-hidden />
              Andar aa jao — press play
            </button>
            <p className="text-[11px] text-cream/55">
              Headphones lagao. Ye kamra chalta rahega.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
