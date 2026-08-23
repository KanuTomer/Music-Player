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
  loadPlaylist: (o: { list: string; listType: "playlist"; index?: number }) => void;
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  nextVideo: () => void;
  previousVideo: () => void;
  setVolume: (v: number) => void;
  seekTo: (s: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVideoData: () => { video_id?: string; title?: string; author?: string };
  getPlaylistIndex: () => number;
  getPlaylist: () => string[] | null;
  destroy: () => void;
};

export type NowPlaying = {
  videoId: string | null;
  title: string | null;
  channel: string | null;
  position: number;
  duration: number;
  index: number;
  total: number;
};

const scenePlaylists: Record<string, string> = {
  "sainik-dhaba": "PLO1WqL1Pm6ic",
  "nai-ki-dukaan": "PLRrYJLVviXe3yGN2NIrw0Qj_jEmjQpOKi",
  "chai-ki-tapri": "PLUByR8i-v0KY",
  "raj-mistri": "PLd--yIT4E7VcYzwx3iawJLQFdAk9HyAZa",
  "rail-yatra": "PLQdfb6nEJz_X-0Tkwec2N2Sj83d_DM36d",
  "raat-ki-bus": "PL8xy2vgHsFJjhGJJnwp8mspv27hN4K_Bg",
  "sarkari-daftar": "PLJABXrnHALkJHG7vK7QMhJ6_Wxl6OPriF",
  "doordarshan-shaam": "PLx99j5cYmjF6IyvaICVMuC_SY7SNo0Rwo",
  "bhojpuriya-devara": "PLJ3M6AoVR-gZtOkB4v-_XgzYQz_6UQssJ",
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
  isCuratedPlaylist: boolean;
  nowPlaying: NowPlaying;
  musicVolume: number;
  ambienceVolume: number;
  ambienceEnabled: boolean;
  openRoom: (room: RoomPayload) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setMusicVolume: (v: number) => void;
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
  const loadedPlaylistRef = useRef<string | null>(null);
  const [room, setRoom] = useState<RoomPayload | null>(null);
  const [daypart, setDaypart] = useState<Daypart>(() => currentDaypart());
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsGate, setNeedsGate] = useState(true);
  const [musicReady, setMusicReady] = useState(false);
  const [musicBlocked, setMusicBlocked] = useState(false);
  const [ambienceVolume, setAmbienceVol] = useState(0.7);
  const [ambienceEnabled, setAmbienceEnabled] = useState(true);
  const [musicVolume, setMusicVol] = useState(0.7);
  const musicVolumeRef = useRef(0.7);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying>({
    videoId: null,
    title: null,
    channel: null,
    position: 0,
    duration: 0,
    index: 0,
    total: 0,
  });

  const playlist = useMemo(
    () => (room ? forDaypart(room.tracks, daypart) : []),
    [room, daypart],
  );
  const track = playlist[index % Math.max(playlist.length, 1)] ?? null;
  const isCuratedPlaylist = Boolean(room && scenePlaylists[room.scene.slug]);

  // Poll the hidden YouTube player for real track metadata + progress
  useEffect(() => {
    const t = window.setInterval(() => {
      const p = playerRef.current;
      if (!p || typeof p.getVideoData !== "function") return;
      try {
        const d = p.getVideoData();
        const list = typeof p.getPlaylist === "function" ? p.getPlaylist() : null;
        setNowPlaying((prev) => {
          const nextState: NowPlaying = {
            videoId: d?.video_id ?? null,
            title: d?.title ?? null,
            channel: d?.author ?? null,
            position: p.getCurrentTime() || 0,
            duration: p.getDuration() || 0,
            index: typeof p.getPlaylistIndex === "function" ? p.getPlaylistIndex() : 0,
            total: list?.length ?? 0,
          };
          if (
            prev.videoId === nextState.videoId &&
            prev.title === nextState.title &&
            Math.abs(prev.position - nextState.position) < 0.4 &&
            prev.duration === nextState.duration &&
            prev.index === nextState.index &&
            prev.total === nextState.total
          ) {
            return prev;
          }
          return nextState;
        });
      } catch {
        /* player not ready yet */
      }
    }, 500);
    return () => window.clearInterval(t);
  }, []);

  const setMusicVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    musicVolumeRef.current = clamped;
    setMusicVol(clamped);
    try {
      playerRef.current?.setVolume(Math.round(clamped * 100));
    } catch {
      /* noop */
    }
  }, []);

  const previous = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (room && scenePlaylists[room.scene.slug]) {
      p.previousVideo();
      return;
    }
    setIndex((i) => (playlist.length ? (i - 1 + playlist.length) % playlist.length : 0));
  }, [playlist.length, room]);

  const seek = useCallback((seconds: number) => {
    try {
      playerRef.current?.seekTo(Math.max(0, seconds), true);
    } catch {
      /* noop */
    }
  }, []);


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
      p.setVolume(themeTransitionRef.current ? 0 : Math.round(musicVolumeRef.current * 100));
      if (autoplay) p.playVideo();
      else p.pauseVideo();
      if (autoplay && themeTransitionRef.current) {
        let step = 0;
        if (volumeTimerRef.current !== null) window.clearInterval(volumeTimerRef.current);
        volumeTimerRef.current = window.setInterval(() => {
          step += 1;
          p.setVolume(Math.round((musicVolumeRef.current * 100 * step) / 8));
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

  const cueRoomPlaylist = useCallback((slug: string, autoplay: boolean) => {
    const p = playerRef.current;
    const playlistId = scenePlaylists[slug];
    if (!p || !playlistId) return false;

    try {
      if (loadedPlaylistRef.current !== playlistId) {
        p.loadPlaylist({ list: playlistId, listType: "playlist", index: 0 });
        loadedPlaylistRef.current = playlistId;
      } else if (autoplay) {
        p.playVideo();
      }
      p.setVolume(themeTransitionRef.current ? 0 : Math.round(musicVolumeRef.current * 100));
      if (!autoplay) p.pauseVideo();
      if (autoplay && themeTransitionRef.current) {
        let step = 0;
        if (volumeTimerRef.current !== null) window.clearInterval(volumeTimerRef.current);
        volumeTimerRef.current = window.setInterval(() => {
          step += 1;
          p.setVolume(Math.round((musicVolumeRef.current * 100 * step) / 8));
          if (step >= 8) {
            if (volumeTimerRef.current !== null) window.clearInterval(volumeTimerRef.current);
            volumeTimerRef.current = null;
            themeTransitionRef.current = false;
          }
        }, 100);
      }
      return true;
    } catch {
      loadedPlaylistRef.current = null;
      return false;
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
    if (!room || !cueRoomPlaylist(room.scene.slug, true)) void cueTrack(track, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.scene.slug, musicReady, needsGate]);

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
    if (room && scenePlaylists[room.scene.slug] && playerRef.current) {
      playerRef.current.nextVideo();
      return;
    }
    setIndex((i) => (playlist.length ? (i + 1) % playlist.length : 0));
  }, [playlist.length, room]);

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
        p.setVolume(Math.max(0, Math.round(musicVolumeRef.current * 100 * step / 7)));
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
    loadedPlaylistRef.current = null;
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
    isCuratedPlaylist,
    nowPlaying,
    musicVolume,
    ambienceVolume,
    ambienceEnabled,
    openRoom,
    toggle,
    next,
    previous,
    seek,
    setMusicVolume,
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
