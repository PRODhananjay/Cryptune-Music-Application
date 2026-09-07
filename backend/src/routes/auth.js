import { ah } from "../async.js";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { requireAuth, signToken } from "../auth.js";

export const authRouter = Router();

authRouter.post("/register", ah(async (req, res) => {
  const { email, password, display_name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });
  if (String(password).length < 6) return res.status(400).json({ error: "password too short" });

  const exists = await query("SELECT 1 FROM users WHERE email = $1", [email.toLowerCase()]);
  if (exists.rowCount) return res.status(409).json({ error: "Email already registered" });

  // First ever account becomes the admin.
  const { rows: countRows } = await query("SELECT COUNT(*)::int AS c FROM users");
  const role = countRows[0].c === 0 ? "admin" : "user";

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, display_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, display_name, role`,
    [email.toLowerCase(), hash, display_name || email.split("@")[0], role],
  );
  const user = rows[0];
  res.status(201).json({ token: signToken(user), user });
}));

authRouter.post("/login", ah(async (req, res) => {
  const { email, password } = req.body || {};
  const { rows } = await query(
    "SELECT id, email, display_name, role, password_hash FROM users WHERE email = $1",
    [String(email || "").toLowerCase()],
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(String(password || ""), user.password_hash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  delete user.password_hash;
  res.json({ token: signToken(user), user });
}));

authRouter.get("/me", requireAuth, ah(async (req, res) => {
  const { rows } = await query(
    "SELECT id, email, display_name, role, created_at FROM users WHERE id = $1",
    [req.user.sub],
  );
  if (!rows[0]) return res.status(404).json({ error: "User not found" });
  res.json({ user: rows[0] });
}));
