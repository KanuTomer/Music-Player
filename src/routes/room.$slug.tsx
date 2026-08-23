import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Heart, Share2, Sparkles } from "lucide-react";
import { getRoom, listScenes } from "@/lib/rooms.functions";
import { artFor } from "@/lib/scene-art";
import { usePlayer } from "@/lib/player";
import { forDaypart } from "@/lib/dayparts";
import { useRoomSocial } from "@/hooks/useRoomSocial";
import { playGag } from "@/lib/ambience";
import { ControlCluster } from "@/components/room/ControlCluster";
import { OneLinerCaption } from "@/components/room/OneLinerCaption";
import { FloatingEmojiLayer } from "@/components/room/FloatingEmojiLayer";
import { RadioDialSwitcher } from "@/components/room/RadioDialSwitcher";
import { ISTClock } from "@/components/ISTClock";
import { toast } from "sonner";

export const Route = createFileRoute("/room/$slug")({
  loader: async ({ params }) => {
    const [room, scenes] = await Promise.all([
      getRoom({ data: { slug: params.slug } }),
      listScenes(),
    ]);
    if (!room) throw notFound();
    return { room, scenes };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Room unavailable — Sainik Dhaba" }, { name: "robots", content: "noindex" }],
      };
    }
    const { scene } = loaderData.room;
    const title = `${scene.title_hi} / ${scene.title_en} — Sainik Dhaba`;
    return {
      meta: [
        { title },
        { name: "description", content: scene.hook },
        { property: "og:title", content: title },
        { property: "og:description", content: scene.hook },
      ],
    };
  },
  component: RoomPage,
  notFoundComponent: RoomNotFound,
  errorComponent: RoomError,
});

const REACTIONS = ["👏", "❤️", "🔥"];

function RoomPage() {
  const { room, scenes } = Route.useLoaderData();
  const { scene, oneliners } = room;
  const player = usePlayer();
  const social = useRoomSocial(`scene:${scene.slug}`);
  const [gagKind] = useState(() =>
    scene.slug === "raat-ki-bus"
      ? "horn"
      : scene.slug === "ganpati-pandal"
        ? "bell"
        : scene.slug === "sarkari-daftar"
          ? "thud"
          : "snip",
  );

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
        /* user dismissed */
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied — bhej do kisi ko");
  };

  const active = !player.needsGate && player.isPlaying;

  return (
    <div
      className={`relative h-dvh w-full overflow-hidden ${scene.is_dark ? "room-dark" : ""}`}
    >
      <img
        src={artFor(scene.art_key)}
        alt={`${scene.title_en} — ${scene.hook}`}
        width={1536}
        height={1024}
        className={`absolute inset-0 size-full object-cover transition-transform duration-[12s] ${
          active ? "scale-105" : "scale-100"
        }`}
      />
      <div className="halftone pointer-events-none absolute inset-0 opacity-25" aria-hidden />
      {scene.slug === "doordarshan-shaam" && (
        <div className="scanlines pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      )}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/55 via-transparent to-background/70"
        aria-hidden
      />

      {/* top row */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-3">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            aria-label="Back to all rooms"
            className="flex size-10 items-center justify-center rounded-full border border-border/70 bg-background/80 backdrop-blur"
          >
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
          <div className="paper rounded-lg border border-border/60 bg-background/75 px-2.5 py-1 backdrop-blur">
            <p className="font-signage z-2 text-sm leading-tight font-bold">
              {scene.title_hi} / {scene.title_en}
            </p>
            <p className="z-2 flex items-center gap-2 text-[11px] leading-tight text-muted-foreground">
              <span>{social.listeners} sun rahe hain</span>
              <ISTClock />
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={share}
            aria-label="Share this room"
            className="flex size-10 items-center justify-center rounded-full border border-border/70 bg-background/80 backdrop-blur"
          >
            <Share2 className="size-4" aria-hidden />
          </button>
          <RadioDialSwitcher scenes={scenes} currentSlug={scene.slug} />
        </div>
      </div>

      <OneLinerCaption lines={lines} active={active} />
      <FloatingEmojiLayer items={social.floating} />

      {/* reactions + gag */}
      <div className="absolute right-3 bottom-28 z-30 flex flex-col items-center gap-2 sm:bottom-24">
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => social.react(emoji)}
            aria-label={`React with ${emoji}`}
            className="flex size-11 items-center justify-center rounded-full border border-border/70 bg-background/80 text-xl backdrop-blur transition-transform active:scale-90"
          >
            {emoji}
          </button>
        ))}
        {scene.gag_label && (
          <button
            type="button"
            onClick={() => playGag(gagKind)}
            className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-medium backdrop-blur"
          >
            {scene.gag_label}
          </button>
        )}
      </div>

      {/* control cluster */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center px-3">
        <ControlCluster
          track={player.track}
          isPlaying={player.isPlaying}
          onToggle={player.toggle}
          onNext={player.next}
          ambience={player.ambienceVolume}
          onAmbience={player.setAmbience}
          musicBlocked={player.musicBlocked}
        />
      </div>

      {/* autoplay gate */}
      {player.needsGate && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-background/70 px-6 text-center backdrop-blur-sm">
          <p className="font-signage text-2xl leading-tight font-extrabold">
            {scene.title_hi}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">{scene.hook}</p>
          <button
            type="button"
            onClick={player.start}
            className="mt-1 flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-transform active:scale-95"
          >
            <Sparkles className="size-4" aria-hidden />
            Andar aa jao — press play
          </button>
          <p className="text-[11px] text-muted-foreground">
            Headphones lagao. Ye kamra chalta rahega.
          </p>
        </div>
      )}
    </div>
  );
}

function RoomNotFound() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <Heart className="size-6 text-primary" aria-hidden />
      <p className="font-signage text-xl font-bold">Ye kamra band hai</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        This room does not exist — maybe it was remixed away.
      </p>
      <Link
        to="/"
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        All rooms
      </Link>
    </div>
  );
}

function RoomError() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="font-signage text-xl font-bold">Signal kamzor hai</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        We could not tune into this room. Try again in a moment.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Retry
      </button>
    </div>
  );
}
