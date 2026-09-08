import { useEffect, useMemo, useRef, useState } from "react";
import { Compass, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  getRoomPresentation,
  type RoomPayload,
  type RoomPresentation,
  type Scene,
} from "@/lib/rooms.functions";
import { backgroundFor } from "@/lib/scene-art";
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
import { AmbienceEventButton } from "@/components/room/AmbienceEventButton";
import { useSupportAutoPrompt } from "@/hooks/useSupportPrompt";
import { useRoomAnalytics } from "@/hooks/useRoomAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { isLightTextColor, sceneTextShadow, sceneTextStroke } from "@/lib/scene-presentation";
import { useLiveScenes } from "@/hooks/useLiveScenes";

export function RoomExperience({
  room,
  scenes,
  initialTrackId,
}: {
  room: RoomPayload;
  scenes: Scene[];
  initialTrackId?: string | undefined;
}) {
  const { scene, oneliners } = room;
  const [presentation, setPresentation] = useState<RoomPresentation>({
    scene_id: scene.id,
    background_storage_path: scene.background_storage_path,
    background_url: scene.background_url,
    foreground_text_color: scene.foreground_text_color,
    gag_label: scene.gag_label,
    oneliners,
  });
  const liveScenes = useLiveScenes(scenes);
  const liveScene = {
    ...scene,
    background_storage_path: presentation.background_storage_path,
    background_url: presentation.background_url,
    foreground_text_color: presentation.foreground_text_color,
    gag_label: presentation.gag_label,
  };
  const player = usePlayer();
  useRoomAnalytics(scene.slug, player.isPlaying);
  const social = useRoomSocial(`scene:${scene.slug}`);
  const sceneVideo = presentation.background_url ? null : videoForScene(scene.slug);
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
    player.openRoom(room, initialTrackId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.scene.slug, initialTrackId]);

  useEffect(() => {
    const refresh = () => {
      void getRoomPresentation({ data: { sceneId: scene.id } })
        .then((next) => {
          if (next) setPresentation(next);
        })
        .catch(() => undefined);
    };
    const channel = supabase
      .channel(`room-presentation:${scene.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "scenes", filter: `id=eq.${scene.id}` },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "oneliners",
        },
        (payload) => {
          const record = payload.eventType === "DELETE" ? payload.old : payload.new;
          if (record["scene_id"] === scene.id) refresh();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [scene.id]);

  useEffect(() => {
    const refresh = () => {
      void getRoomPresentation({ data: { sceneId: scene.id } })
        .then((next) => {
          if (next) setPresentation(next);
        })
        .catch(() => undefined);
    };
    const channel = supabase
      .channel(`room-presentation:${scene.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "scenes", filter: `id=eq.${scene.id}` },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "oneliners",
        },
        (payload) => {
          const record = payload.eventType === "DELETE" ? payload.old : payload.new;
          if (record["scene_id"] === scene.id) refresh();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [scene.id]);

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

  const lines = useMemo(
    () => forDaypart(presentation.oneliners, player.daypart),
    [player.daypart, presentation.oneliners],
  );

  const share = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/room/${scene.slug}`;
    const title = `Sainik Dhaba · ${scene.title_en} 📻`;
    const text = `Main ${scene.title_en} mein baitha hoon — Sainik Dhaba`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        /* dismissed */
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      toast.success("Link copy ho gaya — bhej do kisi ko", {
        description: "Room ka link copy ho gaya hai.",
      });
    }
  };

  const active = player.isPlaying;
  const isCorporate = scene.slug === "corporate-majdoor";
  const foregroundTextShadow = sceneTextShadow(presentation.foreground_text_color);
  const foregroundTextStroke = sceneTextStroke(presentation.foreground_text_color);
  // Scenes that are night-bound or specifically unshaded by nature keep their own light.
  const gradeless = scene.slug === "raat-ki-bus" || isCorporate;
  const gradeClass = gradeless ? "" : `grade-${player.daypart}`;

  return (
    <div
      id="room-experience-top"
      data-scene={scene.slug}
      className={`room-scene-enter relative h-dvh w-full overflow-hidden ${gradeClass} ${scene.is_dark ? "room-dark" : ""}`}
    >
      <div className="relative size-full overflow-hidden">
        {sceneVideo ? (
          <video
            ref={sceneVideoRef}
            key={scene.art_key}
            src={sceneVideo}
            poster={backgroundFor(liveScene)}
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
            src={backgroundFor(liveScene)}
            alt={`${scene.title_en} — ${scene.hook}`}
            width={1536}
            height={1024}
            fetchPriority="high"
            className="scene-media absolute inset-0 size-full object-cover scale-100 transition-transform duration-700"
          />
        )}
        {(scene.slug === "doordarshan-shaam" || scene.slug === "papa-ke-gaane") && (
          <div className="scanlines pointer-events-none absolute inset-0 opacity-20" aria-hidden />
        )}
        {scene.slug === "sainik-dhaba" ? (
          <div
            className="sainik-night-veil pointer-events-none absolute inset-0 z-[9]"
            aria-hidden
          />
        ) : null}
        <AmbienceBackdrop
          active={player.ambienceActive}
          level={player.ambienceLevel}
          eventPulse={player.ambienceEventPulse}
          profile={room.ambience}
          sceneSlug={scene.slug}
        />

        {/* Contrast Scrims for text legibility on light/bright artwork — skipped for corporate-majdoor */}
        {!isCorporate && (
          <>
            <div
              className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-48 bg-gradient-to-b sm:h-56 ${
                isLightTextColor(presentation.foreground_text_color)
                  ? "from-black/75 via-black/35 to-transparent"
                  : "from-white/55 via-white/20 to-transparent"
              }`}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-44 sm:h-52 bg-gradient-to-t from-black/80 via-black/35 to-transparent z-10"
              aria-hidden
            />
          </>
        )}

        {/* top header: listener pill · top center jagah explorer · support & share */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-center justify-between p-2 sm:p-3">
          {/* Left: listener pill */}
          <div className="pointer-events-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-cream/12 bg-charcoal/60 px-2.5 py-1.5 shadow-md backdrop-blur-md sm:px-3">
              <span
                className="animate-bulb inline-block size-1.5 rounded-full bg-ember"
                aria-hidden
              />
              <span className="text-[11px] font-semibold text-cream tabular-nums sm:text-[12px]">
                {social.listeners}
              </span>
              <span className="hidden text-[11px] text-cream/55 sm:inline">sun rahe hain</span>
            </div>
          </div>

          {/* Center: Jagah Explorer (Responsive centered on mobile, absolute dead-center on sm+) */}
          <div className="pointer-events-none flex shrink-0 sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:top-3">
            <button
              ref={explorerTriggerRef}
              type="button"
              aria-expanded={explorerOpen}
              aria-controls="jagah-explorer-sheet"
              onClick={() => setExplorerOpen(true)}
              className="pointer-events-auto flex min-h-8.5 sm:min-h-10 items-center justify-center gap-1 sm:gap-2 rounded-xl border border-white/15 bg-black/45 px-2.5 sm:px-4 text-[11px] sm:text-sm font-semibold text-cream shadow-md outline-none backdrop-blur-xl transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-ember motion-reduce:transition-none motion-reduce:hover:translate-y-0 cursor-pointer"
            >
              <Compass className="size-3.5 sm:size-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Jagah Explorer</span>
              <span className="sm:hidden">Jagah Explore</span>
            </button>
          </div>

          {/* Right: live chat, support and share */}
          <div className="pointer-events-auto flex shrink-0 items-center gap-1 sm:gap-2 ml-3.5 sm:ml-0">
            <LiveChat roomKey="global-chat" roomName={scene.title_en} inlineLauncher />

            <button
              type="button"
              onClick={() => setDialog("support")}
              className="flex h-8.5 sm:h-9 items-center justify-center rounded-full bg-ember border border-cream/15 px-2.5 sm:px-3.5 text-[11px] sm:text-xs font-bold text-charcoal transition-colors hover:bg-ember/90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream cursor-pointer shadow-md"
            >
              <span className="hidden sm:inline">Support Us</span>
              <span className="sm:hidden">Support</span>
            </button>

            <button
              type="button"
              onClick={share}
              aria-label="Share this room"
              className="flex size-8.5 sm:size-9 items-center justify-center rounded-full border border-cream/12 bg-charcoal/60 text-cream/80 backdrop-blur-md transition-colors hover:bg-charcoal/85 hover:text-cream cursor-pointer shadow-md"
            >
              <Share2 className="size-3.5 sm:size-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* room title, signage-style, centred with high-contrast legibility */}
        <div className="pointer-events-none absolute inset-x-0 top-[clamp(4.5rem,9.5dvh,7rem)] z-20 flex flex-col items-center px-3 text-center pt-[env(safe-area-inset-top)]">
          <h1
            className="font-deva text-5xl leading-[1.02] font-black sm:text-7xl md:text-[clamp(4rem,9.5dvh,7rem)]"
            style={{
              color: presentation.foreground_text_color,
              textShadow: foregroundTextShadow,
              ...foregroundTextStroke,
            }}
          >
            {scene.title_hi}
          </h1>
          <span
            className="mt-2.5 sm:mt-3 h-[3.5px] sm:h-[4.5px] w-20 sm:w-32 rounded-full bg-ember shadow-[0_0_16px_rgba(240,126,70,1)]"
            aria-hidden
          />
          <p
            className="mt-1.5 text-sm font-black tracking-[0.3em] uppercase sm:mt-2 sm:text-lg sm:tracking-[0.32em] md:text-[clamp(1.1rem,2.5dvh,1.8rem)]"
            style={{
              color: presentation.foreground_text_color,
              textShadow: foregroundTextShadow,
              ...foregroundTextStroke,
            }}
          >
            {scene.title_en}
          </p>

          {/* One-Liner Caption cleanly positioned below title without overlap */}
          <div className="mt-8 sm:mt-12 md:mt-16 w-full max-w-[min(94vw,46rem)]">
            <OneLinerCaption
              lines={lines}
              active={active}
              trackKey={player.nowPlaying?.title ?? player.track?.title ?? null}
              textColor={presentation.foreground_text_color}
              textShadow={foregroundTextShadow}
            />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-1.5 sm:bottom-2.5 z-30 flex flex-col items-center gap-2 px-2 pb-[env(safe-area-inset-bottom)] sm:gap-3 sm:px-4">
          <div className="pointer-events-auto flex w-full max-w-[min(92vw,27.5rem)] flex-wrap items-center justify-center gap-2">
            <AmbienceEventButton label={presentation.gag_label} />
          </div>
          <FullCassettePlayer />
        </div>
      </div>

      <JagahExplorer
        scenes={liveScenes}
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
