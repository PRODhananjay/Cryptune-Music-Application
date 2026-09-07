export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const TOKEN_KEY = "songcrate.token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export type User = {
  id: string;
  email: string;
  display_name: string;
  role: "admin" | "user";
};

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  genre: string | null;
  duration_seconds: number;
  audio_path: string;
  cover_path: string | null;
  lyrics: string | null;
  created_at: string;
};

export type Playlist = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  tracks: Track[];
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  register: (body: { email: string; password: string; display_name?: string }) =>
    request<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  me: () => request<{ user: User }>("/api/auth/me"),

  tracks: (q = "") =>
    request<{ tracks: Track[] }>(`/api/tracks${q ? `?q=${encodeURIComponent(q)}` : ""}`),

  trackUrls: (id: string) =>
    request<{ audio_url: string | null; cover_url: string | null }>(`/api/tracks/${id}/urls`),

  uploadTrack: (form: FormData) =>
    request<{ track: Track }>("/api/tracks", { method: "POST", body: form }),

  updateTrack: (id: string, body: { title: string; artist: string; album?: string | null; genre?: string | null; lyrics?: string | null }) =>
    request<{ track: Track }>(`/api/tracks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteTrack: (id: string) => request<{ ok: true }>(`/api/tracks/${id}`, { method: "DELETE" }),

  myLikes: () => request<{ track_ids: string[] }>("/api/tracks/likes/mine"),
  like: (id: string) => request<{ liked: boolean }>(`/api/tracks/${id}/like`, { method: "PUT" }),
  unlike: (id: string) => request<{ liked: boolean }>(`/api/tracks/${id}/like`, { method: "DELETE" }),

  playlists: () => request<{ playlists: Playlist[] }>("/api/playlists"),
  createPlaylist: (body: { name: string; description?: string | null }) =>
    request<{ playlist: Playlist }>("/api/playlists", { method: "POST", body: JSON.stringify(body) }),
  updatePlaylist: (id: string, body: { name: string; description?: string | null }) =>
    request<{ playlist: Playlist }>(`/api/playlists/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deletePlaylist: (id: string) => request<{ ok: true }>(`/api/playlists/${id}`, { method: "DELETE" }),
  addToPlaylist: (id: string, trackId: string) =>
    request<{ ok: true }>(`/api/playlists/${id}/tracks`, { method: "POST", body: JSON.stringify({ track_id: trackId }) }),
  removeFromPlaylist: (id: string, trackId: string) =>
    request<{ ok: true }>(`/api/playlists/${id}/tracks/${trackId}`, { method: "DELETE" }),
};

export function formatTime(total: number) {
  if (!Number.isFinite(total) || total < 0) total = 0;
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
