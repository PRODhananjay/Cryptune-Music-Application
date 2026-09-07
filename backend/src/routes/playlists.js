import { ah } from "../async.js";
import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../auth.js";

export const playlistsRouter = Router();

playlistsRouter.use(requireAuth);

/** List playlists owned by the signed-in user, with their tracks. */
playlistsRouter.get("/", ah(async (req, res) => {
  const { rows } = await query(
    `SELECT p.id, p.name, p.description, p.created_at, p.updated_at,
            COALESCE((
              SELECT json_agg(json_build_object(
                'id', t.id, 'title', t.title, 'artist', t.artist, 'album', t.album,
                'genre', t.genre, 'duration_seconds', t.duration_seconds,
                'audio_path', t.audio_path, 'cover_path', t.cover_path,
                'lyrics', t.lyrics, 'created_at', t.created_at
              ) ORDER BY pt.position, pt.added_at)
              FROM playlist_tracks pt JOIN tracks t ON t.id = pt.track_id
              WHERE pt.playlist_id = p.id
            ), '[]'::json) AS tracks
       FROM playlists p
      WHERE p.user_id = $1
      ORDER BY p.updated_at DESC, p.created_at DESC`,
    [req.user.sub],
  );
  res.json({ playlists: rows });
}));

/** Create a playlist. */
playlistsRouter.post("/", ah(async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const description = req.body?.description ? String(req.body.description).trim() : null;
  if (!name) return res.status(400).json({ error: "Playlist name is required" });
  if (name.length > 80) return res.status(400).json({ error: "Playlist name is too long" });

  const { rows } = await query(
    `INSERT INTO playlists (user_id, name, description)
     VALUES ($1,$2,$3)
     RETURNING id, name, description, created_at, updated_at`,
    [req.user.sub, name, description],
  );
  res.status(201).json({ playlist: { ...rows[0], tracks: [] } });
}));

/** Rename/edit a playlist owned by the user. */
playlistsRouter.patch("/:id", ah(async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const description = req.body?.description ? String(req.body.description).trim() : null;
  if (!name) return res.status(400).json({ error: "Playlist name is required" });

  const { rows } = await query(
    `UPDATE playlists
        SET name = $1, description = $2, updated_at = now()
      WHERE id = $3 AND user_id = $4
      RETURNING id, name, description, created_at, updated_at`,
    [name, description, req.params.id, req.user.sub],
  );
  if (!rows[0]) return res.status(404).json({ error: "Playlist not found" });
  res.json({ playlist: rows[0] });
}));

/** Delete a playlist owned by the user. */
playlistsRouter.delete("/:id", ah(async (req, res) => {
  const result = await query(
    "DELETE FROM playlists WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.sub],
  );
  if (!result.rowCount) return res.status(404).json({ error: "Playlist not found" });
  res.json({ ok: true });
}));

/** Add a track to a playlist. */
playlistsRouter.post("/:id/tracks", ah(async (req, res) => {
  const trackId = String(req.body?.track_id || "").trim();
  if (!trackId) return res.status(400).json({ error: "track_id is required" });

  const owner = await query("SELECT id FROM playlists WHERE id = $1 AND user_id = $2", [req.params.id, req.user.sub]);
  if (!owner.rows[0]) return res.status(404).json({ error: "Playlist not found" });

  const track = await query("SELECT id FROM tracks WHERE id = $1", [trackId]);
  if (!track.rows[0]) return res.status(404).json({ error: "Track not found" });

  await query(
    `INSERT INTO playlist_tracks (playlist_id, track_id, position)
     VALUES ($1, $2, COALESCE((SELECT MAX(position) + 1 FROM playlist_tracks WHERE playlist_id = $1), 0))
     ON CONFLICT (playlist_id, track_id) DO NOTHING`,
    [req.params.id, trackId],
  );
  await query("UPDATE playlists SET updated_at = now() WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
}));

/** Remove a track from a playlist. */
playlistsRouter.delete("/:id/tracks/:trackId", ah(async (req, res) => {
  const owner = await query("SELECT id FROM playlists WHERE id = $1 AND user_id = $2", [req.params.id, req.user.sub]);
  if (!owner.rows[0]) return res.status(404).json({ error: "Playlist not found" });

  await query(
    "DELETE FROM playlist_tracks WHERE playlist_id = $1 AND track_id = $2",
    [req.params.id, req.params.trackId],
  );
  await query("UPDATE playlists SET updated_at = now() WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
}));
