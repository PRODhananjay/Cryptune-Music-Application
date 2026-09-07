import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { tracksRouter } from "./routes/tracks.js";
import { isLocal, streamLocal } from "./storage.js";
import { pool } from "./db.js";
import { playlistsRouter } from "./routes/playlists.js";

const app = express();

app.use(
  cors({
    origin: (process.env.CORS_ORIGINS || "*").split(",").map((s) => s.trim()),
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "up" });
  } catch {
    res.status(503).json({ status: "degraded", db: "down" });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/tracks", tracksRouter);
app.use("/api/playlists", playlistsRouter);

// Local storage streaming (audio/cover) with HTTP range support.
if (isLocal) {
  app.get("/api/files/*", (req, res) => {
    const key = decodeURIComponent(req.params[0] || "");
    if (key.includes("..")) return res.status(400).json({ error: "Bad path" });
    streamLocal(key, req, res);
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, "0.0.0.0", () => console.log(`Cryptune API listening on :${port}`));
