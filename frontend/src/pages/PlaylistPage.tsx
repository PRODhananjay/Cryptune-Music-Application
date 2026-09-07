import { useEffect, useMemo, useState } from "react";
import { api, type Playlist, type Track } from "../api";
import { usePlayer } from "../player";
import { CoverArt } from "../components/CoverArt";
import { useToast } from "../components/Toast";

export function PlaylistPage() {
  const { playQueue } = usePlayer();
  const toast = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");

  const selected =
    playlists.find((p) => p.id === selectedId) || playlists[0] || null;

  const availableTracks = useMemo(() => {
    if (!selected) return [];
    const ids = new Set(selected.tracks.map((t) => t.id));
    const q = search.trim().toLowerCase();

    return tracks.filter(
      (t) =>
        !ids.has(t.id) &&
        (!q ||
          `${t.title} ${t.artist} ${t.album || ""}`
            .toLowerCase()
            .includes(q)),
    );
  }, [selected, tracks, search]);

  const refresh = async () => {
    const result = await api.playlists();
    setPlaylists(result.playlists);
    setSelectedId((id) =>
      id && result.playlists.some((p) => p.id === id)
        ? id
        : result.playlists[0]?.id || null,
    );
  };

  useEffect(() => {
    let cancelled = false;

    Promise.all([api.playlists(), api.tracks()])
      .then(([p, t]) => {
        if (cancelled) return;
        setPlaylists(p.playlists);
        setTracks(t.tracks);
        setSelectedId(p.playlists[0]?.id || null);
      })
      .catch((e) =>
        toast(
          e instanceof Error ? e.message : "Failed to load playlists",
          "error",
        ),
      )
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const startCreate = () => {
    setName("");
    setDescription("");
    setCreating(true);
  };

  const startEdit = () => {
    if (!selected) return;
    setName(selected.name);
    setDescription(selected.description || "");
    setEditing(true);
  };

  const savePlaylist = async () => {
    if (!name.trim()) return toast("Enter a playlist name", "error");

    try {
      if (creating) {
        const { playlist } = await api.createPlaylist({
          name: name.trim(),
          description: description.trim() || null,
        });

        setPlaylists((items) => [playlist, ...items]);
        setSelectedId(playlist.id);
        toast("Playlist created");
      } else if (editing && selected) {
        const { playlist } = await api.updatePlaylist(selected.id, {
          name: name.trim(),
          description: description.trim() || null,
        });

        setPlaylists((items) =>
          items.map((item) =>
            item.id === playlist.id
              ? { ...item, ...playlist, tracks: item.tracks }
              : item,
          ),
        );

        toast("Playlist updated");
      }

      setCreating(false);
      setEditing(false);
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Could not save playlist",
        "error",
      );
    }
  };

  const removePlaylist = async () => {
    if (!selected || !window.confirm(`Delete playlist “${selected.name}”?`))
      return;

    try {
      await api.deletePlaylist(selected.id);
      await refresh();
      toast("Playlist deleted");
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Could not delete playlist",
        "error",
      );
    }
  };

  const addTrack = async (track: Track) => {
    if (!selected) return;

    try {
      await api.addToPlaylist(selected.id, track.id);
      await refresh();
      toast(`Added ${track.title}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not add song", "error");
    }
  };

  const removeTrack = async (track: Track) => {
    if (!selected) return;

    try {
      await api.removeFromPlaylist(selected.id, track.id);
      await refresh();
      toast("Song removed");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not remove song", "error");
    }
  };

  return (
    <section className="playlist-page">
      <style>{`
        /* =========================================================
           SONGCRATE — PLAYLIST PAGE ONLY
           Everything below is scoped to .playlist-page.
           No global styles.css changes are required.
           ========================================================= */

        .playlist-page {
          --pl-orange: #ff8a00;
          --pl-orange-2: #ffad32;
          --pl-bg: #090a0e;
          --pl-panel: #111319;
          --pl-panel-2: #171920;
          --pl-border: rgba(255,255,255,.085);
          --pl-text: #f5f5f7;
          --pl-muted: #9296a3;
          --pl-soft: #666b78;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          color: var(--pl-text);
          padding-bottom: 120px;
        }

        .playlist-page *,
        .playlist-page *::before,
        .playlist-page *::after {
          box-sizing: border-box;
        }

        .playlist-page button,
        .playlist-page input,
        .playlist-page textarea {
          font: inherit;
        }

        .playlist-page button {
          -webkit-tap-highlight-color: transparent;
        }

        .playlist-page-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .playlist-page-head h1 {
          margin: 7px 0 7px;
          color: #fff;
          font-size: clamp(32px, 4vw, 48px);
          line-height: 1;
          letter-spacing: -1.5px;
          font-weight: 760;
        }

        .playlist-page-head p {
          margin: 0;
          color: #a7aab5;
          font-size: 14px;
        }

        .playlist-page .home-eyebrow {
          display: inline-block;
          color: var(--pl-orange);
          font-size: 10px;
          line-height: 1;
          letter-spacing: 1.5px;
          font-weight: 800;
        }

        .playlist-page .pl-btn {
          border: 0;
          border-radius: 11px;
          min-height: 42px;
          padding: 0 17px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          color: #171006;
          background: linear-gradient(135deg, var(--pl-orange-2), var(--pl-orange));
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          box-shadow: 0 9px 26px rgba(255,138,0,.17);
          transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
          white-space: nowrap;
        }

        .playlist-page .pl-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.05);
          box-shadow: 0 12px 30px rgba(255,138,0,.25);
        }

        .playlist-page .pl-btn:active {
          transform: translateY(0);
        }

        .playlist-page .pl-btn:disabled {
          opacity: .4;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .playlist-page .pl-btn.small {
          min-height: 34px;
          padding: 0 12px;
          border-radius: 9px;
          font-size: 12px;
        }

        .playlist-page .pl-secondary,
        .playlist-page .pl-danger {
          min-height: 40px;
          padding: 0 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background .18s ease, border-color .18s ease, color .18s ease;
        }

        .playlist-page .pl-secondary {
          color: #dfe1e7;
          background: rgba(255,255,255,.045);
          border: 1px solid var(--pl-border);
        }

        .playlist-page .pl-secondary:hover {
          background: rgba(255,255,255,.085);
          border-color: rgba(255,255,255,.14);
        }

        .playlist-page .pl-danger {
          color: #ffb0a9;
          background: rgba(255,76,61,.055);
          border: 1px solid rgba(255,92,77,.16);
        }

        .playlist-page .pl-danger:hover {
          color: #ffd0cb;
          background: rgba(255,76,61,.11);
          border-color: rgba(255,92,77,.28);
        }

        .playlist-page .playlist-empty {
          min-height: 260px;
          border: 1px solid var(--pl-border);
          border-radius: 18px;
          background:
            radial-gradient(circle at 50% 0%, rgba(255,138,0,.10), transparent 38%),
            var(--pl-panel);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 34px 20px;
        }

        .playlist-page .playlist-empty-icon {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          margin-bottom: 14px;
          border-radius: 16px;
          color: var(--pl-orange);
          background: rgba(255,138,0,.10);
          border: 1px solid rgba(255,138,0,.18);
          font-size: 26px;
        }

        .playlist-page .playlist-empty h2 {
          margin: 0 0 7px;
          color: #fff;
          font-size: 21px;
        }

        .playlist-page .playlist-empty p {
          max-width: 480px;
          margin: 0 0 18px;
          color: var(--pl-muted);
          font-size: 13px;
          line-height: 1.55;
        }

        .playlist-page .playlist-cards-row {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
          gap: 13px;
          width: 100%;
          margin-bottom: 18px;
        }

        .playlist-page .playlist-card {
          min-width: 0;
          padding: 10px;
          border: 1px solid transparent;
          border-radius: 14px;
          background: transparent;
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition: background .18s ease, border-color .18s ease, transform .18s ease;
        }

        .playlist-page .playlist-card:hover {
          background: rgba(255,255,255,.035);
          border-color: rgba(255,255,255,.07);
          transform: translateY(-2px);
        }

        .playlist-page .playlist-card.selected {
          background: linear-gradient(180deg, rgba(255,138,0,.105), rgba(255,138,0,.035));
          border-color: rgba(255,138,0,.27);
        }

        .playlist-page .playlist-card-art {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          overflow: hidden;
          margin-bottom: 10px;
          border-radius: 11px;
          display: grid;
          place-items: center;
          color: #7e828d;
          background:
            radial-gradient(circle at 35% 25%, rgba(255,173,50,.25), transparent 28%),
            linear-gradient(145deg, #242832, #101218);
          box-shadow: 0 12px 28px rgba(0,0,0,.22);
        }

        .playlist-page .playlist-card-art img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .playlist-page .playlist-card-art > b {
          position: absolute;
          right: 8px;
          bottom: 8px;
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #171006;
          background: var(--pl-orange);
          font-size: 12px;
          opacity: 0;
          transform: translateY(5px);
          box-shadow: 0 8px 18px rgba(0,0,0,.35);
          transition: opacity .18s ease, transform .18s ease;
        }

        .playlist-page .playlist-card:hover .playlist-card-art > b,
        .playlist-page .playlist-card.selected .playlist-card-art > b {
          opacity: 1;
          transform: translateY(0);
        }

        .playlist-page .playlist-card > strong {
          display: block;
          overflow: hidden;
          color: #f4f4f6;
          font-size: 13px;
          line-height: 1.3;
          font-weight: 720;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .playlist-page .playlist-card > small {
          display: block;
          margin-top: 4px;
          color: #777c88;
          font-size: 11px;
        }

        .playlist-page .playlist-card.create-card {
          min-height: 205px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border: 1px dashed rgba(255,255,255,.12);
          background: rgba(255,255,255,.018);
        }

        .playlist-page .playlist-card.create-card:hover {
          border-color: rgba(255,138,0,.3);
          background: rgba(255,138,0,.045);
        }

        .playlist-page .playlist-card.create-card > span {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          margin-bottom: 11px;
          border-radius: 14px;
          color: var(--pl-orange);
          background: rgba(255,138,0,.10);
          border: 1px solid rgba(255,138,0,.15);
          font-size: 24px;
        }

        .playlist-page .playlist-card.create-card > strong {
          white-space: normal;
        }

        .playlist-page .playlist-detail {
          width: 100%;
          overflow: hidden;
          border: 1px solid var(--pl-border);
          border-radius: 18px;
          background:
            radial-gradient(circle at 90% 0%, rgba(255,138,0,.055), transparent 34%),
            linear-gradient(180deg, #12141a, #0f1116);
          box-shadow: 0 18px 55px rgba(0,0,0,.16);
        }

        .playlist-page .playlist-detail-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 22px 22px 18px;
          border-bottom: 1px solid rgba(255,255,255,.065);
        }

        .playlist-page .playlist-detail-head h2 {
          margin: 8px 0 5px;
          color: #fff;
          font-size: clamp(22px, 3vw, 29px);
          letter-spacing: -.5px;
        }

        .playlist-page .playlist-detail-head p {
          margin: 0;
          color: #858995;
          font-size: 12px;
        }

        .playlist-page .playlist-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 7px;
          flex-wrap: wrap;
        }

        .playlist-page .playlist-song-list {
          padding: 8px 10px;
        }

        .playlist-page .playlist-song-row {
          min-width: 0;
          display: grid;
          grid-template-columns: 28px 48px minmax(0,1fr) 52px 34px;
          align-items: center;
          gap: 10px;
          min-height: 64px;
          padding: 7px 9px;
          border-radius: 11px;
          transition: background .16s ease;
        }

        .playlist-page .playlist-song-row:hover {
          background: rgba(255,255,255,.04);
        }

        .playlist-page .playlist-song-row > img {
          width: 48px;
          height: 48px;
          object-fit: cover;
          border-radius: 8px;
          display: block;
          background: #1b1e26;
        }

        .playlist-page .playlist-number {
          color: #5e6370;
          text-align: center;
          font-size: 11px;
          font-variant-numeric: tabular-nums;
        }

        .playlist-page .playlist-song-info {
          min-width: 0;
          padding: 4px 0;
          border: 0;
          background: transparent;
          color: #fff;
          text-align: left;
          cursor: pointer;
        }

        .playlist-page .playlist-song-info strong {
          display: block;
          overflow: hidden;
          color: #e9e9ec;
          font-size: 13px;
          font-weight: 650;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .playlist-page .playlist-song-info span {
          display: block;
          overflow: hidden;
          margin-top: 4px;
          color: #777c88;
          font-size: 11px;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .playlist-page .playlist-song-info:hover strong {
          color: var(--pl-orange-2);
        }

        .playlist-page .pl-duration {
          color: #686d79;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 10px;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .playlist-page .playlist-remove {
          width: 30px;
          height: 30px;
          padding: 0;
          display: grid;
          place-items: center;
          border: 1px solid transparent;
          border-radius: 8px;
          background: transparent;
          color: #676c77;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          transition: color .16s ease, background .16s ease, border-color .16s ease;
        }

        .playlist-page .playlist-remove:hover {
          color: #ff9f96;
          background: rgba(255,80,67,.08);
          border-color: rgba(255,80,67,.15);
        }

        .playlist-page .playlist-no-songs {
          padding: 34px 20px;
          color: #747985;
          text-align: center;
          font-size: 13px;
        }

        .playlist-page .playlist-add-btn {
          width: calc(100% - 20px);
          min-height: 43px;
          margin: 2px 10px 12px;
          border: 1px dashed rgba(255,138,0,.22);
          border-radius: 10px;
          background: rgba(255,138,0,.035);
          color: #e9a044;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background .18s ease, border-color .18s ease;
        }

        .playlist-page .playlist-add-btn:hover {
          background: rgba(255,138,0,.075);
          border-color: rgba(255,138,0,.38);
        }

        /* Modal */
        .playlist-page .pl-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(0,0,0,.68);
          backdrop-filter: blur(10px);
        }

        .playlist-page .pl-modal-card {
          width: min(520px, 100%);
          max-height: min(720px, calc(100vh - 40px));
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 18px;
          background: #111319;
          box-shadow: 0 30px 90px rgba(0,0,0,.55);
          animation: playlistModalIn .18s ease-out;
        }

        @keyframes playlistModalIn {
          from { opacity: 0; transform: translateY(8px) scale(.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .playlist-page .pl-modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 19px 20px;
          border-bottom: 1px solid rgba(255,255,255,.07);
        }

        .playlist-page .pl-modal-head h2 {
          margin: 7px 0 0;
          color: #fff;
          font-size: 20px;
        }

        .playlist-page .pl-icon-btn {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 9px;
          background: rgba(255,255,255,.035);
          color: #a8abb5;
          font-size: 20px;
          cursor: pointer;
        }

        .playlist-page .pl-icon-btn:hover {
          color: #fff;
          background: rgba(255,255,255,.08);
        }

        .playlist-page .pl-form {
          padding: 20px;
        }

        .playlist-page .pl-form label {
          display: block;
          margin-bottom: 15px;
          color: #bfc2ca;
          font-size: 11px;
          font-weight: 700;
        }

        .playlist-page .pl-form input,
        .playlist-page .pl-form textarea,
        .playlist-page .playlist-search {
          width: 100%;
          margin-top: 7px;
          border: 1px solid rgba(255,255,255,.09);
          outline: 0;
          border-radius: 10px;
          background: #0c0e13;
          color: #f3f3f5;
          padding: 11px 12px;
          font-size: 13px;
          transition: border-color .18s ease, box-shadow .18s ease;
        }

        .playlist-page .pl-form textarea {
          resize: vertical;
          min-height: 88px;
          line-height: 1.5;
        }

        .playlist-page .pl-form input:focus,
        .playlist-page .pl-form textarea:focus,
        .playlist-page .playlist-search:focus {
          border-color: rgba(255,138,0,.5);
          box-shadow: 0 0 0 3px rgba(255,138,0,.08);
        }

        .playlist-page .pl-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding-top: 4px;
        }

        .playlist-page .pl-add-modal {
          width: min(650px, 100%);
        }

        .playlist-page .playlist-search {
          display: block;
          margin: 14px 20px 8px;
          width: calc(100% - 40px);
        }

        .playlist-page .playlist-picker {
          max-height: 430px;
          overflow: auto;
          padding: 6px 12px 14px;
          scrollbar-width: thin;
        }

        .playlist-page .playlist-picker-row {
          display: grid;
          grid-template-columns: 42px minmax(0,1fr) auto;
          align-items: center;
          gap: 10px;
          padding: 7px 8px;
          border-radius: 10px;
        }

        .playlist-page .playlist-picker-row:hover {
          background: rgba(255,255,255,.04);
        }

        .playlist-page .playlist-picker-row > img {
          width: 42px;
          height: 42px;
          object-fit: cover;
          border-radius: 7px;
          background: #1b1e26;
        }

        .playlist-page .playlist-picker-row > div {
          min-width: 0;
        }

        .playlist-page .playlist-picker-row strong,
        .playlist-page .playlist-picker-row span {
          display: block;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .playlist-page .playlist-picker-row strong {
          color: #e8e8eb;
          font-size: 12px;
        }

        .playlist-page .playlist-picker-row span {
          margin-top: 3px;
          color: #737884;
          font-size: 10px;
        }

        .playlist-page .pl-muted {
          color: #707580;
        }

        @media (max-width: 800px) {
          .playlist-page-head {
            align-items: flex-start;
            flex-direction: column;
            gap: 15px;
          }

          .playlist-page-head .pl-btn {
            width: 100%;
          }

          .playlist-page .playlist-cards-row {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }

          .playlist-page .playlist-detail-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .playlist-page .playlist-actions {
            width: 100%;
            justify-content: flex-start;
          }
        }

        @media (max-width: 560px) {
          .playlist-page {
            padding-bottom: 145px;
          }

          .playlist-page-head h1 {
            font-size: 32px;
          }

          .playlist-page .playlist-cards-row {
            grid-template-columns: repeat(2, minmax(0,1fr));
            gap: 8px;
          }

          .playlist-page .playlist-card {
            padding: 7px;
          }

          .playlist-page .playlist-card.create-card {
            min-height: 160px;
          }

          .playlist-page .playlist-detail-head {
            padding: 17px 15px 15px;
          }

          .playlist-page .playlist-song-list {
            padding: 5px;
          }

          .playlist-page .playlist-song-row {
            grid-template-columns: 20px 42px minmax(0,1fr) 28px;
            gap: 7px;
            min-height: 58px;
            padding: 6px 4px;
          }

          .playlist-page .playlist-song-row > img {
            width: 42px;
            height: 42px;
          }

          .playlist-page .pl-duration {
            display: none;
          }

          .playlist-page .playlist-remove {
            width: 28px;
            height: 28px;
          }

          .playlist-page .playlist-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            width: 100%;
          }

          .playlist-page .playlist-actions .pl-btn {
            grid-column: 1 / -1;
            width: 100%;
          }

          .playlist-page .playlist-actions .pl-secondary,
          .playlist-page .playlist-actions .pl-danger {
            width: 100%;
          }

          .playlist-page .pl-modal-backdrop {
            align-items: end;
            padding: 8px;
          }

          .playlist-page .pl-modal-card {
            max-height: calc(100vh - 16px);
            border-radius: 18px 18px 12px 12px;
          }

          .playlist-page .playlist-picker {
            max-height: 50vh;
          }
        }

        @media (max-width: 390px) {
          .playlist-page .playlist-cards-row {
            grid-template-columns: 1fr 1fr;
          }

          .playlist-page .playlist-card > strong {
            font-size: 12px;
          }

          .playlist-page .playlist-song-info strong {
            font-size: 12px;
          }

          .playlist-page .playlist-song-info span {
            font-size: 10px;
          }
        }
      `}</style>

      <div className="playlist-page-head">
        <div>
          <span className="home-eyebrow">YOUR LIBRARY</span>
          <h1>Playlists</h1>
          <p>Create, edit and organize your own music collections.</p>
        </div>

        <button className="pl-btn" onClick={startCreate}>
          ＋ Create Playlist
        </button>
      </div>

      {loading ? (
        <div className="playlist-empty">
          <div className="playlist-empty-icon">♫</div>
          <h2>Loading playlists…</h2>
          <p>Getting your personal music collections ready.</p>
        </div>
      ) : null}

      {!loading && !playlists.length ? (
        <div className="playlist-empty">
          <div className="playlist-empty-icon">♫</div>
          <h2>Create your first playlist</h2>
          <p>
            Build a personal collection and add any songs from your SONGCRATE
            library.
          </p>
          <button className="pl-btn" onClick={startCreate}>
            ＋ Create Playlist
          </button>
        </div>
      ) : null}

      {playlists.length > 0 && (
        <>
          <div className="playlist-cards-row">
            {playlists.map((playlist) => {
              const cover = playlist.tracks[0];

              return (
                <button
                  key={playlist.id}
                  type="button"
                  className={`playlist-card ${
                    selected?.id === playlist.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedId(playlist.id)}
                >
                  <div className="playlist-card-art">
                    {cover ? (
                      <CoverArt
                        trackId={cover.id}
                        hasCover={Boolean(cover.cover_path)}
                        alt=""
                      />
                    ) : (
                      <span>♫</span>
                    )}
                    <b>▶</b>
                  </div>
                  <strong>{playlist.name}</strong>
                  <small>
                    {playlist.tracks.length} song
                    {playlist.tracks.length === 1 ? "" : "s"}
                  </small>
                </button>
              );
            })}

            <button
              type="button"
              className="playlist-card create-card"
              onClick={startCreate}
            >
              <span>＋</span>
              <strong>Create Playlist</strong>
            </button>
          </div>

          {selected && (
            <div className="playlist-detail">
              <div className="playlist-detail-head">
                <div>
                  <span className="home-eyebrow">PLAYLIST</span>
                  <h2>{selected.name}</h2>
                  <p>
                    {selected.description || "Your personal collection"} ·{" "}
                    {selected.tracks.length} songs
                  </p>
                </div>

                <div className="playlist-actions">
                  <button className="pl-secondary" onClick={startEdit}>
                    Edit
                  </button>

                  <button
                    className="pl-danger"
                    onClick={() => void removePlaylist()}
                  >
                    Delete
                  </button>

                  <button
                    className="pl-btn"
                    disabled={!selected.tracks.length}
                    onClick={() => playQueue(selected.tracks, 0)}
                  >
                    ▶ Play All
                  </button>
                </div>
              </div>

              <div className="playlist-song-list">
                {selected.tracks.length ? (
                  selected.tracks.map((track, index) => (
                    <div className="playlist-song-row" key={track.id}>
                      <span className="playlist-number">{index + 1}</span>

                      <CoverArt
                        trackId={track.id}
                        hasCover={Boolean(track.cover_path)}
                        alt={`${track.title} cover`}
                      />

                      <button
                        type="button"
                        className="playlist-song-info"
                        onClick={() => playQueue(selected.tracks, index)}
                      >
                        <strong>{track.title}</strong>
                        <span>
                          {track.artist}
                          {track.album ? ` · ${track.album}` : ""}
                        </span>
                      </button>

                      <span className="pl-duration">
                        {Math.floor(track.duration_seconds / 60)}:
                        {String(track.duration_seconds % 60).padStart(2, "0")}
                      </span>

                      <button
                        type="button"
                        className="playlist-remove"
                        onClick={() => void removeTrack(track)}
                        aria-label={`Remove ${track.title}`}
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="playlist-no-songs">
                    This playlist is empty. Add songs from your library.
                  </div>
                )}
              </div>

              <button
                type="button"
                className="playlist-add-btn"
                onClick={() => {
                  setSearch("");
                  setAdding(true);
                }}
              >
                ＋ Add songs
              </button>
            </div>
          )}
        </>
      )}

      {(creating || editing) && (
        <div
          className="pl-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setCreating(false);
              setEditing(false);
            }
          }}
        >
          <div className="pl-modal-card">
            <div className="pl-modal-head">
              <div>
                <span className="home-eyebrow">PLAYLIST</span>
                <h2>{creating ? "Create playlist" : "Edit playlist"}</h2>
              </div>

              <button
                type="button"
                className="pl-icon-btn"
                onClick={() => {
                  setCreating(false);
                  setEditing(false);
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="pl-form">
              <label>
                Playlist name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  autoFocus
                  placeholder="My playlist"
                />
              </label>

              <label>
                Description <span className="pl-muted">(optional)</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="A short description..."
                />
              </label>

              <div className="pl-modal-actions">
                <button
                  type="button"
                  className="pl-secondary"
                  onClick={() => {
                    setCreating(false);
                    setEditing(false);
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="pl-btn"
                  onClick={() => void savePlaylist()}
                >
                  {creating ? "Create" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {adding && selected && (
        <div
          className="pl-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAdding(false);
          }}
        >
          <div className="pl-modal-card pl-add-modal">
            <div className="pl-modal-head">
              <div>
                <span className="home-eyebrow">
                  ADD TO {selected.name.toUpperCase()}
                </span>
                <h2>Choose songs</h2>
              </div>

              <button
                type="button"
                className="pl-icon-btn"
                onClick={() => setAdding(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <input
              className="playlist-search"
              placeholder="Search songs, artists, albums…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />

            <div className="playlist-picker">
              {availableTracks.length ? (
                availableTracks.map((track) => (
                  <div className="playlist-picker-row" key={track.id}>
                    <CoverArt
                      trackId={track.id}
                      hasCover={Boolean(track.cover_path)}
                      alt=""
                    />

                    <div>
                      <strong>{track.title}</strong>
                      <span>
                        {track.artist}
                        {track.album ? ` · ${track.album}` : ""}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="pl-btn small"
                      onClick={() => void addTrack(track)}
                    >
                      ＋ Add
                    </button>
                  </div>
                ))
              ) : (
                <p className="pl-muted" style={{ padding: "20px 8px" }}>
                  No songs available to add.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
