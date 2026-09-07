import { useEffect, useMemo, useRef, useState } from "react";
import { api, formatTime, type Track } from "../api";
import { useAuth } from "../auth";
import { usePlayer } from "../player";
import { CoverArt } from "../components/CoverArt";
import { useToast } from "../components/Toast";

export function ConsolePage({
  section = "home",
  initialTab = "catalog",
  onTabChange,
  onLyricsOpen,
}: {
  section?: "home" | "explore" | "albums" | "artists";
  initialTab?: "catalog" | "liked" | "queue";
  onTabChange?: (tab: "catalog" | "liked" | "queue") => void;
  onLyricsOpen?: () => void;
}) {
  const { playQueue, current, queue, removeTrack } = usePlayer();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [likes, setLikes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"catalog" | "liked" | "queue">(initialTab);
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<Track | null>(null);
  const [deleting, setDeleting] = useState<Track | null>(null);
  const [busy, setBusy] = useState(false);
  const [collection, setCollection] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const changeTab = (value: "catalog" | "liked" | "queue") => {
    setTab(value);
    onTabChange?.(value);
  };

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setCollection(null);
    setSearch("");
    if (section !== "home") setTab("catalog");
  }, [section]);

  const refresh = async () => {
    const result = await api.tracks();
    setTracks(result.tracks);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([api.tracks(), api.myLikes()])
      .then(([t, l]) => {
        if (cancelled) return;
        setTracks(t.tracks);
        setLikes(l.track_ids);
      })
      .catch((e) => toast(e instanceof Error ? e.message : "Failed to load catalog", "error"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!openMenu) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [openMenu]);

  const collections = useMemo(() => {
    if (section === "albums") {
      const map = new Map<string, Track[]>();
      tracks.forEach((t) => {
        const name = t.album?.trim() || "Singles";
        map.set(name, [...(map.get(name) || []), t]);
      });
      return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }
    if (section === "artists") {
      const map = new Map<string, Track[]>();
      tracks.forEach((t) => map.set(t.artist, [...(map.get(t.artist) || []), t]));
      return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }
    return [];
  }, [section, tracks]);

  const visible = useMemo(() => {
    const base = tab === "queue" ? queue : tab === "liked" ? tracks.filter((t) => likes.includes(t.id)) : tracks;
    const scoped = collection && section === "albums"
      ? base.filter((t) => (t.album?.trim() || "Singles") === collection)
      : collection && section === "artists"
        ? base.filter((t) => t.artist === collection)
        : base;
    const q = search.trim().toLowerCase();
    if (!q) return scoped;
    return scoped.filter((t) =>
      [t.title, t.artist, t.album ?? "", t.genre ?? ""].join(" ").toLowerCase().includes(q),
    );
  }, [section, tab, tracks, likes, queue, search, collection]);

  const toggleLike = async (id: string) => {
    const liked = likes.includes(id);
    setLikes((l) => (liked ? l.filter((x) => x !== id) : [...l, id]));
    try {
      if (liked) await api.unlike(id);
      else await api.like(id);
    } catch {
      setLikes((l) => (liked ? [...l, id] : l.filter((x) => x !== id)));
      toast("Could not update favourite", "error");
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deleteTrack(deleting.id);
      removeTrack(deleting.id);
      setTracks((items) => items.filter((item) => item.id !== deleting.id));
      setLikes((items) => items.filter((id) => id !== deleting.id));
      setDeleting(null);
      setOpenMenu(null);
      toast("Track removed from the crate");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (values: { title: string; artist: string; album: string; genre: string; lyrics: string }) => {
    if (!editing) return;
    setBusy(true);
    try {
      const { track } = await api.updateTrack(editing.id, {
        title: values.title.trim(),
        artist: values.artist.trim(),
        album: values.album.trim() || null,
        genre: values.genre.trim() || null,
        lyrics: values.lyrics,
      });
      setTracks((items) => items.map((item) => (item.id === track.id ? track : item)));
      setEditing(null);
      setOpenMenu(null);
      toast("Track details updated");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <div className="spread" style={{ marginTop: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, margin: 0 }}>
            {section === "explore" ? "Explore" : section === "albums" ? "Albums" : section === "artists" ? "Artists" : "The crate"}
          </h1>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
            {section === "albums" ? `${collections.length} album${collections.length === 1 ? "" : "s"}` : section === "artists" ? `${collections.length} artist${collections.length === 1 ? "" : "s"}` : `${tracks.length} track${tracks.length === 1 ? "" : "s"} on the shelf`}
          </p>
        </div>
        <input
          style={{ maxWidth: 280 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, artist, album…"
          aria-label="Search catalog"
        />
      </div>

      {section === "albums" || section === "artists" ? (
        <div className="collection-strip" aria-label={section === "albums" ? "Albums" : "Artists"}>
          {collections.length === 0 ? (
            <span className="muted">No {section} available yet.</span>
          ) : collections.map(([name, items]) => (
            <button
              key={name}
              type="button"
              className={`collection-chip ${collection === name ? "active" : ""}`}
              onClick={() => setCollection((value) => value === name ? null : name)}
            >
              <strong>{name}</strong>
              <span>{items.length} track{items.length === 1 ? "" : "s"}</span>
            </button>
          ))}
        </div>
      ) : null}

      {section === "albums" || section === "artists" ? (
        <div className="tabs">
          <button className={`tab ${!collection ? "active" : ""}`} onClick={() => setCollection(null)}>All</button>
          {collection && <span className="collection-current">{collection}</span>}
        </div>
      ) : (
        <div className="tabs">
        {(["catalog", "liked", "queue"] as const).map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => changeTab(t)}>
            {t === "catalog" ? "Catalog" : t === "liked" ? "Favourites" : "Queue"}
          </button>
        ))}
        </div>
      )}

      {current && (
        <button className="lyrics-open-button" onClick={onLyricsOpen} disabled={!onLyricsOpen}>
          <span>♫</span> Open lyrics for <strong>{current.title}</strong>
        </button>
      )}

      <div className="card stack" style={{ gap: 4 }}>
        {loading && <p className="muted">Warming up the console…</p>}
        {!loading && visible.length === 0 && (
          <p className="muted" style={{ padding: "18px 4px" }}>
            Nothing here yet. An admin can add songs from the Upload bay.
          </p>
        )}
        {visible.map((t, i) => (
          <div key={t.id} className={`track ${current?.id === t.id ? "playing" : ""}`}>
            <CoverArt trackId={t.id} hasCover={Boolean(t.cover_path)} alt={`${t.title} cover`} />
            <button
              className="track-main-button"
              onClick={() => playQueue(visible, i)}
              aria-label={`Play ${t.title}`}
            >
              <div className="track-title">{t.title}</div>
              <div className="track-sub">
                {t.artist}
                {t.album ? ` · ${t.album}` : ""}
                {t.genre ? ` · ${t.genre}` : ""}
              </div>
            </button>
            <button
              className="icon-btn"
              onClick={() => toggleLike(t.id)}
              aria-label={likes.includes(t.id) ? "Remove favourite" : "Add favourite"}
              style={{ color: likes.includes(t.id) ? "var(--amber)" : "var(--muted)" }}
            >
              ★
            </button>
            <span className="mono muted track-duration">{formatTime(t.duration_seconds)}</span>

            {isAdmin && (
              <div className="track-actions" ref={openMenu === t.id ? menuRef : undefined}>
                <button
                  className="icon-btn track-menu-button"
                  onClick={() => setOpenMenu((value) => (value === t.id ? null : t.id))}
                  aria-label={`Actions for ${t.title}`}
                  aria-expanded={openMenu === t.id}
                >
                  ⋮
                </button>

                {openMenu === t.id && (
                  <div className="track-menu" role="menu">
                    <button
                      type="button"
                      className="track-menu-item"
                      onClick={() => {
                        setEditing(t);
                        setOpenMenu(null);
                      }}
                    >
                      <span>✎</span> Edit song
                    </button>
                    <button
                      type="button"
                      className="track-menu-item danger"
                      onClick={() => {
                        setDeleting(t);
                        setOpenMenu(null);
                      }}
                    >
                      <span>⌫</span> Delete song
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <EditTrackModal
          track={editing}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}

      {deleting && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !busy && setDeleting(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-track-title" onMouseDown={(e) => e.stopPropagation()}>
            <span className="label">Remove pressing</span>
            <h2 id="delete-track-title">Delete song?</h2>
            <p className="muted">
              This will permanently remove <strong>{deleting.title}</strong> and its uploaded audio/cover files.
            </p>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setDeleting(null)} disabled={busy}>Cancel</button>
              <button className="btn danger-solid" onClick={() => void remove()} disabled={busy}>
                {busy ? "Deleting…" : "Delete song"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function EditTrackModal({
  track,
  busy,
  onCancel,
  onSave,
}: {
  track: Track;
  busy: boolean;
  onCancel: () => void;
  onSave: (values: { title: string; artist: string; album: string; genre: string; lyrics: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState(track.title);
  const [artist, setArtist] = useState(track.artist);
  const [album, setAlbum] = useState(track.album ?? "");
  const [genre, setGenre] = useState(track.genre ?? "");
  const [lyrics, setLyrics] = useState(track.lyrics ?? "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) return;
    await onSave({ title, artist, album, genre, lyrics });
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => !busy && onCancel()}>
      <form className="modal-card" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="edit-track-title" onMouseDown={(e) => e.stopPropagation()}>
        <span className="label">Track details</span>
        <h2 id="edit-track-title">Edit song</h2>
        <label>
          <span className="label">Title *</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          <span className="label">Artist *</span>
          <input value={artist} onChange={(e) => setArtist(e.target.value)} required />
        </label>
        <label>
          <span className="label">Album</span>
          <input value={album} onChange={(e) => setAlbum(e.target.value)} />
        </label>
        <label>
          <span className="label">Genre</span>
          <input value={genre} onChange={(e) => setGenre(e.target.value)} />
        </label>
        <label>
          <span className="label">Lyrics</span>
          <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Paste lyrics here…" rows={8} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="submit" className="btn" disabled={busy || !title.trim() || !artist.trim()}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
