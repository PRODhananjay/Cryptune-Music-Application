import { useAuth } from "../auth";

export function Sidebar({
  page,
  section,
  onNavigate,
  onSection,
  onLiked,
  onQueue,
  onPlaylists,
}: {
  page: "console" | "admin";
  section: "home" | "explore" | "albums" | "artists" | "playlists";
  onNavigate: (p: "console" | "admin") => void;
  onSection: (s: "home" | "explore" | "albums" | "artists" | "playlists") => void;
  onLiked: () => void;
  onQueue: () => void;
  onPlaylists: () => void;
}) {
  const { user, isAdmin } = useAuth();
  const initials = (user?.display_name || user?.email || "?").slice(0, 2).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">C</div>
        <div>
          <div className="sidebar-word">CRYPTUNE</div>
          <div className="sidebar-kicker">PRIVATE LISTENING</div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        <button className={`side-item ${section === "home" && page === "console" ? "active" : ""}`} onClick={() => { onNavigate("console"); onSection("home"); }}>
          <span>⌂</span> Home
        </button>
        <button className={`side-item ${section === "explore" ? "active" : ""}`} onClick={() => { onNavigate("console"); onSection("explore"); }}>
          <span>⌕</span> Explore
        </button>
        <button className={`side-item ${section === "albums" ? "active" : ""}`} onClick={() => { onNavigate("console"); onSection("albums"); }}>
          <span>◉</span> Albums
        </button>
        <button className={`side-item ${section === "artists" ? "active" : ""}`} onClick={() => { onNavigate("console"); onSection("artists"); }}>
          <span>♙</span> Artists
        </button>
        <button className="side-item" onClick={onLiked}>
          <span>♡</span> Liked Songs
        </button>
        <button className="side-item" onClick={onQueue}>
          <span>☷</span> Queue
        </button>
      </nav>

      <div className="sidebar-divider" />
      <div className="sidebar-section-label">YOUR LIBRARY</div>
      <nav className="sidebar-nav">
        <button className="side-item" onClick={onQueue}><span>◷</span> Recently Played</button>
        <button className="side-item" onClick={onLiked}><span>♫</span> My Favourites</button>
        <button className={`side-item ${section === "playlists" ? "active" : ""}`} onClick={onPlaylists}><span>▣</span> Playlists</button>
      </nav>

      <div className="sidebar-spacer" />

      {isAdmin && (
        <button className={`side-admin ${page === "admin" ? "active" : ""}`} onClick={() => onNavigate("admin")}>
          <span>＋</span>
          <span><strong>Upload bay</strong><small>Admin workspace</small></span>
        </button>
      )}

      <div className="sidebar-user">
        <div className="avatar">{initials}</div>
        <div className="sidebar-user-copy">
          <strong>{user?.display_name || "Listener"}</strong>
          <small>{isAdmin ? "Admin" : "Listener"}</small>
        </div>
      </div>
    </aside>
  );
}
