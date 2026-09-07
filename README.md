# Songcrate — Standalone 3-Tier Music Application

A complete, self-hosted music streaming app you can run entirely on your own machine.
No Lovable Cloud, no Supabase, no third-party services.

```
standalone/
├── frontend/    React 18 + Vite + TypeScript   → http://localhost:5173
├── backend/     Node 20 + Express + JWT        → http://localhost:4000
├── backend/schema.sql   PostgreSQL 16 schema   → localhost:5432
└── docker-compose.yml   Postgres + API in one command
```

**What it does:** the first account you register becomes the **admin** and can upload
songs (audio + cover art, with title/artist/album/genre). Every other account is a
**listener** who can browse, search, favourite and stream the catalog through a
persistent transport bar. Audio files are served through time-limited URLs — never
public links.

---

## Quick start (3 terminals, ~5 minutes)

### Step 1 — Install the prerequisites

- **Node.js 20+** — https://nodejs.org
- **PostgreSQL 16** — https://www.postgresql.org/download/
  - macOS: `brew install postgresql@16 && brew services start postgresql@16`
  - Ubuntu: `sudo apt update && sudo apt install postgresql`
  - Windows: run the official installer, keep port `5432`

Verify: `node -v` and `psql --version`.

### Step 2 — Create the database

```bash
# open a psql shell as the postgres superuser
psql -U postgres          # Ubuntu: sudo -u postgres psql
```

```sql
CREATE USER songcrate WITH PASSWORD 'songcrate';
CREATE DATABASE songcrate OWNER songcrate;
\q
```

Create the tables:

```bash
cd standalone/backend
psql "postgresql://songcrate:songcrate@localhost:5432/songcrate" -f schema.sql
```

You should see `CREATE TABLE` a few times. The schema creates `users`, `tracks` and `likes`.

### Step 3 — Start the backend

```bash
cd standalone/backend
cp .env.example .env
```

Edit `.env` and set a real secret:

```
DATABASE_URL=postgresql://songcrate:songcrate@localhost:5432/songcrate
JWT_SECRET=<paste output of: openssl rand -hex 32>
STORAGE_DRIVER=local
```

Then:

```bash
npm install
npm start
```

Check it: <http://localhost:4000/health> → `{"status":"ok","db":"up"}`

Uploaded files land in `standalone/backend/uploads/`.

### Step 4 — Start the frontend

```bash
cd standalone/frontend
cp .env.example .env      # VITE_API_URL=http://localhost:4000
npm install
npm run dev
```

Open <http://localhost:5173>.

---

## Alternative: one-command start with Docker

```bash
cd standalone
docker compose up --build
```

Starts Postgres, applies the schema and runs the API on port 4000.
Then run the frontend separately (Step 4).

---

## How to use the app

### Log in as admin

1. Go to <http://localhost:5173> → **"No account? Create one"**.
2. Register the **very first** account — it automatically becomes the admin.
3. You'll see an **Upload bay** button in the header.

Promoting someone to admin later:

```bash
psql "postgresql://songcrate:songcrate@localhost:5432/songcrate" \
  -c "UPDATE users SET role='admin' WHERE email='someone@example.com';"
```

### Upload songs

1. Sign in as admin → **Upload bay**.
2. Pick an **audio file** (mp3/wav/m4a/flac — required) and optionally a **cover image**.
3. Fill in title, artist, album, genre (title defaults to the filename; duration is read
   automatically from the file).
4. **Press to crate** → the track appears in the crate list, and in every listener's catalog.
5. Delete removes both the database row and the stored files.

### Log in as a user and listen

1. Sign out (or use another browser) → register a second account — it gets the `user` role.
2. The **Catalog** tab lists everything. Search filters by title/artist/album/genre.
3. Click a track to start playback; the whole visible list becomes the queue.
4. The bottom transport bar handles play/pause, previous/next, seek and volume.
5. Star a track to add it to **Favourites**.

---

## API reference

All protected endpoints need `Authorization: Bearer <token>` (returned by login/register).

