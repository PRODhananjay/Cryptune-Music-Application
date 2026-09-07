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
import { api, type Track } from "./api";

type PlayerState = {
  queue: Track[];
  current: Track | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  playQueue: (tracks: Track[], startIndex: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (s: number) => void;
  setVolume: (v: number) => void;
  removeTrack: (id: string) => void;
};

const PlayerContext = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);
  const loadRequestRef = useRef(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);

  const current = queue[index] ?? null;

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const onTime = () => setPosition(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => setIndex((i) => i + 1);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.pause();
      audio.removeAttribute("src");
      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current);
        audioObjectUrlRef.current = null;
      }
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const requestId = ++loadRequestRef.current;

    if (!current) {
      audio.pause();
      audio.removeAttribute("src");
      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current);
        audioObjectUrlRef.current = null;
      }
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const { audio_url } = await api.trackUrls(current.id);
        if (cancelled || requestId !== loadRequestRef.current || !audio_url) return;

        /*
         * Do not assign the backend audio URL directly to <audio>.
         * Browser download-manager integrations (for example IDM) can
         * detect a normal audio URL and open their "Download File Info"
         * dialog whenever React updates the player. Fetching the file and
         * using a blob URL keeps it inside the web player and prevents that
         * download dialog from hijacking playback.
         */
        const response = await fetch(audio_url, {
          credentials: "omit",
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`Audio request failed (${response.status})`);

        const blob = await response.blob();
        if (cancelled || requestId !== loadRequestRef.current) return;

        if (audioObjectUrlRef.current) {
          URL.revokeObjectURL(audioObjectUrlRef.current);
        }

        const objectUrl = URL.createObjectURL(blob);
        audioObjectUrlRef.current = objectUrl;
        audio.src = objectUrl;
        audio.load();
        setPosition(0);
        setDuration(current.duration_seconds || 0);
        await audio.play();
      } catch (error) {
        if (cancelled || requestId !== loadRequestRef.current) return;
        console.error("Audio playback error:", error);
        setIsPlaying(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [current?.id]);

  const playQueue = useCallback((tracks: Track[], startIndex: number) => {
    setQueue(tracks);
    setIndex(Math.max(0, Math.min(startIndex, tracks.length - 1)));
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }, []);

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, queue.length - 1)), [queue.length]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  const removeTrack = useCallback((id: string) => {
    setQueue((items) => {
      const removedIndex = items.findIndex((item) => item.id === id);
      if (removedIndex === -1) return items;

      setIndex((currentIndex) => {
        if (items.length === 1) {
          audioRef.current?.pause();
          audioRef.current?.removeAttribute("src");
          if (audioObjectUrlRef.current) {
            URL.revokeObjectURL(audioObjectUrlRef.current);
            audioObjectUrlRef.current = null;
          }
          setIsPlaying(false);
          setPosition(0);
          setDuration(0);
          return 0;
        }
        if (removedIndex < currentIndex) return currentIndex - 1;
        if (removedIndex === currentIndex) {
          return Math.min(currentIndex, items.length - 2);
        }
        return currentIndex;
      });

      return items.filter((item) => item.id !== id);
    });
  }, []);

  const seek = useCallback((s: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = s;
    setPosition(s);
  }, []);

  const value = useMemo<PlayerState>(
    () => ({
      queue,
      current,
      isPlaying,
      position,
      duration,
      volume,
      playQueue,
      toggle,
      next,
      prev,
      seek,
      setVolume: setVolumeState,
      removeTrack,
    }),
    [queue, current, isPlaying, position, duration, volume, playQueue, toggle, next, prev, seek, removeTrack],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}
