import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { api, formatTime, type Track } from "../api";
import { usePlayer } from "../player";
import { CoverArt } from "./CoverArt";

type LyricLine = { time: number | null; text: string; index: number };

function parseLyrics(raw: string | null): LyricLine[] {
  if (!raw?.trim()) return [];
  const result: LyricLine[] = [];
  let index = 0;
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const matches = [...line.matchAll(/\[(\d{1,3}:\d{2}(?:\.\d{1,3})?)\]/g)];
    const text = line.replace(/\[\d{1,3}:\d{2}(?:\.\d{1,3})?\]/g, "").trim();
    if (!matches.length) {
      result.push({ time: null, text: line, index: index++ });
      continue;
    }
    for (const match of matches) {
      const [minutes, seconds] = match[1].split(":").map(Number);
      const time = minutes * 60 + seconds;
      if (Number.isFinite(time)) result.push({ time, text: text || "♪", index: index++ });
    }
  }
  const timed = result.filter((line) => line.time !== null).sort((a, b) => a.time! - b.time!);
  return timed.length ? [...timed, ...result.filter((line) => line.time === null)] : result;
}

export function FullscreenPlayer({ track, onClose }: { track: Track; onClose: () => void }) {
  const { position, duration, volume, isPlaying, toggle, next, prev, seek, setVolume } = usePlayer();
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const lyricsScrollRef = useRef<HTMLDivElement | null>(null);
  const lines = useMemo(() => parseLyrics(track.lyrics), [track.lyrics]);
  const hasSync = lines.some((line) => line.time !== null);
  const timedLines = lines.filter((line) => line.time !== null);
  const activeIndex = hasSync
    ? timedLines.reduce((active, line, i) => (line.time! <= position + 0.05 ? i : active), -1)
    : -1;

  useEffect(() => {
    let cancelled = false;
    api.trackUrls(track.id).then(({ cover_url }) => {
      if (!cancelled) setCoverUrl(cover_url);
    }).catch(() => {
      if (!cancelled) setCoverUrl(null);
    });
    return () => { cancelled = true; };
  }, [track.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key.toLowerCase() === "l" && !event.metaKey && !event.ctrlKey) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    // Move ONLY the lyrics viewport. Do not use scrollIntoView(), because it can
    // scroll the fullscreen page/layout itself when the active lyric changes.
    const container = lyricsScrollRef.current;
    if (!container || activeIndex < 0) return;
    const active = container.querySelector<HTMLButtonElement>(".fullscreen-lyrics-line.active");
    if (!active) return;

    const target = active.offsetTop - container.clientHeight * 0.42;
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    container.scrollTo({
      top: Math.max(0, Math.min(target, maxScroll)),
      behavior: "smooth",
    });
  }, [activeIndex, track.id]);

  const max = duration || track.duration_seconds || 0;
  const remaining = Math.max(0, max - position);
  const displayLines = lines.length ? lines : [{ time: null, text: "Lyrics haven't been added for this song yet.", index: 0 }];

  return (
    <div
      className="fullscreen-player"
      style={coverUrl ? { "--fullscreen-cover": `url(${coverUrl})` } as CSSProperties : undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Full screen music player"
    >
      <div className="fullscreen-backdrop" />
      <button className="fullscreen-close" onClick={onClose} aria-label="Close full screen player">×</button>

      <div className="fullscreen-layout">
        <section className="fullscreen-left">
          <div className="fullscreen-art-wrap">
            <CoverArt
              trackId={track.id}
              hasCover={Boolean(track.cover_path)}
              alt={`${track.title} cover`}
              className="fullscreen-art"
            />
          </div>

          <div className="fullscreen-song-row">
            <div className="fullscreen-song-meta">
              <h1>{track.title}</h1>
              <p>{track.artist}{track.album ? ` — ${track.album}` : ""}</p>
            </div>
            <div className="fullscreen-actions">
              <button aria-label="Like" title="Like">♡</button>
              <button aria-label="More options" title="More options">•••</button>
            </div>
          </div>

          <div className="fullscreen-seek-row">
            <span>{formatTime(position)}</span>
            <input type="range" min={0} max={max || 1} step={0.5} value={Math.min(position, max || 0)} onChange={(e) => seek(Number(e.target.value))} aria-label="Seek" />
            <span>-{formatTime(remaining)}</span>
          </div>

          <div className="fullscreen-controls">
            <button aria-label="Shuffle">⤨</button>
            <button onClick={prev} aria-label="Previous">◀</button>
            <button className="fullscreen-play" onClick={toggle} aria-label="Play or pause">{isPlaying ? "❚❚" : "▶"}</button>
            <button onClick={next} aria-label="Next">▶</button>
            <button aria-label="Repeat">↻</button>
          </div>

          <div className="fullscreen-volume">
            <span>◖</span>
            <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Volume" />
            <span>◗</span>
          </div>
        </section>

        <section className="fullscreen-lyrics">
          <div className="fullscreen-lyrics-head">
            <div className="fullscreen-tabs">
              <button className={!showInfo ? "active" : ""} onClick={() => setShowInfo(false)}>Lyrics</button>
              <button className={showInfo ? "active" : ""} onClick={() => setShowInfo(true)}>Info</button>
            </div>
            <span className="fullscreen-sync">{hasSync ? "SYNCED" : "LYRICS"}</span>
          </div>

          {!showInfo ? (
            <div ref={lyricsScrollRef} className="fullscreen-lyrics-scroll">
              {displayLines.map((line, index) => {
                const timedIndex = timedLines.findIndex((item) => item.index === line.index);
                const active = hasSync && timedIndex === activeIndex;
                const past = hasSync && timedIndex >= 0 && timedIndex < activeIndex;
                return (
                  <button
                    key={`${line.index}-${line.text}`}
                    className={`fullscreen-lyrics-line${active ? " active" : ""}${past ? " past" : ""}`}
                    disabled={line.time === null}
                    onClick={() => line.time !== null && seek(line.time)}
                  >
                    {line.text}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="fullscreen-info">
              <span>NOW PLAYING</span>
              <h2>{track.title}</h2>
              <p>{track.artist}</p>
              <p>{track.album || "Single"}</p>
              <p>{track.genre || "Music"}</p>
            </div>
          )}
        </section>
      </div>

      <div className="fullscreen-hint"><kbd>ESC</kbd> to exit</div>
    </div>
  );
}
