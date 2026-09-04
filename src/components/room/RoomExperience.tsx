import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp, Compass, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { RoomPayload, Scene } from "@/lib/rooms.functions";
import { artFor } from "@/lib/scene-art";
import { videoForScene } from "@/lib/scene-media";
import { usePlayer } from "@/lib/player";
import { forDaypart } from "@/lib/dayparts";
import { useRoomSocial } from "@/hooks/useRoomSocial";
import { FullCassettePlayer } from "@/components/player/CassettePlayers";
import { OneLinerCaption } from "@/components/room/OneLinerCaption";
import { JagahExplorer } from "@/components/JagahExplorer";
import { InfoPlaceholderDialog } from "@/components/InfoPlaceholderDialog";
import { useJagahNavigation } from "@/hooks/useJagahNavigation";
import { AmbienceBackdrop } from "@/components/room/AmbienceBackdrop";
import { LiveChat } from "@/components/room/LiveChat";
import { useSupportAutoPrompt } from "@/hooks/useSupportPrompt";
import { useRoomAnalytics } from "@/hooks/useRoomAnalytics";

export function RoomExperience({ room, scenes }: { room: RoomPayload; scenes: Scene[] }) {
  const { scene, oneliners } = room;
  const player = usePlayer();
  useRoomAnalytics(scene.slug, player.isPlaying);
  const social = useRoomSocial(`scene:${scene.slug}`);
  const sceneVideo = videoForScene(scene.slug);
  const sceneVideoRef = useRef<HTMLVideoElement | null>(null);
  const explorerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [dialog, setDialog] = useState<"suggest" | "support" | null>(null);
  const { selectScene, switchingSlug } = useJagahNavigation({
    activeSlug: scene.slug,
    closeExplorer: () => setExplorerOpen(false),
  });

  useSupportAutoPrompt(() => setDialog("support"));

  useEffect(() => {
    player.openRoom(room);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.scene.slug]);

  useEffect(() => {
    const video = sceneVideoRef.current;
    if (!video || !sceneVideo) return;

    video.muted = true;
    video.defaultMuted = true;
    const play = () => void video.play().catch(() => undefined);
    const resumeWhenVisible = () => {
      if (document.visibilityState === "visible") play();
    };

    play();
    document.addEventListener("visibilitychange", resumeWhenVisible);
    window.addEventListener("pageshow", play);
    return () => {
      document.removeEventListener("visibilitychange", resumeWhenVisible);
      window.removeEventListener("pageshow", play);
    };
  }, [scene.slug, sceneVideo]);

  const lines = useMemo(() => forDaypart(oneliners, player.daypart), [oneliners, player.daypart]);

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
  // Scenes that are night-bound by nature keep their own light.
  const gradeless = scene.slug === "raat-ki-bus";
  const gradeClass = gradeless ? "" : `grade-${player.daypart}`;

  return (
    <div
      id="room-experience-top"
      className={`room-scene-enter relative h-dvh w-full overflow-hidden ${gradeClass} ${scene.is_dark ? "room-dark" : ""}`}
    >
      <div className="relative size-full overflow-hidden">
        {sceneVideo ? (
          <video
            ref={sceneVideoRef}
            key={scene.art_key}
            src={sceneVideo}
            poster={artFor(scene.art_key)}
            autoPlay
            preload="auto"
            muted
            loop
            playsInline
            disablePictureInPicture
            onCanPlay={(event) => void event.currentTarget.play().catch(() => undefined)}
            aria-label={`${scene.title_en} — ambient moving scene`}
            className="scene-media absolute inset-0 size-full object-cover scale-100 transition-transform duration-700"
          />
        ) : (
          <img
            key={scene.art_key}
            src={artFor(scene.art_key)}
            alt={`${scene.title_en} — ${scene.hook}`}
            width={1536}
            height={1024}
            fetchPriority="high"
            className="scene-media absolute inset-0 size-full object-cover scale-100 transition-transform duration-700"
            style={{
              objectPosition: scene.slug === "sainik-dhaba" ? "center 30%" : "center",
            }}
          />
        )}
        {(scene.slug === "doordarshan-shaam" || scene.slug === "papa-ke-gaane") && (
          <div className="scanlines pointer-events-none absolute inset-0 opacity-20" aria-hidden />
        )}
        <AmbienceBackdrop
          active={player.ambienceActive}
          level={player.ambienceLevel}
          eventPulse={player.ambienceEventPulse}
          profile={room.ambience}
          sceneSlug={scene.slug}
        />

        {/* top row: listener pill · support and share */}
        <div className="absolute inset-x-0 top-0 z-50 flex items-center justify-between gap-2 p-2 sm:gap-3 sm:p-3">
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-cream/12 bg-charcoal/60 px-2.5 py-1.5 backdrop-blur-md sm:gap-2 sm:px-3">
            <span
              className="animate-bulb inline-block size-1.5 rounded-full bg-ember"
              aria-hidden
            />
            <span className="text-[12px] font-semibold text-cream tabular-nums">
              {social.listeners}
            </span>
            <span className="text-[11px] text-cream/55">sun rahe hain</span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setDialog("support")}
              className="flex h-9 items-center justify-center rounded-full bg-ember border border-cream/15 px-3.5 text-xs font-bold text-charcoal transition-colors hover:bg-ember/90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream cursor-pointer"
            >
              Support Us
            </button>

            <button
              type="button"
              onClick={share}
              aria-label="Share this room"
              className="flex size-9 items-center justify-center rounded-full border border-cream/12 bg-charcoal/60 text-cream/80 backdrop-blur-md transition-colors hover:bg-charcoal/85 hover:text-cream"
            >
              <Share2 className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* room title, signage-style, centred */}
        <div className="pointer-events-none absolute inset-x-0 top-[clamp(4.75rem,10dvh,6.5rem)] z-20 flex flex-col items-center px-6 text-center">
          <h1 className="signage-text font-deva text-4xl leading-[1.05] text-cream sm:text-6xl">
            {scene.title_hi}
          </h1>
          <span className="mt-3 h-[2px] w-16 rounded-full bg-ember/80" aria-hidden />
          <p className="mt-3 text-[11px] font-semibold tracking-[0.3em] text-cream/55 uppercase sm:text-[13px]">
            {scene.title_en}
          </p>
        </div>

        <OneLinerCaption
          lines={lines}
          active={active}
          trackKey={player.nowPlaying?.title ?? player.track?.title ?? null}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 px-2 pb-[env(safe-area-inset-bottom)] sm:gap-3 sm:px-4">
          <LiveChat roomKey="global-chat" roomName={scene.title_en} inlineLauncher />
          <FullCassettePlayer />
          <button
            ref={explorerTriggerRef}
            type="button"
            aria-expanded={explorerOpen}
            aria-controls="jagah-explorer-sheet"
            onClick={() => setExplorerOpen(true)}
            className="pointer-events-auto flex min-h-11 w-full max-w-[min(97vw,54rem)] items-center justify-center gap-2 rounded-xl border border-cream/15 bg-charcoal/80 px-5 text-sm font-semibold text-cream shadow-lift outline-none backdrop-blur-lg transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-charcoal/95 focus-visible:ring-2 focus-visible:ring-ember motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <Compass className="size-4" aria-hidden />
            <span>Jagah Explorer</span>
            <ChevronUp className="size-4" aria-hidden />
          </button>
        </div>

        {player.needsGate && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center px-6 text-center">
            <div className="absolute inset-0 bg-charcoal/78 backdrop-blur-[4px]" aria-hidden />
            <div className="vignette absolute inset-0" aria-hidden />

            <div className="relative flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-cream/10 bg-charcoal/45 px-6 py-8 shadow-lift overflow-hidden">
              <span className="rounded-full border border-ember/50 px-3 py-[3px] text-[9.5px] font-bold tracking-[0.22em] text-ember uppercase relative z-10">
                {scene.region ?? scene.category} · live
              </span>
              <h2 className="signage-text font-deva text-3xl leading-tight text-cream relative z-10">
                {scene.title_hi}
              </h2>
              <p className="text-[12.5px] font-medium tracking-[0.22em] text-cream/55 uppercase relative z-10">
                {scene.title_en}
              </p>
              <p className="max-w-xs text-sm leading-relaxed text-cream/70 relative z-10">
                {scene.hook}
              </p>
              <button
                type="button"
                onClick={player.start}
                className="mt-2 flex items-center gap-2 rounded-full bg-ember px-7 py-3.5 text-sm font-bold text-charcoal shadow-lift transition-transform hover:scale-[1.03] active:scale-95 relative z-10"
              >
                <Sparkles className="size-4" aria-hidden />
                Andar aa jao — press play
              </button>
              <p className="text-[11px] text-cream/45 relative z-10">
                Headphones lagao. Ye kamra chalta rahega.
              </p>
            </div>
          </div>
        )}
      </div>

      <JagahExplorer
        scenes={scenes}
        activeSlug={scene.slug}
        open={explorerOpen}
        onOpenChange={setExplorerOpen}
        onSelect={selectScene}
        onPlaceholder={setDialog}
        switchingSlug={switchingSlug}
        triggerRef={explorerTriggerRef}
      />
      <InfoPlaceholderDialog
        kind="suggest"
        open={dialog === "suggest"}
        onOpenChange={(open) => setDialog(open ? "suggest" : null)}
        slug={scene.slug}
      />
      <InfoPlaceholderDialog
        kind="support"
        open={dialog === "support"}
        onOpenChange={(open) => setDialog(open ? "support" : null)}
        slug={scene.slug}
      />
    </div>
  );
}
