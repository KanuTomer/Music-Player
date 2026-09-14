import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { currentDaypart, type Daypart } from "./dayparts";
import {
  avoidRepeatedFirst,
  circularIndex,
  createQueueSessionSeed,
  isConfirmedPlaying,
  shouldRetryExpectedPlayback,
  shuffleQueueForSession,
  snapshotQueue,
  sourceFailureAction,
} from "./queue";
import {
  getRoomAmbience,
  reportPlaybackSourceFailure,
  type QueueItem,
  type RoomPayload,
} from "./rooms.functions";
import { useAmbienceEngine } from "@/hooks/useAmbienceEngine";
import {
  effectiveMusicVolume,
  fixedAmbienceLevel,
  shouldEnableAvailableAmbience,
  type AmbienceStatus,
} from "./ambience";
import { supabase } from "@/integrations/supabase/client";
import {
  PLAYBACK_CHECKPOINT_KEY,
  clampPlaybackPosition,
  findCheckpointQueueIndex,
  isRoomPlaybackPath,
  readPlaybackCheckpoint,
  type PlaybackCheckpoint,
} from "./player-checkpoint";

type YTPlayer = {
  loadVideoById: (id: string | { videoId: string; startSeconds?: number }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  setVolume: (v: number) => void;
  seekTo: (s: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVideoData: () => { video_id?: string; title?: string; author?: string } | undefined;
  getPlayerState: () => number;
  destroy: () => void;
  unMute?: () => void;
  isMuted?: () => boolean;
  getVideoUrl?: () => string;
};
type YTPlayerEvent = { target: YTPlayer };
type YTPlayerStateEvent = YTPlayerEvent & { data: number };

function getPlayerVideoId(player: YTPlayer | null | undefined): string | null {
  if (!player) return null;
  try {
    const dataId = player.getVideoData()?.video_id;
    if (dataId && typeof dataId === "string" && dataId.trim().length > 0) {
      return dataId.trim();
    }
  } catch {
    /* ignore */
  }
  try {
    const url = player.getVideoUrl?.();
    if (url && typeof url === "string") {
      const match =
        url.match(/[?&]v=([^&#]+)/) ||
        url.match(/\/embed\/([^&#?]+)/) ||
        url.match(/youtu\.be\/([^&#?]+)/);
      if (match?.[1]) return match[1].trim();
    }
  } catch {
    /* ignore */
  }
  return null;
}

export type NowPlaying = {
  videoId: string | null;
  title: string | null;
  channel: string | null;
  position: number;
  duration: number;
  index: number;
  total: number;
};
const emptyNowPlaying = (index = 0, total = 0): NowPlaying => ({
  videoId: null,
  title: null,
  channel: null,
  position: 0,
  duration: 0,
  index,
  total,
});

type PlayerState = {
  room: RoomPayload | null;
  daypart: Daypart;
  playlist: QueueItem[];
  track: QueueItem["track"] | null;
  isPlaying: boolean;
  musicReady: boolean;
  musicTransitioning: boolean;
  musicBlocked: boolean;
  isCuratedPlaylist: boolean;
  nowPlaying: NowPlaying;
  musicVolume: number;
  ambienceLevel: number;
  ambienceAvailable: boolean;
  ambienceEnabled: boolean;
  ambienceStatus: AmbienceStatus;
  ambienceActive: boolean;
  ambienceEventPulse: number;
  ambienceEventReady: boolean;
  ambienceEventPlaying: boolean;
  openRoom: (room: RoomPayload, initialTrackId?: string) => void;
  playTrack: (trackId: string) => void;
  toggle: () => void;
  next: (options?: TrackChangeOptions) => void;
  previous: (options?: TrackChangeOptions) => void;
  cancelPendingTrackChange: () => void;
  seek: (seconds: number) => void;
  setMusicVolume: (v: number) => void;
  toggleAmbience: () => void;
  triggerAmbienceEvent: () => Promise<boolean>;
  start: () => void;
  fadeForThemeChange: () => Promise<void>;
  leave: () => void;
};

type TrackChangeOptions = {
  delayMs?: number;
  forcePlay?: boolean;
};
const PlayerContext = createContext<PlayerState | null>(null);
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: unknown) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;

function loadYouTubeApi() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve) => {
    let settled = false;
    let poll: number | null = null;
    let timeout: number | null = null;

    const cleanup = () => {
      if (poll != null) {
        window.clearInterval(poll);
        poll = null;
      }
      if (timeout != null) {
        window.clearTimeout(timeout);
        timeout = null;
      }
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    if (!document.getElementById("yt-iframe-api")) {
      const script = document.createElement("script");
      script.id = "yt-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        // Resolve so the app doesn't hang; musicBlocked indicates player unavailable
        finish();
      };
      document.head.appendChild(script);
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      finish();
    };
    poll = window.setInterval(() => {
      if (window.YT?.Player) {
        finish();
      }
    }, 100);

    timeout = window.setTimeout(() => {
      finish();
    }, 10000);
  });

  return ytApiPromise;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const generationRef = useRef(0);
  const intendPlayRef = useRef(false);
  const volumeRef = useRef(0.7);
  const outputVolumeRef = useRef(0.7);
  const ambienceActiveRef = useRef(false);
  const expectedVideoIdRef = useRef<string | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const volumeRampTimerRef = useRef<number | null>(null);
  const playRetryTimerRef = useRef<number | null>(null);
  const delayedAdvanceTimerRef = useRef<number | null>(null);
  const delayedAdvanceShouldPlayRef = useRef(false);
  const buildRetryTimerRef = useRef<number | null>(null);
  const buildRetryCountRef = useRef(0);
  const buildPlayerRef = useRef<(autoplay: boolean) => void>(() => {});
  const themeTransitionRef = useRef(false);
  const queueRef = useRef<QueueItem[]>([]);
  const indexRef = useRef(0);
  const sourceIndexRef = useRef(0);
  const failedSourcesRef = useRef<Set<string>>(new Set());
  const failedItemsRef = useRef<Set<string>>(new Set());
  const sessionSeedRef = useRef<string | null>(null);
  const pendingRestoreRef = useRef<{
    queueItemId: string;
    positionSeconds: number;
  } | null>(null);
  const shuffledQueuesRef = useRef<Map<string, QueueItem[]>>(new Map());
  const ambienceSuppressedRef = useRef(false);
  const musicDuckRatioRef = useRef(1);
  const [room, setRoom] = useState<RoomPayload | null>(null);
  const [daypart, setDaypart] = useState<Daypart>(() => currentDaypart());
  const [playlist, setPlaylist] = useState<QueueItem[]>([]);
  const [index, setIndexState] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicReady, setMusicReady] = useState(false);
  const [musicTransitioning, setMusicTransitioning] = useState(false);
  const [musicBlocked, setMusicBlocked] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [musicVolume, setMusicVol] = useState(0.7);
  const ambienceLevel = fixedAmbienceLevel;
  const [ambienceEnabled, setAmbienceEnabled] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying>(emptyNowPlaying);
  const track = playlist[index]?.track ?? null;
  const ambience = useAmbienceEngine(room, ambienceEnabled && isPlaying, ambienceLevel);
  const resumeAmbienceFromGesture = ambience.resumeFromGesture;
  const ambienceAvailable = Boolean(room?.ambience);
  const activeMusicDuckRatio = room?.ambience?.music_duck_ratio ?? 1;
  musicDuckRatioRef.current = activeMusicDuckRatio;

  const setPlayerOutputVolume = useCallback((player: YTPlayer, value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    outputVolumeRef.current = clamped;
    try {
      if (clamped > 0 && player.isMuted?.()) {
        player.unMute?.();
      }
      player.setVolume(Math.round(clamped * 100));
    } catch {
      /* detached */
    }
  }, []);
  const rampMusicOutput = useCallback(
    (target: number, durationMs: number) => {
      const player = playerRef.current;
      const clamped = Math.min(1, Math.max(0, target));
      if (volumeRampTimerRef.current != null) {
        window.clearInterval(volumeRampTimerRef.current);
        volumeRampTimerRef.current = null;
      }
      if (!player || !readyRef.current || durationMs <= 0) {
        outputVolumeRef.current = clamped;
        if (player && readyRef.current) setPlayerOutputVolume(player, clamped);
        return;
      }
      const start = outputVolumeRef.current;
      const steps = Math.max(1, Math.round(durationMs / 50));
      let step = 0;
      volumeRampTimerRef.current = window.setInterval(() => {
        if (playerRef.current !== player || !readyRef.current) {
          if (volumeRampTimerRef.current != null) window.clearInterval(volumeRampTimerRef.current);
          volumeRampTimerRef.current = null;
          return;
        }
        step += 1;
        setPlayerOutputVolume(player, start + (clamped - start) * (step / steps));
        if (step >= steps) {
          if (volumeRampTimerRef.current != null) window.clearInterval(volumeRampTimerRef.current);
          volumeRampTimerRef.current = null;
        }
      }, durationMs / steps);
    },
    [setPlayerOutputVolume],
  );

  useEffect(() => {
    ambienceActiveRef.current = ambience.active;
    if (themeTransitionRef.current) return;
    rampMusicOutput(
      effectiveMusicVolume(volumeRef.current, ambience.active, activeMusicDuckRatio),
      500,
    );
  }, [activeMusicDuckRatio, ambience.active, rampMusicOutput]);

  useEffect(() => {
    const sceneId = room?.scene.id;
    if (!sceneId) return;
    const channel = supabase
      .channel(`ambience-profile:${sceneId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ambience_profiles",
          filter: `scene_id=eq.${sceneId}`,
        },
        () => {
          void getRoomAmbience({ data: { sceneId } })
            .then((nextAmbience) => {
              setRoom((current) =>
                current?.scene.id === sceneId ? { ...current, ambience: nextAmbience } : current,
              );
              const nextEnabled = shouldEnableAvailableAmbience(
                Boolean(nextAmbience),
                ambienceSuppressedRef.current,
              );
              setAmbienceEnabled(nextEnabled);
              if (nextEnabled) void resumeAmbienceFromGesture();
            })
            .catch(() => {
              // Keep the last known state; the room loader will retry on navigation.
            });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [room?.scene.id, resumeAmbienceFromGesture]);

  const setIndex = useCallback((next: number) => {
    indexRef.current = next;
    sourceIndexRef.current = 0;
    setIndexState(next);
    const item = queueRef.current[next];
    const source = item?.sources[0];
    setNowPlaying({
      videoId: source?.provider_item_id ?? null,
      title: item?.track.title ?? null,
      channel: item?.track.artist ?? null,
      position: 0,
      duration: 0,
      index: next,
      total: queueRef.current.length,
    });
  }, []);
  const scheduleExpectedPlayback = useCallback((player: YTPlayer, videoId: string) => {
    if (playRetryTimerRef.current != null) window.clearTimeout(playRetryTimerRef.current);
    playRetryTimerRef.current = window.setTimeout(() => {
      playRetryTimerRef.current = null;
      if (
        playerRef.current !== player ||
        !readyRef.current ||
        !intendPlayRef.current ||
        expectedVideoIdRef.current !== videoId
      )
        return;
      const reportedVideoId = getPlayerVideoId(player);
      if (reportedVideoId && reportedVideoId !== videoId) return;
      try {
        if (player.isMuted?.()) player.unMute?.();
        if (player.getPlayerState() !== 1) player.playVideo();
      } catch {
        /* player iframe busy */
      }
    }, 180);
  }, []);
  const cueCurrent = useCallback(
    (player: YTPlayer, autoplay: boolean) => {
      const source = queueRef.current[indexRef.current]?.sources[sourceIndexRef.current];
      const queueItem = queueRef.current[indexRef.current];
      if (!source) {
        setMusicBlocked(true);
        return false;
      }
      expectedVideoIdRef.current = source.provider_item_id;
      setIsPlaying(false);
      setMusicReady(false);
      setMusicBlocked(false);
      const pendingRestore = pendingRestoreRef.current;
      const restorePosition =
        pendingRestore && queueItem?.id === pendingRestore.queueItemId
          ? clampPlaybackPosition(pendingRestore.positionSeconds)
          : 0;
      pendingRestoreRef.current = null;
      setNowPlaying({
        videoId: source.provider_item_id,
        title: queueItem?.track.title ?? null,
        channel: queueItem?.track.artist ?? null,
        position: restorePosition,
        duration: 0,
        index: indexRef.current,
        total: queueRef.current.length,
      });
      try {
        if (player.isMuted?.()) player.unMute?.();
      } catch {
        /* ignore */
      }
      try {
        if (restorePosition > 0) {
          player.loadVideoById({ videoId: source.provider_item_id, startSeconds: restorePosition });
        } else {
          player.loadVideoById(source.provider_item_id);
        }
      } catch {
        try {
          player.loadVideoById(source.provider_item_id);
          if (restorePosition > 0) player.seekTo(restorePosition, true);
        } catch {
          buildPlayerRef.current(autoplay);
          return false;
        }
      }
      const target = effectiveMusicVolume(
        volumeRef.current,
        ambienceActiveRef.current,
        musicDuckRatioRef.current,
      );
      setPlayerOutputVolume(player, themeTransitionRef.current ? 0 : target);
      intendPlayRef.current = autoplay;
      if (autoplay) {
        try {
          if (player.isMuted?.()) player.unMute?.();
        } catch {
          /* ignore */
        }
        scheduleExpectedPlayback(player, source.provider_item_id);
      } else {
        themeTransitionRef.current = false;
        try {
          player.pauseVideo();
        } catch {
          /* ignore */
        }
      }
      if (autoplay && themeTransitionRef.current) {
        let step = 0;
        if (fadeTimerRef.current != null) window.clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = window.setInterval(() => {
          step += 1;
          setPlayerOutputVolume(player, target * (step / 8));
          if (step >= 8) {
            if (fadeTimerRef.current != null) window.clearInterval(fadeTimerRef.current);
            fadeTimerRef.current = null;
            themeTransitionRef.current = false;
          }
        }, 100);
      }
      return true;
    },
    [scheduleExpectedPlayback, setPlayerOutputVolume],
  );
  const advance = useCallback(
    (delta: number) => {
      const next = circularIndex(indexRef.current, delta, queueRef.current.length);
      setIndex(next);
      const player = playerRef.current;
      if (player && readyRef.current) {
        cueCurrent(player, intendPlayRef.current);
      } else {
        buildPlayerRef.current(intendPlayRef.current);
      }
    },
    [cueCurrent, setIndex],
  );
  const cancelPendingTrackChange = useCallback(() => {
    if (delayedAdvanceTimerRef.current == null) return;
    window.clearTimeout(delayedAdvanceTimerRef.current);
    delayedAdvanceTimerRef.current = null;
    setMusicTransitioning(false);
    if (!delayedAdvanceShouldPlayRef.current) return;
    delayedAdvanceShouldPlayRef.current = false;
    intendPlayRef.current = true;
    setIsPlaying(true);
    if (readyRef.current) playerRef.current?.playVideo();
  }, []);
  const requestAdvance = useCallback(
    (delta: number, options?: TrackChangeOptions) => {
      const delayMs = Math.max(0, options?.delayMs ?? 0);
      if (delayMs === 0) {
        advance(delta);
        return;
      }
      if (delayedAdvanceTimerRef.current != null) return;

      delayedAdvanceShouldPlayRef.current = options?.forcePlay || intendPlayRef.current;
      intendPlayRef.current = false;
      playerRef.current?.pauseVideo();
      setIsPlaying(false);
      setMusicTransitioning(true);
      delayedAdvanceTimerRef.current = window.setTimeout(() => {
        delayedAdvanceTimerRef.current = null;
        const shouldPlay = delayedAdvanceShouldPlayRef.current;
        delayedAdvanceShouldPlayRef.current = false;
        intendPlayRef.current = shouldPlay;
        setMusicTransitioning(false);
        advance(delta);
      }, delayMs);
    },
    [advance],
  );
  const reportFailure = useCallback((sourceId: string, errorCode: number) => {
    void reportPlaybackSourceFailure({ data: { sourceId, errorCode } }).catch(() => {
      /* playback continues */
    });
  }, []);
  const handleSourceError = useCallback(
    (generation: number, player: YTPlayer, errorCode: number) => {
      const item = queueRef.current[indexRef.current];
      const source = item?.sources[sourceIndexRef.current];
      if (!item || !source) return;
      const reportedVideoId = player.getVideoData()?.video_id;
      if (reportedVideoId && reportedVideoId !== expectedVideoIdRef.current) return;
      const fallback = item.sources.findIndex(
        (candidate, candidateIndex) =>
          candidateIndex > sourceIndexRef.current && !failedSourcesRef.current.has(candidate.id),
      );
      const action = sourceFailureAction({
        eventGeneration: generation,
        currentGeneration: generationRef.current,
        isCurrentTarget: playerRef.current === player,
        alreadyFailed: failedSourcesRef.current.has(source.id),
        hasFallback: fallback >= 0,
        failedItemCount: failedItemsRef.current.size,
        queueLength: queueRef.current.length,
      });
      if (action === "ignore") return;
      failedSourcesRef.current.add(source.id);
      reportFailure(source.id, errorCode);
      if (action === "fallback") {
        sourceIndexRef.current = fallback;
        cueCurrent(player, intendPlayRef.current);
        return;
      }
      failedItemsRef.current.add(item.id);
      if (action === "stop") {
        intendPlayRef.current = false;
        setIsPlaying(false);
        setMusicBlocked(true);
        return;
      }
      setMusicBlocked(true);
      advance(1);
    },
    [advance, cueCurrent, reportFailure],
  );

  const buildPlayer = useCallback(
    (autoplay: boolean) => {
      const host = hostRef.current;
      if (!host || !queueRef.current.length) return;
      if (!window.YT?.Player) {
        if (buildRetryTimerRef.current != null) window.clearTimeout(buildRetryTimerRef.current);
        buildRetryCountRef.current += 1;
        if (buildRetryCountRef.current < 60) {
          buildRetryTimerRef.current = window.setTimeout(() => {
            buildPlayer(autoplay);
          }, 100);
        }
        return;
      }
      if (buildRetryTimerRef.current != null) {
        window.clearTimeout(buildRetryTimerRef.current);
        buildRetryTimerRef.current = null;
      }
      buildRetryCountRef.current = 0;
      const generation = generationRef.current + 1;
      generationRef.current = generation;
      readyRef.current = false;
      intendPlayRef.current = autoplay;
      const outgoing = playerRef.current;
      playerRef.current = null;
      try {
        outgoing?.setVolume(0);
        outgoing?.stopVideo();
        outgoing?.destroy();
      } catch {
        /* detached */
      }
      host.replaceChildren();
      const element = document.createElement("div");
      host.appendChild(element);
      setMusicReady(false);
      setMusicBlocked(false);
      const currentItem = queueRef.current[indexRef.current];
      const source = currentItem?.sources[sourceIndexRef.current];
      setNowPlaying({
        videoId: source?.provider_item_id ?? null,
        title: currentItem?.track.title ?? null,
        channel: currentItem?.track.artist ?? null,
        position: 0,
        duration: 0,
        index: indexRef.current,
        total: queueRef.current.length,
      });
      const current = (candidate: YTPlayer) =>
        generationRef.current === generation && playerRef.current === candidate;
      try {
        const created = new window.YT.Player(element, {
          height: "200",
          width: "200",
          playerVars: {
            autoplay: autoplay ? 1 : 0,
            controls: 0,
            playsinline: 1,
            enablejsapi: 1,
            origin: typeof window !== "undefined" ? window.location.origin : undefined,
            rel: 0,
            fs: 0,
            disablekb: 1,
            iv_load_policy: 3,
          },
          events: {
            onReady: (event: YTPlayerEvent) => {
              if (!current(event.target)) return;
              readyRef.current = true;
              setMusicReady(true);
              try {
                if (event.target.isMuted?.()) event.target.unMute?.();
                cueCurrent(event.target, intendPlayRef.current);
              } catch {
                setMusicBlocked(true);
              }
            },
            onError: (event: YTPlayerStateEvent) => {
              if (current(event.target)) handleSourceError(generation, event.target, event.data);
            },
            onStateChange: (event: YTPlayerStateEvent) => {
              if (!current(event.target)) return;
              if (!readyRef.current) {
                readyRef.current = true;
                setMusicReady(true);
              }
              const reportedVideoId = getPlayerVideoId(event.target);
              // Only drop stale events from a previous video ID if reportedVideoId explicitly mismatches
              if (
                reportedVideoId &&
                expectedVideoIdRef.current &&
                reportedVideoId !== expectedVideoIdRef.current
              ) {
                return;
              }
              if (event.data === 0) {
                advance(1);
              } else if (event.data === 1) {
                setIsPlaying(true);
                setMusicReady(true);
                setMusicBlocked(false);
              } else if (event.data === 2) {
                // Video is paused — isPlaying must be false so UI and ambience do not falsely play
                setIsPlaying(false);
                setMusicReady(true);
                if (
                  shouldRetryExpectedPlayback(
                    intendPlayRef.current,
                    event.data,
                    reportedVideoId ?? expectedVideoIdRef.current ?? undefined,
                    expectedVideoIdRef.current,
                  )
                ) {
                  scheduleExpectedPlayback(
                    event.target,
                    expectedVideoIdRef.current ?? reportedVideoId ?? "",
                  );
                }
              } else if (event.data === 3) {
                // Buffering
                setMusicReady(true);
              } else if (event.data === 5) {
                // Cued
                setMusicReady(true);
                if (intendPlayRef.current && expectedVideoIdRef.current) {
                  scheduleExpectedPlayback(event.target, expectedVideoIdRef.current);
                }
              }
            },
          },
        });
        playerRef.current = created;
      } catch {
        if (buildRetryTimerRef.current != null) window.clearTimeout(buildRetryTimerRef.current);
        buildRetryTimerRef.current = window.setTimeout(() => {
          buildPlayer(autoplay);
        }, 200);
      }
    },
    [advance, cueCurrent, handleSourceError, scheduleExpectedPlayback],
  );
  buildPlayerRef.current = buildPlayer;

  useEffect(() => {
    let cancelled = false;
    void loadYouTubeApi().then(() => {
      if (!cancelled) setApiReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setDaypart(currentDaypart()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (room && queueRef.current.length > 0 && !player) {
        buildPlayerRef.current(intendPlayRef.current);
        return;
      }
      if (!player || !readyRef.current) return;
      try {
        const data = player.getVideoData();
        const activeVideoId = getPlayerVideoId(player) || expectedVideoIdRef.current;
        const state = player.getPlayerState();
        const currentItem = queueRef.current[indexRef.current];
        setNowPlaying({
          videoId: activeVideoId,
          title: data?.title || currentItem?.track.title || null,
          channel: data?.author || currentItem?.track.artist || null,
          position: player.getCurrentTime() || 0,
          duration: player.getDuration() || 0,
          index: indexRef.current,
          total: queueRef.current.length,
        });
        if (state === 1) {
          setIsPlaying(true);
          setMusicReady(true);
          setMusicBlocked(false);
        } else if (state === 2 && isPlaying) {
          setIsPlaying(false);
        }
        if (
          intendPlayRef.current &&
          document.visibilityState === "visible" &&
          (activeVideoId === expectedVideoIdRef.current || !activeVideoId) &&
          ![1, 3].includes(state)
        ) {
          if (player.isMuted?.()) player.unMute?.();
          player.playVideo();
        }
      } catch {
        /* not ready */
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [isPlaying, room]);

  // ── Mobile tab-switch / browser-return resume ──
  // On mobile, switching tabs or minimising the browser causes the OS to pause
  // the YouTube IFrame player. The Web-Audio-API ambience engine resumes on
  // its own (AudioContext.resume()), so users hear ambient sound but no music.
  //
  // Strategy:
  //   HIDE  → Remember we intended to play. Set isPlaying false so the UI
  //           (cassette reel, equalizer, ambience) correctly reflects "paused".
  //   SHOW  → If we intended to play, aggressively re-issue playVideo() with
  //           staggered retries (mobile browsers often swallow the first one).
  //           Once confirmed playing, restore isPlaying so the reel spins again.
  useEffect(() => {
    let retryTimers: number[] = [];
    // Whether we were intending to play before the tab was hidden
    const wasPlayingRef = { current: false };

    const clearRetries = () => {
      for (const t of retryTimers) window.clearTimeout(t);
      retryTimers = [];
    };

    const resumePlayback = () => {
      // Only act if we actually intended to play before hiding
      if (!wasPlayingRef.current && !intendPlayRef.current) return;

      const player = playerRef.current;
      if (!player || !readyRef.current) return;

      // Restore intent — it may have been cleared by onStateChange(2) during hide
      intendPlayRef.current = true;

      // Resume the ambience AudioContext (may need a "gesture" unblock)
      void resumeAmbienceFromGesture();

      // Restore volume that may have been ramped to 0
      const target = effectiveMusicVolume(
        volumeRef.current,
        ambienceActiveRef.current,
        musicDuckRatioRef.current,
      );
      rampMusicOutput(target, 300);

      clearRetries();

      // Attempt playback immediately + staggered retries at increasing delays
      const retryDelays = [0, 150, 400, 800, 1600];
      for (let i = 0; i < retryDelays.length; i++) {
        const timer = window.setTimeout(() => {
          const p = playerRef.current;
          if (!p || !readyRef.current || !intendPlayRef.current) return;

          try {
            if (p.isMuted?.()) p.unMute?.();
            const state = p.getPlayerState();

            // Already playing? Update state and stop retrying
            if (state === 1) {
              setIsPlaying(true);
              clearRetries();
              return;
            }

            // Player lost its video (unstarted / cued) — reload it
            if (state === -1 || state === 5) {
              const videoId = expectedVideoIdRef.current;
              if (videoId) {
                p.loadVideoById(videoId);
              }
              return;
            }

            // Paused or buffering — poke it
            p.playVideo();
          } catch {
            /* player iframe not responsive yet */
          }
        }, retryDelays[i]);
        retryTimers.push(timer);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // ── TAB HIDDEN ──
        // Remember whether music was playing so we can restore on return
        wasPlayingRef.current = intendPlayRef.current;
        if (wasPlayingRef.current) {
          // Mark UI as paused so the reel stops, equalizer shows paused, etc.
          setIsPlaying(false);
        }
      } else {
        // ── TAB VISIBLE ──
        resumePlayback();
      }
    };

    // `pageshow` covers iOS Safari's BFCache / app-switcher return
    const onPageShow = () => {
      // pageshow always means we are visible again
      resumePlayback();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);
    // `focus` covers edge-cases on some Android browsers / PWAs
    window.addEventListener("focus", resumePlayback);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", resumePlayback);
      clearRetries();
    };
  }, [resumeAmbienceFromGesture, rampMusicOutput]);

  // ── First user-interaction / autoplay unblock ──
  // Modern browsers block unmuted autoplay on new visits until the user
  // interacts with the page. Any touch/click or keydown unlocks playback immediately.
  useEffect(() => {
    const unlockOnGesture = () => {
      const player = playerRef.current;
      if (intendPlayRef.current) {
        if (player && readyRef.current) {
          try {
            if (player.isMuted?.()) player.unMute?.();
            const state = player.getPlayerState();
            if (state !== 1 && state !== 3) {
              player.playVideo();
            }
          } catch {
            /* ignore */
          }
        } else if (room && queueRef.current.length > 0) {
          buildPlayerRef.current(true);
        }
      }
      void resumeAmbienceFromGesture();
    };

    window.addEventListener("pointerdown", unlockOnGesture, { capture: true });
    window.addEventListener("keydown", unlockOnGesture, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlockOnGesture, { capture: true });
      window.removeEventListener("keydown", unlockOnGesture, { capture: true });
    };
  }, [resumeAmbienceFromGesture, room]);

  useEffect(() => {
    if (!room || !apiReady) return;
    const player = playerRef.current;
    if (!player) {
      buildPlayer(intendPlayRef.current);
      return;
    }
    if (!readyRef.current) return;
    cueCurrent(player, intendPlayRef.current);
  }, [apiReady, buildPlayer, cueCurrent, room]);

  const openRoom = useCallback(
    (nextRoom: RoomPayload, initialTrackId?: string) => {
      if (delayedAdvanceTimerRef.current != null) {
        window.clearTimeout(delayedAdvanceTimerRef.current);
        delayedAdvanceTimerRef.current = null;
        delayedAdvanceShouldPlayRef.current = false;
        setMusicTransitioning(false);
      }
      if (room?.scene.slug === nextRoom.scene.slug) {
        if (initialTrackId) {
          const foundIdx = queueRef.current.findIndex(
            (item) => item.track.id === initialTrackId || item.id === initialTrackId,
          );
          if (foundIdx >= 0 && foundIdx !== indexRef.current) {
            setIndex(foundIdx);
            intendPlayRef.current = true;
            const player = playerRef.current;
            if (player && readyRef.current) cueCurrent(player, true);
          }
        }
        return;
      }
      let checkpoint: PlaybackCheckpoint | null = null;
      if (
        !initialTrackId &&
        typeof window !== "undefined" &&
        isRoomPlaybackPath(window.location.pathname, nextRoom.scene.slug)
      ) {
        checkpoint = readPlaybackCheckpoint(window.sessionStorage, nextRoom.scene.slug);
      }
      if (checkpoint) sessionSeedRef.current = checkpoint.queueShuffleSeed;
      ambienceSuppressedRef.current = checkpoint ? !checkpoint.ambienceEnabled : false;
      intendPlayRef.current = checkpoint?.intendsToPlay ?? true;
      setIsPlaying(false);
      setMusicReady(false);
      setMusicBlocked(false);
      const shouldEnableAmbience = Boolean(nextRoom.ambience) && (checkpoint?.ambienceEnabled ?? true);
      setAmbienceEnabled(shouldEnableAmbience);
      if (shouldEnableAmbience && intendPlayRef.current) void resumeAmbienceFromGesture();
      if (checkpoint) {
        volumeRef.current = checkpoint.musicVolume;
        outputVolumeRef.current = checkpoint.musicVolume;
        setMusicVol(checkpoint.musicVolume);
      }
      if (!sessionSeedRef.current && typeof window !== "undefined") {
        sessionSeedRef.current = createQueueSessionSeed();
      }
      let snapshot = shuffledQueuesRef.current.get(nextRoom.scene.slug);
      if (!snapshot) {
        const eligible = snapshotQueue(nextRoom.queue, currentDaypart());
        snapshot =
          nextRoom.curatedSet.shuffle_start && sessionSeedRef.current
            ? shuffleQueueForSession(eligible, sessionSeedRef.current, nextRoom.scene.slug)
            : eligible;
        if (typeof window !== "undefined" && snapshot.length && !checkpoint) {
          const firstTrackKey = `sd.queue-first.v1:${nextRoom.scene.slug}`;
          try {
            snapshot = avoidRepeatedFirst(
              snapshot,
              window.sessionStorage.getItem(firstTrackKey),
              (item) => item.id,
            );
            window.sessionStorage.setItem(firstTrackKey, snapshot[0]?.id ?? "");
          } catch {
            // A blocked sessionStorage must not prevent room initialization.
          }
        }
        shuffledQueuesRef.current.set(nextRoom.scene.slug, snapshot);
      }

      // If a specific song was requested via URL, locate or prepend it so it plays first
      let targetIndex = 0;
      if (initialTrackId) {
        let found = snapshot.findIndex(
          (item) => item.track.id === initialTrackId || item.id === initialTrackId,
        );
        if (found === -1) {
          const matchingQueueItem = nextRoom.queue.find(
            (item) => item.track.id === initialTrackId || item.id === initialTrackId,
          );
          if (matchingQueueItem) {
            snapshot = [
              matchingQueueItem,
              ...snapshot.filter((i) => i.id !== matchingQueueItem.id),
            ];
            shuffledQueuesRef.current.set(nextRoom.scene.slug, snapshot);
            found = 0;
          }
        }
        if (found >= 0) {
          targetIndex = found;
        }
      }
      const checkpointIndex = findCheckpointQueueIndex(snapshot, checkpoint, initialTrackId);
      if (checkpoint && checkpointIndex === null) {
        const matchingQueueItem = nextRoom.queue.find(
          (item) => item.id === checkpoint.queueItemId,
        ) ?? nextRoom.queue.find(
          (item) => item.track.id === checkpoint.trackId,
        );
        if (matchingQueueItem) {
          snapshot = [
            matchingQueueItem,
            ...snapshot.filter((item) => item.id !== matchingQueueItem.id),
          ];
          shuffledQueuesRef.current.set(nextRoom.scene.slug, snapshot);
          targetIndex = 0;
        }
      } else if (checkpointIndex !== null) {
        targetIndex = checkpointIndex;
      }

      queueRef.current = snapshot;
      failedSourcesRef.current.clear();
      failedItemsRef.current.clear();
      setPlaylist(snapshot);
      setIndex(targetIndex);
      const restoredItem = snapshot[targetIndex];
      pendingRestoreRef.current =
        checkpoint && restoredItem
          ? {
              queueItemId: restoredItem.id,
              positionSeconds: checkpoint.positionSeconds,
            }
          : null;
      setRoom(nextRoom);
    },
    [cueCurrent, resumeAmbienceFromGesture, room, setIndex],
  );
  const playTrack = useCallback(
    (trackId: string) => {
      const foundIdx = queueRef.current.findIndex(
        (item) => item.track.id === trackId || item.id === trackId,
      );
      if (foundIdx >= 0) {
        setIndex(foundIdx);
        intendPlayRef.current = true;
        const player = playerRef.current;
        if (player && readyRef.current) {
          cueCurrent(player, true);
        } else {
          buildPlayerRef.current(true);
        }
      }
    },
    [cueCurrent, setIndex],
  );
  const start = useCallback(() => {
    void resumeAmbienceFromGesture();
    if (room?.ambience && !ambienceSuppressedRef.current) setAmbienceEnabled(true);
    intendPlayRef.current = true;
    const player = playerRef.current;
    if (readyRef.current && player) {
      try {
        if (player.isMuted?.()) player.unMute?.();
        player.playVideo();
      } catch {
        buildPlayerRef.current(true);
      }
    } else {
      buildPlayerRef.current(true);
    }
  }, [resumeAmbienceFromGesture, room?.ambience]);
  const toggle = useCallback(() => {
    if (!isPlaying) void resumeAmbienceFromGesture();
    if (!isPlaying && room?.ambience && !ambienceSuppressedRef.current) setAmbienceEnabled(true);
    const nextPlayIntent = !isPlaying;
    intendPlayRef.current = nextPlayIntent;
    const player = playerRef.current;
    if (readyRef.current && player) {
      if (isPlaying) {
        try {
          player.pauseVideo();
        } catch {
          /* ignore */
        }
        setIsPlaying(false);
      } else {
        try {
          if (player.isMuted?.()) player.unMute?.();
          player.playVideo();
        } catch {
          buildPlayerRef.current(true);
        }
      }
    } else {
      if (nextPlayIntent) {
        buildPlayerRef.current(true);
      }
    }
  }, [isPlaying, resumeAmbienceFromGesture, room?.ambience]);
  const next = useCallback(
    (options?: TrackChangeOptions) => requestAdvance(1, options),
    [requestAdvance],
  );
  const previous = useCallback(
    (options?: TrackChangeOptions) => requestAdvance(-1, options),
    [requestAdvance],
  );
  const seek = useCallback((seconds: number) => {
    if (readyRef.current) playerRef.current?.seekTo(Math.max(0, seconds), true);
  }, []);
  const setMusicVolume = useCallback(
    (value: number) => {
      const clamped = Math.min(1, Math.max(0, value));
      volumeRef.current = clamped;
      setMusicVol(clamped);
      rampMusicOutput(
        effectiveMusicVolume(clamped, ambienceActiveRef.current, musicDuckRatioRef.current),
        160,
      );
    },
    [rampMusicOutput],
  );
  const savePlaybackCheckpoint = useCallback(() => {
    if (
      !room ||
      typeof window === "undefined" ||
      !sessionSeedRef.current ||
      !isRoomPlaybackPath(window.location.pathname, room.scene.slug)
    ) {
      return;
    }
    const queueItem = queueRef.current[indexRef.current];
    const player = playerRef.current;
    if (!queueItem || !player || !readyRef.current) return;
    try {
      const positionSeconds = clampPlaybackPosition(
        player.getCurrentTime() || 0,
        player.getDuration(),
      );
      const checkpoint: PlaybackCheckpoint = {
        version: 1,
        sceneSlug: room.scene.slug,
        queueItemId: queueItem.id,
        trackId: queueItem.track.id,
        positionSeconds,
        intendsToPlay: intendPlayRef.current,
        musicVolume: volumeRef.current,
        ambienceEnabled,
        queueShuffleSeed: sessionSeedRef.current,
        updatedAt: Date.now(),
      };
      window.sessionStorage.setItem(PLAYBACK_CHECKPOINT_KEY, JSON.stringify(checkpoint));
    } catch {
      // Playback must remain usable when browser storage is unavailable.
    }
  }, [ambienceEnabled, room]);

  useEffect(() => {
    if (!room) return;
    const timer = window.setInterval(savePlaybackCheckpoint, 2_000);
    window.addEventListener("pagehide", savePlaybackCheckpoint);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", savePlaybackCheckpoint);
    };
  }, [room, savePlaybackCheckpoint]);
  useEffect(() => {
    if (!room) return;

    const handlePlayerShortcut = (event: KeyboardEvent) => {
      const isPublicPlayerView =
        window.location.pathname === "/" || window.location.pathname.startsWith("/room/");
      if (
        !isPublicPlayerView ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }

      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], [role="slider"]',
        )
      ) {
        return;
      }

      const currentTime = playerRef.current?.getCurrentTime() ?? 0;
      const duration = playerRef.current?.getDuration() ?? 0;

      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        if (!event.repeat) toggle();
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          seek(Math.max(0, currentTime - 5));
          break;
        case "ArrowRight":
          event.preventDefault();
          seek(Math.min(duration > 0 ? duration : currentTime + 5, currentTime + 5));
          break;
        case "ArrowUp":
          event.preventDefault();
          setMusicVolume(volumeRef.current + 0.05);
          break;
        case "ArrowDown":
          event.preventDefault();
          setMusicVolume(volumeRef.current - 0.05);
          break;
      }
    };

    window.addEventListener("keydown", handlePlayerShortcut);
    return () => window.removeEventListener("keydown", handlePlayerShortcut);
  }, [room, seek, setMusicVolume, toggle]);
  const toggleAmbience = useCallback(() => {
    if (!ambienceAvailable) return;
    const nextEnabled = !ambienceEnabled;
    ambienceSuppressedRef.current = !nextEnabled;
    setAmbienceEnabled(nextEnabled);
    if (nextEnabled) void resumeAmbienceFromGesture();
  }, [ambienceAvailable, ambienceEnabled, resumeAmbienceFromGesture]);
  const triggerAmbienceEvent = useCallback(
    () => (ambienceAvailable ? ambience.triggerEvent() : Promise.resolve(false)),
    [ambience, ambienceAvailable],
  );
  const fadeForThemeChange = useCallback(() => {
    const player = playerRef.current;
    if (!player || !readyRef.current || !isPlaying) {
      themeTransitionRef.current = false;
      return Promise.resolve();
    }
    themeTransitionRef.current = true;
    if (fadeTimerRef.current != null) window.clearInterval(fadeTimerRef.current);
    if (volumeRampTimerRef.current != null) {
      window.clearInterval(volumeRampTimerRef.current);
      volumeRampTimerRef.current = null;
    }
    return new Promise<void>((resolve) => {
      let step = 7;
      const startVolume = outputVolumeRef.current;
      fadeTimerRef.current = window.setInterval(() => {
        step -= 1;
        setPlayerOutputVolume(player, Math.max(0, startVolume * (step / 7)));
        if (step <= 0) {
          if (fadeTimerRef.current != null) window.clearInterval(fadeTimerRef.current);
          fadeTimerRef.current = null;
          resolve();
        }
      }, 45);
    });
  }, [isPlaying, setPlayerOutputVolume]);
  const leave = useCallback(() => {
    if (delayedAdvanceTimerRef.current != null) {
      window.clearTimeout(delayedAdvanceTimerRef.current);
      delayedAdvanceTimerRef.current = null;
    }
    if (buildRetryTimerRef.current != null) {
      window.clearTimeout(buildRetryTimerRef.current);
      buildRetryTimerRef.current = null;
    }
    delayedAdvanceShouldPlayRef.current = false;
    setMusicTransitioning(false);
    generationRef.current += 1;
    readyRef.current = false;
    intendPlayRef.current = false;
    playerRef.current?.pauseVideo();
    setRoom(null);
    setPlaylist([]);
    queueRef.current = [];
    pendingRestoreRef.current = null;
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(PLAYBACK_CHECKPOINT_KEY);
      } catch {
        // Storage can be blocked without affecting playback cleanup.
      }
    }
    shuffledQueuesRef.current.clear();
    expectedVideoIdRef.current = null;
    setIsPlaying(false);
  }, []);

  const value: PlayerState = {
    room,
    daypart,
    playlist,
    track,
    isPlaying,
    musicReady,
    musicTransitioning,
    musicBlocked,
    isCuratedPlaylist: Boolean(room),
    nowPlaying,
    musicVolume,
    ambienceLevel,
    ambienceAvailable,
    ambienceEnabled,
    ambienceStatus: ambienceAvailable ? ambience.status : "unavailable",
    ambienceActive: ambience.active,
    ambienceEventPulse: ambience.eventPulse,
    ambienceEventReady: ambience.eventReady,
    ambienceEventPlaying: ambience.eventPlaying,
    openRoom,
    playTrack,
    toggle,
    next,
    previous,
    cancelPendingTrackChange,
    seek,
    setMusicVolume,
    toggleAmbience,
    triggerAmbienceEvent,
    start,
    fadeForThemeChange,
    leave,
  };
  return (
    <PlayerContext.Provider value={value}>
      {children}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-0 right-0 z-[-1] h-[200px] w-[200px] overflow-hidden opacity-[0.001]"
      >
        <div ref={hostRef} />
      </div>
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const value = useContext(PlayerContext);
  if (!value) throw new Error("usePlayer must be used inside PlayerProvider");
  return value;
}
