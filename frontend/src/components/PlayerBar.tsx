import { formatTime } from "../api";
import { usePlayer } from "../player";
import { CoverArt } from "./CoverArt";

export function PlayerBar({
  lyricsOpen,
  onLyricsToggle,
  queueCount,
  onCoverClick,
}: {
  lyricsOpen: boolean;
  onLyricsToggle: () => void;
  queueCount: number;
  onCoverClick: () => void;
}) {
  const { current, isPlaying, position, duration, volume, toggle, next, prev, seek, setVolume } = usePlayer();
  if (!current) return null;

  const max = duration || current.duration_seconds || 0;
  const progress = Math.min(position, max || 0);

  return (
    <div className="playerbar">
      <div className="playerbar-inner playerbar-modern">
        <div className="player-controls player-controls-modern">
          <div className="player-buttons">
            <button className="player-small" type="button" aria-label="Shuffle" title="Shuffle">⤨</button>
            <button className="player-small" type="button" onClick={prev} aria-label="Previous" title="Previous">◀</button>
            <button className="player-play" type="button" onClick={toggle} aria-label="Play or pause" title={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? "❚❚" : "▶"}
            </button>
            <button className="player-small" type="button" onClick={next} aria-label="Next" title="Next">▶</button>
            <button className="player-small" type="button" aria-label="Repeat" title="Repeat">↻</button>
          </div>
        </div>

        <div className="player-song player-song-modern">
          <button className="player-cover-button" type="button" onClick={onCoverClick} aria-label="Open full screen player" title="Open full screen player">
            <CoverArt trackId={current.id} hasCover={Boolean(current.cover_path)} alt={current.title} className="player-cover" />
          </button>
          <div className="player-song-copy">
            <div className="player-title-row">
              <div className="track-title" title={current.title}>{current.title}</div>
              <button className="player-like" type="button" aria-label="Like song" title="Like">♥</button>
            </div>
            <div className="track-sub" title={`${current.artist}${current.album ? ` · ${current.album}` : ""}`}>
              {current.artist}{current.album ? ` · ${current.album}` : ""}
            </div>
            <div className="player-progress player-progress-modern">
              <span className="mono">{formatTime(position)}</span>
              <input type="range" min={0} max={max || 1} step={0.5} value={progress} onChange={(e) => seek(Number(e.target.value))} aria-label="Seek" />
              <span className="mono">{formatTime(max)}</span>
            </div>
          </div>
        </div>

        <div className="player-tools player-tools-modern">
          <button className={`player-tool ${lyricsOpen ? "active" : ""}`} type="button" onClick={onLyricsToggle} aria-label="Toggle lyrics" title="Lyrics">♫</button>
          <button className="player-tool" type="button" aria-label="More options" title="More options">•••</button>
          <button className="player-tool queue-tool" type="button" aria-label="Queue" title="Queue">☷<sup>{queueCount}</sup></button>
          <span className="volume-icon" aria-hidden="true">◖</span>
          <input className="volume-range" type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Volume" />
        </div>
      </div>
    </div>
  );
}
