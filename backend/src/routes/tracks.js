import { ah } from "../async.js";
import { Router } from "express";
import multer from "multer";
import { query } from "../db.js";
import { requireAdmin, requireAuth } from "../auth.js";
import { deleteFile, saveFile, signedUrlFor } from "../storage.js";

export const tracksRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 100) * 1024 * 1024 },
});

/** List catalog (any signed-in user). */
tracksRouter.get("/", requireAuth, ah(async (req, res) => {
  const search = (req.query.q || "").toString().trim();
  const params = [];
  let where = "";
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    where = `WHERE lower(title) LIKE $1 OR lower(artist) LIKE $1 OR lower(coalesce(album,'')) LIKE $1`;
  }
  const { rows } = await query(
    `SELECT id, title, artist, album, genre, duration_seconds, audio_path, cover_path, lyrics, created_at
       FROM tracks ${where} ORDER BY created_at DESC LIMIT 500`,
    params,
  );
  res.json({ tracks: rows });
}));

/** Time-limited streaming + cover URLs for one track. */
tracksRouter.get("/:id/urls", requireAuth, ah(async (req, res) => {
  const { rows } = await query("SELECT audio_path, cover_path FROM tracks WHERE id = $1", [
    req.params.id,
  ]);
  if (!rows[0]) return res.status(404).json({ error: "Track not found" });
  res.json({
    audio_url: await signedUrlFor(rows[0].audio_path),
    cover_url: await signedUrlFor(rows[0].cover_path),
  });
}));

/** Admin upload: multipart with `audio` (required) and `cover` (optional). */
tracksRouter.post(
  "/",
  requireAuth,
  requireAdmin,
  upload.fields([{ name: "audio", maxCount: 1 }, { name: "cover", maxCount: 1 }]),
  ah(async (req, res) => {
    const audio = req.files?.audio?.[0];
    if (!audio) return res.status(400).json({ error: "audio file required" });
    const cover = req.files?.cover?.[0];

    const audioPath = await saveFile("audio", audio);
    const coverPath = cover ? await saveFile("covers", cover) : null;

    const { title, artist, album, genre, lyrics, duration_seconds } = req.body || {};
    const { rows } = await query(
      `INSERT INTO tracks (title, artist, album, genre, lyrics, duration_seconds, audio_path, cover_path, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        title || audio.originalname.replace(/\.[^.]+$/, ""),
        artist || "Unknown Artist",
        album || null,
        genre || null,
        lyrics ? String(lyrics) : null,
        Math.round(Number(duration_seconds) || 0),
        audioPath,
        coverPath,
        req.user.sub,
      ],
    );
    res.status(201).json({ track: rows[0] });
  },
));

/** Admin edit: updates track metadata (files are unchanged). */
tracksRouter.patch("/:id", requireAuth, requireAdmin, ah(async (req, res) => {
  const { title, artist, album, genre, lyrics } = req.body || {};
  if (!String(title || "").trim() || !String(artist || "").trim()) {
    return res.status(400).json({ error: "title and artist are required" });
  }
  const { rows } = await query(
    `UPDATE tracks
        SET title = $1,
            artist = $2,
            album = $3,
            genre = $4,
            lyrics = $5
      WHERE id = $6
      RETURNING *`,
    [String(title).trim(), String(artist).trim(), album ? String(album).trim() : null, genre ? String(genre).trim() : null, lyrics ? String(lyrics) : null, req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "Track not found" });
  res.json({ track: rows[0] });
}));

/** Admin delete: removes DB row and stored files. */
tracksRouter.delete("/:id", requireAuth, requireAdmin, ah(async (req, res) => {
  const { rows } = await query(
    "DELETE FROM tracks WHERE id = $1 RETURNING audio_path, cover_path",
    [req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "Track not found" });
  await deleteFile(rows[0].audio_path);
  await deleteFile(rows[0].cover_path);
  res.json({ ok: true });
}));

/* --------------------------------- likes ---------------------------------- */

tracksRouter.get("/likes/mine", requireAuth, ah(async (req, res) => {
  const { rows } = await query("SELECT track_id FROM likes WHERE user_id = $1", [req.user.sub]);
  res.json({ track_ids: rows.map((r) => r.track_id) });
}));

tracksRouter.put("/:id/like", requireAuth, ah(async (req, res) => {
  await query(
    "INSERT INTO likes (user_id, track_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
    [req.user.sub, req.params.id],
  );
  res.json({ liked: true });
}));

tracksRouter.delete("/:id/like", requireAuth, ah(async (req, res) => {
  await query("DELETE FROM likes WHERE user_id = $1 AND track_id = $2", [
    req.user.sub,
    req.params.id,
  ]);
  res.json({ liked: false });
}));
