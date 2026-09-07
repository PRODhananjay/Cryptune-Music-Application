import { useAuth } from "../auth";
import { usePlayer } from "../player";

export function AppHeader({ page, onNavigate }: { page: "console" | "admin"; onNavigate: (p: "console" | "admin") => void }) {
  const { user, isAdmin, signOut } = useAuth();
  const { isPlaying } = usePlayer();
  const initials = (user?.display_name || user?.email || "?").slice(0, 2).toUpperCase();

  return (
    <header className="header">
      <div className="mobile-brand">
        <div className="brand-mark">S</div>
        <span className="word">SONGCRATE</span>
      </div>
      <div className="header-search">
        <span>⌕</span>
        <span className="header-search-placeholder">Search for songs, artists, albums…</span>
      </div>
      <div className="header-right">
        <div className={`meter ${isPlaying ? "" : "idle"}`} aria-hidden>
          {[14, 20, 9, 17, 12].map((h, i) => <span key={i} style={{ height: h, animationDelay: `${i * 0.12}s` }} />)}
        </div>
        <button className={`tab desktop-tab ${page === "console" ? "active" : ""}`} onClick={() => onNavigate("console")}>Console</button>
        {isAdmin && <button className={`tab desktop-tab ${page === "admin" ? "active" : ""}`} onClick={() => onNavigate("admin")}>Upload bay</button>}
        <div className="avatar" title={user?.email}>{initials}</div>
        <button className="btn ghost signout-btn" onClick={signOut}>Sign out</button>
      </div>
    </header>
  );
}
