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
import { reportPlaybackSourceFailure, type QueueItem, type RoomPayload } from "./rooms.functions";
import { useAmbienceEngine } from "@/hooks/useAmbienceEngine";
import { effectiveMusicVolume, fixedAmbienceLevel, type AmbienceStatus } from "./ambience";

type YTPlayer = {
  loadVideoById: (id: string) => void;
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
};
type YTPlayerEvent = { target: YTPlayer };
type YTPlayerStateEvent = YTPlayerEvent & { data: number };

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
  musicBlocked: boolean;
  isCuratedPlaylist: boolean;
  nowPlaying: NowPlaying;
  musicVolume: number;
  ambienceLevel: number;
  ambienceEnabled: boolean;
  ambienceStatus: AmbienceStatus;
  ambienceActive: boolean;
  ambienceEventPulse: number;
  ambienceEventReady: boolean;
  ambienceEventPlaying: boolean;
  openRoom: (room: RoomPayload) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setMusicVolume: (v: number) => void;
  toggleAmbience: () => void;
  triggerAmbienceEvent: () => Promise<boolean>;
  start: () => void;
  fadeForThemeChange: () => Promise<void>;
  leave: () => void;
};
const PlayerContext = createContext<PlayerState | null>(null);
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: unknown) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYouTubeApi() {
  if (typeof window === "undefined" || window.YT?.Player) return Promise.resolve();
  return new Promise<void>((resolve) => {
    if (!document.getElementById("yt-iframe-api")) {
      const script = document.createElement("script");
      script.id = "yt-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const poll = window.setInterval(() => {
      if (window.YT?.Player) {
        window.clearInterval(poll);
        resolve();
      }
    }, 250);
  });
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
  const themeTransitionRef = useRef(false);
  const queueRef = useRef<QueueItem[]>([]);
  const indexRef = useRef(0);
  const sourceIndexRef = useRef(0);
  const failedSourcesRef = useRef<Set<string>>(new Set());
  const failedItemsRef = useRef<Set<string>>(new Set());
  const sessionSeedRef = useRef<string | null>(null);
  const shuffledQueuesRef = useRef<Map<string, QueueItem[]>>(new Map());
  const ambienceSuppressedRef = useRef(false);
  const [room, setRoom] = useState<RoomPayload | null>(null);
  const [daypart, setDaypart] = useState<Daypart>(() => currentDaypart());
  const [playlist, setPlaylist] = useState<QueueItem[]>([]);
  const [index, setIndexState] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicReady, setMusicReady] = useState(false);
  const [musicBlocked, setMusicBlocked] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [musicVolume, setMusicVol] = useState(0.7);
  const ambienceLevel = fixedAmbienceLevel;
  const [ambienceEnabled, setAmbienceEnabled] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying>(emptyNowPlaying);
  const track = playlist[index]?.track ?? null;
  const ambience = useAmbienceEngine(room, ambienceEnabled, ambienceLevel);
  const resumeAmbienceFromGesture = ambience.resumeFromGesture;

  const setPlayerOutputVolume = useCallback((player: YTPlayer, value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    outputVolumeRef.current = clamped;
    player.setVolume(Math.round(clamped * 100));
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
    rampMusicOutput(effectiveMusicVolume(volumeRef.current, ambience.active), 500);
  }, [ambience.active, rampMusicOutput]);

  const setIndex = useCallback((next: number) => {
    indexRef.current = next;
    sourceIndexRef.current = 0;
    setIndexState(next);
    setNowPlaying(emptyNowPlaying(next, queueRef.current.length));
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
      const reportedVideoId = player.getVideoData()?.video_id;
      if (reportedVideoId && reportedVideoId !== videoId) return;
      if (player.getPlayerState() !== 1) player.playVideo();
    }, 180);
  }, []);
  const cueCurrent = useCallback(
    (player: YTPlayer, autoplay: boolean) => {
      const source = queueRef.current[indexRef.current]?.sources[sourceIndexRef.current];
      if (!source) {
        setMusicBlocked(true);
        return false;
      }
      expectedVideoIdRef.current = source.provider_item_id;
      setIsPlaying(false);
      setMusicReady(false);
      setMusicBlocked(false);
      setNowPlaying(emptyNowPlaying(indexRef.current, queueRef.current.length));
      player.loadVideoById(source.provider_item_id);
      const target = effectiveMusicVolume(volumeRef.current, ambienceActiveRef.current);
      setPlayerOutputVolume(player, themeTransitionRef.current ? 0 : target);
      intendPlayRef.current = autoplay;
      if (autoplay) scheduleExpectedPlayback(player, source.provider_item_id);
      else player.pauseVideo();
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
      if (player && readyRef.current) cueCurrent(player, intendPlayRef.current);
    },
    [cueCurrent, setIndex],
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
      if (!host || !window.YT?.Player || !queueRef.current.length) return;
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
      setNowPlaying(emptyNowPlaying(indexRef.current, queueRef.current.length));
      const current = (candidate: YTPlayer) =>
        generationRef.current === generation && playerRef.current === candidate;
      const created = new window.YT.Player(element, {
        height: "1",
        width: "1",
        playerVars: { autoplay: autoplay ? 1 : 0, controls: 0, playsinline: 1 },
        events: {
          onReady: (event: YTPlayerEvent) => {
            if (!current(event.target)) return;
            readyRef.current = true;
            setMusicReady(true);
            try {
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
            const reportedVideoId = event.target.getVideoData()?.video_id;
            if (!reportedVideoId || reportedVideoId !== expectedVideoIdRef.current) return;
            if (event.data === 0) advance(1);
            if (isConfirmedPlaying(event.data, reportedVideoId, expectedVideoIdRef.current)) {
              setIsPlaying(true);
              setMusicReady(true);
              setMusicBlocked(false);
            }
            if (event.data === 2 && !intendPlayRef.current) setIsPlaying(false);
            if ([2, 5].includes(event.data)) setMusicReady(true);
            if (
              shouldRetryExpectedPlayback(
                intendPlayRef.current,
                event.data,
                reportedVideoId,
                expectedVideoIdRef.current,
              )
            ) {
              scheduleExpectedPlayback(event.target, reportedVideoId);
            }
          },
        },
      });
      playerRef.current = created;
    },
    [advance, cueCurrent, handleSourceError, scheduleExpectedPlayback],
  );

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
      if (!player || !readyRef.current) return;
      try {
        const data = player.getVideoData();
        setNowPlaying({
          videoId: data?.video_id ?? null,
          title: data?.title ?? null,
          channel: data?.author ?? null,
          position: player.getCurrentTime() || 0,
          duration: player.getDuration() || 0,
          index: indexRef.current,
          total: queueRef.current.length,
        });
        if (
          intendPlayRef.current &&
          data?.video_id === expectedVideoIdRef.current &&
          ![1, 3].includes(player.getPlayerState())
        )
          player.playVideo();
      } catch {
        /* not ready */
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!room || !apiReady) return;
    const player = playerRef.current;
    if (!player) {
      buildPlayer(true);
      return;
    }
    if (!readyRef.current) return;
    cueCurrent(player, intendPlayRef.current);
  }, [apiReady, buildPlayer, cueCurrent, room]);

  const openRoom = useCallback(
    (nextRoom: RoomPayload) => {
      if (room?.scene.slug === nextRoom.scene.slug) return;
      ambienceSuppressedRef.current = false;
      intendPlayRef.current = true;
      setIsPlaying(false);
      setMusicReady(false);
      setMusicBlocked(false);
      setAmbienceEnabled(true);
      void resumeAmbienceFromGesture();
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
        if (typeof window !== "undefined" && snapshot.length) {
          const firstTrackKey = `sd.queue-first.v1:${nextRoom.scene.slug}`;
          snapshot = avoidRepeatedFirst(
            snapshot,
            window.sessionStorage.getItem(firstTrackKey),
            (item) => item.id,
          );
          window.sessionStorage.setItem(firstTrackKey, snapshot[0]?.id ?? "");
        }
        shuffledQueuesRef.current.set(nextRoom.scene.slug, snapshot);
      }
      queueRef.current = snapshot;
      failedSourcesRef.current.clear();
      failedItemsRef.current.clear();
      setPlaylist(snapshot);
      setIndex(0);
      setRoom(nextRoom);
    },
    [resumeAmbienceFromGesture, room, setIndex],
  );
  const start = useCallback(() => {
    void resumeAmbienceFromGesture();
    if (!ambienceSuppressedRef.current) setAmbienceEnabled(true);
    intendPlayRef.current = true;
    if (readyRef.current) playerRef.current?.playVideo();
  }, [resumeAmbienceFromGesture]);
  const toggle = useCallback(() => {
    if (!isPlaying) void resumeAmbienceFromGesture();
    if (!isPlaying && !ambienceSuppressedRef.current) setAmbienceEnabled(true);
    intendPlayRef.current = !isPlaying;
    if (readyRef.current) {
      if (isPlaying) playerRef.current?.pauseVideo();
      else playerRef.current?.playVideo();
    }
  }, [isPlaying, resumeAmbienceFromGesture]);
  const next = useCallback(() => advance(1), [advance]);
  const previous = useCallback(() => advance(-1), [advance]);
  const seek = useCallback((seconds: number) => {
    if (readyRef.current) playerRef.current?.seekTo(Math.max(0, seconds), true);
  }, []);
  const setMusicVolume = useCallback(
    (value: number) => {
      const clamped = Math.min(1, Math.max(0, value));
      volumeRef.current = clamped;
      setMusicVol(clamped);
      rampMusicOutput(effectiveMusicVolume(clamped, ambienceActiveRef.current), 160);
    },
    [rampMusicOutput],
  );
  const toggleAmbience = useCallback(() => {
    const nextEnabled = !ambienceEnabled;
    ambienceSuppressedRef.current = !nextEnabled;
    setAmbienceEnabled(nextEnabled);
    if (nextEnabled) void resumeAmbienceFromGesture();
  }, [ambienceEnabled, resumeAmbienceFromGesture]);
  const triggerAmbienceEvent = useCallback(() => ambience.triggerEvent(), [ambience]);
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
    generationRef.current += 1;
    readyRef.current = false;
    intendPlayRef.current = false;
    playerRef.current?.pauseVideo();
    setRoom(null);
    setPlaylist([]);
    queueRef.current = [];
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
    musicBlocked,
    isCuratedPlaylist: Boolean(room),
    nowPlaying,
    musicVolume,
    ambienceLevel,
    ambienceEnabled,
    ambienceStatus: ambience.status,
    ambienceActive: ambience.active,
    ambienceEventPulse: ambience.eventPulse,
    ambienceEventReady: ambience.eventReady,
    ambienceEventPlaying: ambience.eventPlaying,
    openRoom,
    toggle,
    next,
    previous,
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
        aria-hidden
        className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px overflow-hidden"
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