| Method | Path                     | Access | Purpose                                    |
| ------ | ------------------------ | ------ | ------------------------------------------ |
| GET    | `/health`                | public | Health check                               |
| POST   | `/api/auth/register`     | public | Create account. **First one = admin.**     |
| POST   | `/api/auth/login`        | public | `{ token, user }`                          |
| GET    | `/api/auth/me`           | user   | Current profile                            |
| GET    | `/api/tracks?q=`         | user   | Catalog / search                           |
| GET    | `/api/tracks/:id/urls`   | user   | Time-limited audio + cover URLs            |
| POST   | `/api/tracks`            | admin  | Upload (multipart: `audio`, `cover`, tags) |
| DELETE | `/api/tracks/:id`        | admin  | Delete track + files                       |
| GET    | `/api/tracks/likes/mine` | user   | Liked track ids                            |
| PUT    | `/api/tracks/:id/like`   | user   | Like                                       |
| DELETE | `/api/tracks/:id/like`   | user   | Unlike                                     |

Test from the terminal:

```bash
# register the admin
curl -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"supersecret","display_name":"Admin"}'

# upload a song
TOKEN=<token from the response above>
curl -X POST http://localhost:4000/api/tracks \
  -H "Authorization: Bearer $TOKEN" \
  -F "audio=@/path/to/song.mp3" -F "cover=@/path/to/cover.jpg" \
  -F "title=Golden Hour" -F "artist=Nova" -F "genre=Electronic"
```

---

## Database schema

```
users(id UUID PK, email UNIQUE, password_hash, display_name, role[admin|user], created_at)
tracks(id UUID PK, title, artist, album, genre, duration_seconds,
       audio_path, cover_path, uploaded_by → users.id, created_at)
likes(user_id → users.id, track_id → tracks.id, created_at, PK(user_id, track_id))
```

Passwords are hashed with bcrypt; sessions are stateless JWTs.

---

## Configuration reference

**backend/.env**

| Variable            | Default                 | Notes                                  |
| ------------------- | ----------------------- | -------------------------------------- |
| `PORT`              | 4000                    | API port                               |
| `DATABASE_URL`      | —                       | Postgres connection string             |
| `PGSSL`             | false                   | `true` for managed Postgres (AWS RDS)  |
| `JWT_SECRET`        | —                       | 32+ random bytes                       |
| `JWT_EXPIRES_IN`    | 7d                      | Token lifetime                         |
| `STORAGE_DRIVER`    | local                   | `local` or `s3`                        |
| `LOCAL_STORAGE_DIR` | ./uploads               | Where media is written                 |
| `MAX_UPLOAD_MB`     | 100                     | Per-file upload limit                  |
| `CORS_ORIGINS`      | *                       | Comma-separated frontend origins       |
| `PUBLIC_API_URL`    | http://localhost:4000   | Used to build local streaming URLs     |
| `AWS_REGION`, `S3_BUCKET` | —                 | Only when `STORAGE_DRIVER=s3`          |

**frontend/.env**: `VITE_API_URL` — the backend base URL.

---

## Troubleshooting

| Symptom                       | Fix                                                              |
| ----------------------------- | ---------------------------------------------------------------- |
| `ECONNREFUSED 5432`           | Postgres isn't running, or `DATABASE_URL` is wrong               |
| `password authentication failed` | Recreate the user/password from Step 2                        |
| `relation "users" does not exist` | Run `schema.sql` (Step 2) or `npm run migrate`                |
| CORS error in the browser     | Add `http://localhost:5173` to `CORS_ORIGINS`, restart the API   |
| 401 on every call             | Token expired — sign out and back in                             |
| 403 on upload                 | The account isn't `admin` — promote it with the SQL above        |
| Audio won't play / seek       | Confirm the file exists in `backend/uploads/` and API is running |
| Upload fails on big files     | Raise `MAX_UPLOAD_MB` and restart the API                        |

---

## Deploying to AWS

See [`../AWS_DEPLOYMENT_GUIDE.md`](../AWS_DEPLOYMENT_GUIDE.md) — RDS for Postgres,
S3 for media, ECS/EC2/App Runner for the API, and S3 + CloudFront for the frontend.
Build the frontend with `npm run build` (output in `frontend/dist/`).
