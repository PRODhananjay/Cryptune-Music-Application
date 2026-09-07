import { useEffect, useMemo, useRef } from "react";
import type { Track } from "../api";
import { usePlayer } from "../player";
import { CoverArt } from "./CoverArt";

type LyricLine = {
  time: number | null;
  text: string;
  index: number;
};

function parseTimestamp(value: string) {
  const parts = value.split(":");
  if (parts.length !== 2) return null;
  const minutes = Number(parts[0]);
  const seconds = Number(parts[1]);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
  return minutes * 60 + seconds;
}

/**
 * Supports normal lyrics and LRC-style synchronized lyrics:
 * [00:12.50] First line
 * [00:17.20] Second line
 * Multiple timestamps on one line are supported too.
 */
function parseLyrics(raw: string | null): LyricLine[] {
  if (!raw?.trim()) return [];

  const result: LyricLine[] = [];
  let order = 0;

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const matches = [...line.matchAll(/\[(\d{1,3}:\d{2}(?:\.\d{1,3})?)\]/g)];
    const text = line.replace(/\[\d{1,3}:\d{2}(?:\.\d{1,3})?\]/g, "").trim();

    if (!matches.length) {
      result.push({ time: null, text: line, index: order++ });
      continue;
    }

    for (const match of matches) {
      const time = parseTimestamp(match[1]);
      if (time !== null) result.push({ time, text: text || "♪", index: order++ });
    }
  }

  const timed = result.filter((line) => line.time !== null).sort((a, b) => (a.time! - b.time!));
  const untimed = result.filter((line) => line.time === null);

  // If timestamps exist, show timed lines in musical order and keep any
  // ordinary lines underneath rather than throwing them away.
  return timed.length ? [...timed, ...untimed] : result;
}

export function LyricsPanel({ track, onClose }: { track: Track; onClose: () => void }) {
  const { position, seek } = usePlayer();
  const lineRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const lines = useMemo(() => parseLyrics(track.lyrics), [track.lyrics]);
  const hasSync = lines.some((line) => line.time !== null);

  const activeIndex = useMemo(() => {
    if (!hasSync) return -1;

    let active = -1;
    for (let i = 0; i < lines.length; i += 1) {
      const time = lines[i].time;
      if (time !== null && time <= position + 0.05) active = i;
      if (time !== null && time > position + 0.05) break;
    }
    return active;
  }, [hasSync, lines, position]);

  useEffect(() => {
    if (activeIndex < 0) return;
    lineRefs.current[activeIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeIndex]);

  const displayLines = lines.length
    ? lines
    : [{ time: null, text: "Lyrics haven't been added for this song yet.", index: 0 }];

  return (
    <aside className="lyrics-panel" aria-label="Lyrics">
      <div className="lyrics-head">
        <div>
          <span className="label">Now playing</span>
          <h2>Lyrics</h2>
        </div>
        <div className="lyrics-head-actions">
          {hasSync && <span className="lyrics-sync-badge">SYNCED</span>}
          <button className="icon-btn" onClick={onClose} aria-label="Close lyrics">×</button>
        </div>
      </div>

      <div className="lyrics-track">
        <CoverArt
          trackId={track.id}
          hasCover={Boolean(track.cover_path)}
          alt={`${track.title} cover`}
          className="lyrics-cover"
        />
        <div className="lyrics-track-meta">
          <strong>{track.title}</strong>
          <span>{track.artist}</span>
          <small>{track.album || "Single"}</small>
        </div>
      </div>

      <div className="lyrics-divider" />

      <div className="lyrics-scroll">
        {displayLines.map((line, index) => {
          const isActive = hasSync && index === activeIndex;
          const isPast = hasSync && line.time !== null && activeIndex >= 0 && index < activeIndex;

          return (
            <button
              key={`${line.text}-${line.time}-${line.index}`}
              ref={(element) => { lineRefs.current[index] = element; }}
              type="button"
              className={`lyrics-line${isActive ? " active" : ""}${isPast ? " past" : ""}`}
              onClick={() => line.time !== null && seek(line.time)}
              disabled={line.time === null}
              aria-current={isActive ? "true" : undefined}
            >
              {isActive && <span className="lyrics-note">♪</span>}
              {line.text}
            </button>
          );
        })}
      </div>

      <div className="lyrics-switcher">
        <button className="active">Lyrics</button>
        <button disabled>Info</button>
      </div>
    </aside>
  );
}
