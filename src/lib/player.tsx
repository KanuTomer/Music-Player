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
  getPlayerState: () => number;
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
  "doordarshan-shaam": "PLiIasA9CetIoIgLf6e_EXMVbAPr-04g6z",
  "bhojpuriya-devara": "PLJ3M6AoVR-gZtOkB4v-_XgzYQz_6UQssJ",
  "corporate-majdoor": "PLLounUW9rgqHr6YYR7r4oQOIeqdCZ7gO8",
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
  openRoom: (room: RoomPayload) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setMusicVolume: (v: number) => void;
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
  const playlistStartRef = useRef<Map<string, number>>(new Map());
  // True whenever the app wants sound; a watchdog keeps the embed honest.
  const intendPlayRef = useRef(false);
  const [room, setRoom] = useState<RoomPayload | null>(null);
  const [daypart, setDaypart] = useState<Daypart>(() => currentDaypart());
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsGate, setNeedsGate] = useState(true);
  const [musicReady, setMusicReady] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [musicBlocked, setMusicBlocked] = useState(false);
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

  // Poll the hidden YouTube player for real track metadata + progress.
  // Metadata (id/title/channel) is only committed once YouTube reports a title
  // for the new video, so cover art, title and artist swap in one atomic step.
  useEffect(() => {
    const t = window.setInterval(() => {
      const p = playerRef.current;
      if (!p || typeof p.getVideoData !== "function") return;
      try {
        const d = p.getVideoData();
        const list = typeof p.getPlaylist === "function" ? p.getPlaylist() : null;
        const position = p.getCurrentTime() || 0;
        const duration = p.getDuration() || 0;
        const idx = typeof p.getPlaylistIndex === "function" ? p.getPlaylistIndex() : 0;
        const total = list?.length ?? 0;
        const metaReady = Boolean(d?.video_id && d?.title);

        setNowPlaying((prev) => {
          const nextState: NowPlaying = metaReady
            ? {
                videoId: d.video_id ?? null,
                title: d.title ?? null,
                channel: d?.author ?? null,
                position,
                duration,
                index: idx,
                total,
              }
            : {
                ...prev,
                position,
                duration: duration > 0 ? duration : prev.duration,
                index: idx,
                total,
              };
          if (
            prev.videoId === nextState.videoId &&
            prev.title === nextState.title &&
            prev.channel === nextState.channel &&
            Math.abs(prev.position - nextState.position) < 0.25 &&
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
    }, 250);
    return () => window.clearInterval(t);
  }, []);


  // Playback watchdog: while the app intends to play, an embed that sits in
  // UNSTARTED (-1), PAUSED (2) or CUED (5) is nudged until it really plays.
  useEffect(() => {
    const t = window.setInterval(() => {
      const p = playerRef.current;
      if (!p || !intendPlayRef.current) return;
      try {
        if (typeof p.getPlayerState !== "function") return;
        const state = p.getPlayerState();
        if (state === 1 || state === 3) return; // playing / buffering
        p.playVideo();
      } catch {
        /* embed not ready yet */
      }
    }, 700);
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

  const buildPlayer = useCallback((playlistId: string | null, autoplay: boolean) => {
    const host = hostRef.current;
    if (!host || !window.YT?.Player) return null;
    try {
      playerRef.current?.destroy();
    } catch {
      /* already gone */
    }
    host.innerHTML = "";
    const el = document.createElement("div");
    host.appendChild(el);
    setMusicReady(false);
    playerRef.current = new window.YT.Player(el, {
      height: "1",
      width: "1",
      playerVars: {
        autoplay: autoplay ? 1 : 0,
        controls: 0,
        playsinline: 1,
        ...(playlistId ? { list: playlistId, listType: "playlist" } : {}),
      },
      events: {
        onReady: () => {
          setMusicReady(true);
          const p = playerRef.current;
          if (!p) return;
          try {
            p.setVolume(Math.round(musicVolumeRef.current * 100));
            if (playlistId) {
              const availableTracks = p.getPlaylist() ?? [];
              const total = availableTracks.length;
              const previousStart = playlistStartRef.current.get(playlistId) ?? -1;
              let nextStart = 0;

              if (total > 1) {
                do {
                  nextStart = Math.floor(Math.random() * total);
                } while (nextStart === previousStart);
              }

              playlistStartRef.current.set(playlistId, nextStart);
              p.loadPlaylist({ list: playlistId, listType: "playlist", index: nextStart });
              if (autoplay) {
                // A rebuilt embed often cues without starting; the watchdog
                // below keeps retrying until it is actually playing.
                intendPlayRef.current = true;
                setIsPlaying(true);
                p.playVideo();
              } else {
                intendPlayRef.current = false;
                p.pauseVideo();
              }
            } else if (autoplay) {
              intendPlayRef.current = true;
              p.playVideo();
            }
          } catch {
            /* noop */
          }
        },
        onError: () => {
          setMusicBlocked(true);
          try {
            playerRef.current?.nextVideo();
          } catch {
            /* noop */
          }
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
    return playerRef.current;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadYouTubeApi().then(() => {
      if (!cancelled) setApiReady(true);
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
        /* no playable video id */
      }
    }
    if (!videoId) {
      setMusicBlocked(true);
      return;
    }
    try {
      p.loadVideoById(videoId);
      p.setVolume(themeTransitionRef.current ? 0 : Math.round(musicVolumeRef.current * 100));
      intendPlayRef.current = autoplay;
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

  const cueRoomPlaylist = useCallback(
    (slug: string, autoplay: boolean) => {
      const playlistId = scenePlaylists[slug];
      if (!playlistId) return false;

      try {
        const existing = playerRef.current;
        // Rebuild only when the list changed or the embed is gone; a fresh
        // embed reports no playlist until onReady, so don't treat that as a
        // reason to rebuild (that would loop forever).
        if (loadedPlaylistRef.current !== playlistId || !existing) {
          themeTransitionRef.current = false;
          if (volumeTimerRef.current !== null) {
            window.clearInterval(volumeTimerRef.current);
            volumeTimerRef.current = null;
          }
          const built = buildPlayer(playlistId, autoplay);
          // Only remember the list once the embed really exists, so a failed
          // build can never leave us pointing at a silent player.
          loadedPlaylistRef.current = built ? playlistId : null;
          return Boolean(built);
        }
        const p = existing;
        intendPlayRef.current = autoplay;
        if (autoplay) p.playVideo();
        else p.pauseVideo();
        p.setVolume(Math.round(musicVolumeRef.current * 100));
        return true;
      } catch {
        loadedPlaylistRef.current = null;
        return false;
      }
    },
    [buildPlayer],
  );


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

  useEffect(() => {
    if (needsGate || !apiReady) return;
    // Curated playlists rebuild the embed themselves, so they must not wait on
    // a previous embed becoming ready — otherwise a room can stay silent.
    if (room && cueRoomPlaylist(room.scene.slug, true)) return;
    if (!playerRef.current) {
      buildPlayer(null, false);
      return;
    }
    if (!musicReady) return;
    void cueTrack(track, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.scene.slug, apiReady, musicReady, needsGate]);

  const start = useCallback(() => {
    intendPlayRef.current = true;
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
      intendPlayRef.current = false;
      playerRef.current?.pauseVideo();
      setIsPlaying(false);
    } else {
      intendPlayRef.current = true;
      playerRef.current?.playVideo();
      setIsPlaying(true);
    }
  }, [isPlaying, needsGate, start]);

  const next = useCallback(() => {
    if (room && scenePlaylists[room.scene.slug] && playerRef.current) {
      playerRef.current.nextVideo();
      return;
    }
    setIndex((i) => (playlist.length ? (i + 1) % playlist.length : 0));
  }, [playlist.length, room]);

  const fadeForThemeChange = useCallback(() => {
    themeTransitionRef.current = true;
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
    intendPlayRef.current = false;
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
    openRoom,
    toggle,
    next,
    previous,
    seek,
    setMusicVolume,
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

export function usePlayer(): PlayerState {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}
