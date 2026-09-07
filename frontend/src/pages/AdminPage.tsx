import { useEffect, useRef, useState } from "react";
import { api, formatTime, type Track } from "../api";
import { useAuth } from "../auth";
import { usePlayer } from "../player";
import { CoverArt } from "../components/CoverArt";
import { useToast } from "../components/Toast";

function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.round(audio.duration) || 0);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    audio.src = url;
  });
}

export function AdminPage() {
  const { isAdmin } = useAuth();
  const { removeTrack } = usePlayer();
  const toast = useToast();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [genre, setGenre] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<Track | null>(null);
  const [deleting, setDeleting] = useState<Track | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const refresh = () =>
    api.tracks()
      .then((r) => setTracks(r.tracks))
      .catch(() => {});

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!openMenu) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [openMenu]);

  if (!isAdmin) {
    return (
      <p className="muted" style={{ marginTop: 60, textAlign: "center" }}>
        The upload bay is admin-only. Ask an admin to grant you access.
      </p>
    );
  }

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) return toast("Choose an audio file first", "error");
    setBusy(true);
    try {
      const form = new FormData();
      form.append("audio", audioFile);
      if (coverFile) form.append("cover", coverFile);
      form.append("title", title || audioFile.name.replace(/\.[^.]+$/, ""));
      form.append("artist", artist || "Unknown Artist");
      form.append("album", album);
      form.append("genre", genre);
      form.append("lyrics", lyrics);
      form.append("duration_seconds", String(await readDuration(audioFile)));

      await api.uploadTrack(form);
      toast("Track pressed into the crate");
      setTitle(""); setArtist(""); setAlbum(""); setGenre(""); setLyrics("");
      setAudioFile(null); setCoverFile(null);
      (e.target as HTMLFormElement).reset();
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deleteTrack(deleting.id);
      removeTrack(deleting.id);
      setTracks((items) => items.filter((item) => item.id !== deleting.id));
      setDeleting(null);
      toast("Track removed");
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
      setTracks((items) => items.map((item) => item.id === track.id ? track : item));
      setEditing(null);
      toast("Track details updated");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={{ marginTop: 24 }}>
      <h1 style={{ fontSize: 32, margin: "0 0 18px" }}>Upload bay</h1>

      <div className="grid-2">
        <form className="card stack" onSubmit={upload}>
          <span className="label">New pressing</span>
          <label>
            <span className="label">Audio file *</span>
            <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} required />
          </label>
          <label>
            <span className="label">Cover image</span>
            <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
          </label>
          <label>
            <span className="label">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Golden Hour" />
          </label>
          <label>
            <span className="label">Artist</span>
            <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Nova Reyes" />
          </label>
          <label>
            <span className="label">Album</span>
            <input value={album} onChange={(e) => setAlbum(e.target.value)} placeholder="Console" />
          </label>
          <label>
            <span className="label">Genre</span>
            <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Electronic" />
          </label>
          <label>
            <span className="label">Lyrics</span>
            <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Paste lyrics here…" rows={8} />
          </label>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Uploading…" : "Press to crate"}
          </button>
        </form>

        <div className="card stack" style={{ gap: 4 }}>
          <span className="label">Crate · {tracks.length}</span>
          {tracks.length === 0 && <p className="muted">No tracks yet.</p>}
          {tracks.map((t) => (
            <div key={t.id} className="track">
              <CoverArt trackId={t.id} hasCover={Boolean(t.cover_path)} alt={`${t.title} cover`} />
              <div className="track-info">
                <div className="track-title">{t.title}</div>
                <div className="track-sub">{t.artist}{t.album ? ` · ${t.album}` : ""}</div>
              </div>
              <span className="mono muted track-duration">{formatTime(t.duration_seconds)}</span>
              <div className="track-actions" ref={openMenu === t.id ? menuRef : undefined}>
                <button
                  className="icon-btn track-menu-button"
                  onClick={() => setOpenMenu((value) => value === t.id ? null : t.id)}
                  aria-label={`Actions for ${t.title}`}
                  aria-expanded={openMenu === t.id}
                >
                  ⋮
                </button>
                {openMenu === t.id && (
                  <div className="track-menu" role="menu">
                    <button type="button" className="track-menu-item" onClick={() => { setEditing(t); setOpenMenu(null); }}>
                      <span>✎</span> Edit song
                    </button>
                    <button type="button" className="track-menu-item danger" onClick={() => { setDeleting(t); setOpenMenu(null); }}>
                      <span>⌫</span> Delete song
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing && <EditTrackModal track={editing} busy={busy} onCancel={() => setEditing(null)} onSave={saveEdit} />}

      {deleting && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !busy && setDeleting(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <span className="label">Remove pressing</span>
            <h2>Delete song?</h2>
            <p className="muted">This will permanently remove <strong>{deleting.title}</strong> and its uploaded audio/cover files.</p>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setDeleting(null)} disabled={busy}>Cancel</button>
              <button className="btn danger-solid" onClick={() => void remove()} disabled={busy}>{busy ? "Deleting…" : "Delete song"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function EditTrackModal({ track, busy, onCancel, onSave }: {
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
      <form className="modal-card" onSubmit={submit} role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <span className="label">Track details</span>
        <h2>Edit song</h2>
        <label><span className="label">Title *</span><input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
        <label><span className="label">Artist *</span><input value={artist} onChange={(e) => setArtist(e.target.value)} required /></label>
        <label><span className="label">Album</span><input value={album} onChange={(e) => setAlbum(e.target.value)} /></label>
        <label><span className="label">Genre</span><input value={genre} onChange={(e) => setGenre(e.target.value)} /></label>
        <label><span className="label">Lyrics</span><textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Paste lyrics here…" rows={8} /></label>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="submit" className="btn" disabled={busy || !title.trim() || !artist.trim()}>{busy ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    </div>
  );
}
