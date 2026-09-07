import { useEffect, useMemo, useState } from "react";
import { api, formatTime, type Track } from "../api";
import { usePlayer } from "../player";
import { CoverArt } from "../components/CoverArt";
import { useToast } from "../components/Toast";

export function HomePage({ onBrowse }: { onBrowse: () => void }) {
  const { playQueue, current, isPlaying } = usePlayer();
  const toast = useToast();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [likes, setLikes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.tracks(), api.myLikes()])
      .then(([t, l]) => {
        if (cancelled) return;
        setTracks(t.tracks);
        setLikes(l.track_ids);
      })
      .catch((e) => toast(e instanceof Error ? e.message : "Failed to load home", "error"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const featured = current || tracks[0] || null;
  const recent = tracks.slice(0, 4);
  const madeForYou = useMemo(() => {
    const seen = new Set<string>();
    return tracks.filter((track) => {
      const key = track.genre?.trim() || track.album?.trim() || "Your Mix";
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 4);
  }, [tracks]);

  const artists = useMemo(() => {
    const map = new Map<string, Track>();
    tracks.forEach((track) => { if (!map.has(track.artist)) map.set(track.artist, track); });
    return [...map.entries()].slice(0, 6);
  }, [tracks]);

  const play = (track: Track, list = tracks) => {
    const index = list.findIndex((item) => item.id === track.id);
    playQueue(list.length ? list : [track], index >= 0 ? index : 0);
  };

  const toggleLike = async (track: Track) => {
    try {
      if (likes.includes(track.id)) {
        await api.unlike(track.id);
        setLikes((items) => items.filter((id) => id !== track.id));
      } else {
        await api.like(track.id);
        setLikes((items) => [...items, track.id]);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not update favourite", "error");
    }
  };

  return (
    <section className="home-page">
      {loading ? <div className="home-loading">Loading your listening space…</div> : null}

      {featured ? (
        <div className="home-hero">
          <div className="home-hero-backdrop">
            <CoverArt trackId={featured.id} hasCover={Boolean(featured.cover_path)} alt="" />
          </div>
          <div className="home-hero-copy">
            <span className="home-eyebrow">FEATURED NOW</span>
            <h1>{featured.title}</h1>
            <p className="home-hero-meta">{featured.artist}{featured.album ? ` · ${featured.album}` : ""}</p>
            <p className="home-hero-description">A hand-picked listen from your SONGCRATE collection.</p>
            <div className="home-hero-actions">
              <button className="btn home-play" onClick={() => play(featured)}>{current?.id === featured.id && isPlaying ? "▶ Playing" : "▶ Play Now"}</button>
              <button className={`home-icon-action ${likes.includes(featured.id) ? "liked" : ""}`} onClick={() => void toggleLike(featured)} aria-label="Favourite featured song">{likes.includes(featured.id) ? "♥" : "♡"}</button>
              <button className="home-secondary" onClick={onBrowse}>More Music</button>
            </div>
          </div>
          <div className="home-hero-art">
            <CoverArt trackId={featured.id} hasCover={Boolean(featured.cover_path)} alt={`${featured.title} cover`} />
          </div>
        </div>
      ) : null}

      <HomeSectionTitle title="Recently Played" action="View all" onClick={onBrowse} />
      <div className="home-grid-two">
        <div className="home-recent card">
          {recent.length === 0 ? <p className="muted">No songs yet. Add music from the Upload bay.</p> : recent.map((track) => (
            <div className="home-recent-row" key={track.id}>
              <CoverArt trackId={track.id} hasCover={Boolean(track.cover_path)} alt={`${track.title} cover`} />
              <button className="home-track-info" onClick={() => play(track)}>
                <strong>{track.title}</strong>
                <span>{track.artist}</span>
              </button>
              <span className="mono muted">{formatTime(track.duration_seconds)}</span>
              <button className="home-row-play" onClick={() => play(track)} aria-label={`Play ${track.title}`}>▶</button>
            </div>
          ))}
        </div>

        <div>
          <HomeSectionTitle title="Made for you" action="Explore" onClick={onBrowse} />
          <div className="home-made-grid">
            {(madeForYou.length ? madeForYou : recent).map((track, index) => {
              const label = track.genre?.trim() || track.album?.trim() || ["All Time Favourites", "Romantic Hits", "Late Night Drive", "Punjabi Essentials"][index] || "Your Mix";
              return (
                <button className="home-mix-card" key={`${track.id}-${label}`} onClick={() => play(track)}>
                  <CoverArt trackId={track.id} hasCover={Boolean(track.cover_path)} alt="" />
                  <span>{label}</span>
                  <i>▶</i>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <HomeSectionTitle title="Trending Now" action="View all" onClick={onBrowse} />
      <div className="home-trending-row">
        {tracks.slice(0, 6).map((track, index) => (
          <button className="home-trend-card" key={track.id} onClick={() => play(track)}>
            <div className="home-trend-art"><CoverArt trackId={track.id} hasCover={Boolean(track.cover_path)} alt={`${track.title} cover`} /><span>{index + 1}</span><b>▶</b></div>
            <strong>{track.title}</strong>
            <small>{track.artist}</small>
          </button>
        ))}
      </div>

      <HomeSectionTitle title="Top Artists" action="See all" onClick={onBrowse} />
      <div className="home-artists-row">
        {artists.map(([artist, track]) => (
          <button className="home-artist" key={artist} onClick={() => play(track)}>
            <div className="home-artist-art"><CoverArt trackId={track.id} hasCover={Boolean(track.cover_path)} alt={`${artist} artwork`} /></div>
            <strong>{artist}</strong>
            <span>{tracks.filter((item) => item.artist === artist).length} song{tracks.filter((item) => item.artist === artist).length === 1 ? "" : "s"}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function HomeSectionTitle({ title, action, onClick }: { title: string; action: string; onClick: () => void }) {
  return (
    <div className="home-section-title">
      <h2>{title}</h2>
      <button onClick={onClick}>{action} <span>›</span></button>
    </div>
  );
}
