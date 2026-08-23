import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { resolveTrackVideo, type RoomPayload, type Track } from "./rooms.functions";
import { currentDaypart, forDaypart, type Daypart } from "./dayparts";
import { sceneAmbience } from "./scene-art";
import { setAmbienceVolume, startAmbience, stopAmbience } from "./ambience";

type YTPlayer = {
  loadPlaylist: (o: { list: string; listType: string }) => void;
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  nextVideo: () => void;
  setVolume: (v: number) => void;
  destroy: () => void;
};

type PlayerState = {
  room: RoomPayload | null;
  daypart: Daypart;
  playlist: Track[];
  track: Track | null;
  isPlaying: boolean;
  needsGate: boolean;
  musicReady: boolean;
  musicBlocked: boolean;
  ambienceVolume: number;
  ambienceEnabled: boolean;
  openRoom: (room: RoomPayload) => void;
  toggle: () => void;
  next: () => void;
  start: () => void;
  setAmbience: (v: number) => void;
  toggleAmbience: () => void;
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

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const existing = document.getElementById("yt-iframe-api");
    if (!existing) {
      const s = document.createElement("script");
      s.id = "yt-iframe-api";
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const poll = window.setInterval(() => {
      if (window.YT?.Player) {
        window.clearInterval(poll);
        resolve();
      }
    }, 250);
    window.setTimeout(() => {
      window.clearInterval(poll);
      resolve();
    }, 8000);
  });
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const themeTransitionRef = useRef(false);
  const volumeTimerRef = useRef<number | null>(null);
  const resolvedRef = useRef<Map<string, string>>(new Map());
  const [room, setRoom] = useState<RoomPayload | null>(null);
  const [daypart, setDaypart] = useState<Daypart>(() => currentDaypart());
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsGate, setNeedsGate] = useState(true);
  const [musicReady, setMusicReady] = useState(false);
  const [musicBlocked, setMusicBlocked] = useState(false);
  const [ambienceVolume, setAmbienceVol] = useState(0.7);
  const [ambienceEnabled, setAmbienceEnabled] = useState(true);

  const playlist = useMemo(
    () => (room ? forDaypart(room.tracks, daypart) : []),
    [room, daypart],
  );
  const track = playlist[index % Math.max(playlist.length, 1)] ?? null;

  // IST daypart ticks over while a room is left running for hours
  useEffect(() => {
    const t = window.setInterval(() => setDaypart(currentDaypart()), 60000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadYouTubeApi().then(() => {
      if (cancelled || !hostRef.current || playerRef.current || !window.YT?.Player) return;
      playerRef.current = new window.YT.Player(hostRef.current, {
        height: "1",
        width: "1",
        playerVars: { autoplay: 0, controls: 0, playsinline: 1 },
        events: {
          onReady: () => setMusicReady(true),
          onError: () => {
            setMusicBlocked(true);
            setIndex((i) => i + 1);
          },
          onStateChange: (e: { data: number }) => {
            if (e.data === 1) {
              setIsPlaying(true);
              setMusicBlocked(false);
            }
            if (e.data === 2) setIsPlaying(false);
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const cueTrack = useCallback(async (t: Track | null, autoplay: boolean) => {
    const p = playerRef.current;
    if (!p || !t) return;
    let videoId = t.youtube_id ?? resolvedRef.current.get(t.id) ?? null;
    if (!videoId && t.search_query) {
      try {
        const res = await resolveTrackVideo({ data: { query: t.search_query } });
        if (res.videoId) {
          resolvedRef.current.set(t.id, res.videoId);
          videoId = res.videoId;
        }
      } catch {
        /* fall through to ambience-only */
      }
    }
    if (!videoId) {
      setMusicBlocked(true);
      return;
    }
    try {
      p.loadVideoById(videoId);
      p.setVolume(themeTransitionRef.current ? 0 : 70);
      if (autoplay) p.playVideo();
      else p.pauseVideo();
      if (autoplay && themeTransitionRef.current) {
        let step = 0;
        if (volumeTimerRef.current !== null) window.clearInterval(volumeTimerRef.current);
        volumeTimerRef.current = window.setInterval(() => {
          step += 1;
          p.setVolume(Math.round((70 * step) / 8));
          if (step >= 8) {
            if (volumeTimerRef.current !== null) window.clearInterval(volumeTimerRef.current);
            volumeTimerRef.current = null;
            themeTransitionRef.current = false;
          }
        }, 100);
      }
    } catch {
      setMusicBlocked(true);
    }
  }, []);


  const openRoom = useCallback(
    (next: RoomPayload) => {
      setRoom((prev) => {
        if (prev?.scene.slug === next.scene.slug) return prev;
        setIndex(0);
        return next;
      });
    },
    [],
  );

  // ambience follows the room, but only after the user has tapped play once
  useEffect(() => {
    if (!room || needsGate) return;
    const keys = sceneAmbience[room.scene.slug] ?? ["chatter", "fan"];
    startAmbience(keys, ambienceEnabled ? ambienceVolume : 0);
    return () => stopAmbience();
    // ambienceVolume handled separately so we don't rebuild the graph on slider drags
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.scene.slug, needsGate]);

  useEffect(() => {
    setAmbienceVolume(ambienceEnabled ? ambienceVolume : 0);
  }, [ambienceEnabled, ambienceVolume]);

  const toggleAmbience = useCallback(() => {
    setAmbienceEnabled((enabled) => !enabled);
  }, []);

  useEffect(() => {
    if (needsGate || !musicReady) return;
    void cueTrack(track, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id, musicReady, needsGate]);

  const start = useCallback(() => {
    setNeedsGate(false);
    setIsPlaying(true);
    playerRef.current?.playVideo();
  }, []);

  const toggle = useCallback(() => {
    if (needsGate) {
      start();
      return;
    }
    if (isPlaying) {
      playerRef.current?.pauseVideo();
      setIsPlaying(false);
      setAmbienceVolume(0);
    } else {
      playerRef.current?.playVideo();
      setIsPlaying(true);
      setAmbienceVolume(ambienceVolume);
    }
  }, [ambienceVolume, isPlaying, needsGate, start]);

  const next = useCallback(() => {
    setIndex((i) => (playlist.length ? (i + 1) % playlist.length : 0));
  }, [playlist.length]);

  const fadeForThemeChange = useCallback(() => {
    themeTransitionRef.current = true;
    setAmbienceVolume(0);
    const p = playerRef.current;
    if (!p || !isPlaying) return Promise.resolve();

    if (volumeTimerRef.current !== null) window.clearInterval(volumeTimerRef.current);
    return new Promise<void>((resolve) => {
      let step = 7;
      volumeTimerRef.current = window.setInterval(() => {
        step -= 1;
        p.setVolume(Math.max(0, step * 10));
        if (step <= 0) {
          if (volumeTimerRef.current !== null) window.clearInterval(volumeTimerRef.current);
          volumeTimerRef.current = null;
          resolve();
        }
      }, 45);
    });
  }, [isPlaying]);

  const leave = useCallback(() => {
    setRoom(null);
    setNeedsGate(true);
    setIsPlaying(false);
    stopAmbience();
    playerRef.current?.pauseVideo();
  }, []);

  const value: PlayerState = {
    room,
    daypart,
    playlist,
    track,
    isPlaying,
    needsGate,
    musicReady,
    musicBlocked,
    ambienceVolume,
    ambienceEnabled,
    openRoom,
    toggle,
    next,
    start,
    setAmbience: setAmbienceVol,
    toggleAmbience,
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

export function usePlayer(): PlayerState {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}
