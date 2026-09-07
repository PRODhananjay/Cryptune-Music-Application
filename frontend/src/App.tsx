import { useState } from "react";
import { useAuth } from "./auth";
import { PlayerProvider, usePlayer } from "./player";
import { AppHeader } from "./components/AppHeader";
import { PlayerBar } from "./components/PlayerBar";
import { Sidebar } from "./components/Sidebar";
import { LyricsPanel } from "./components/LyricsPanel";
import { FullscreenPlayer } from "./components/FullscreenPlayer";
import { AuthPage } from "./pages/AuthPage";
import { ConsolePage } from "./pages/ConsolePage";
import { AdminPage } from "./pages/AdminPage";
import { HomePage } from "./pages/HomePage";
import { PlaylistPage } from "./pages/PlaylistPage";
import { ThemeSwitcher } from "./components/ThemeSwitcher";

export default function App() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<"console" | "admin">("console");
  const [section, setSection] = useState<"home" | "explore" | "albums" | "artists" | "playlists">("home");

  if (loading) {
    return <div className="auth-wrap"><span className="label">Warming the valves…</span></div>;
  }
  if (!user) return <AuthPage />;

  return (
    <PlayerProvider>
      <AppFrame page={page} section={section} onNavigate={setPage} onSection={setSection} />
    </PlayerProvider>
  );
}

function AppFrame({ page, section, onNavigate, onSection }: { page: "console" | "admin"; section: "home" | "explore" | "albums" | "artists" | "playlists"; onNavigate: (p: "console" | "admin") => void; onSection: (s: "home" | "explore" | "albums" | "artists" | "playlists") => void }) {
  const { current, queue } = usePlayer();
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [consoleTab, setConsoleTab] = useState<"catalog" | "liked" | "queue">("catalog");
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const goLiked = () => { setPageConsole(); onSection("home"); setConsoleTab("liked"); };
  const goQueue = () => { setPageConsole(); onSection("home"); setConsoleTab("queue"); };
  const setPageConsole = () => onNavigate("console");

  return (
    <div className="app-frame">
      <Sidebar page={page} section={section} onNavigate={onNavigate} onSection={onSection} onLiked={goLiked} onQueue={goQueue} onPlaylists={() => { onNavigate("console"); onSection("playlists"); }} />
      <div className="app-column">
        <AppHeader page={page} onNavigate={onNavigate} />
        <ThemeSwitcher />
        <div className={lyricsOpen && page === "console" && current ? "content-layout with-lyrics" : "content-layout"}>
          <main className="main-content">
            {page === "console" ? (
              section === "home" && consoleTab === "catalog" ? (
                <HomePage onBrowse={() => onSection("explore")} />
              ) : section === "playlists" ? (
                <PlaylistPage />
              ) : (
                <ConsolePage
                  section={section}
                  initialTab={consoleTab}
                  onTabChange={setConsoleTab}
                  onLyricsOpen={() => setLyricsOpen(true)}
                />
              )
            ) : <AdminPage />}
          </main>
          {lyricsOpen && page === "console" && current && (
            <LyricsPanel track={current} onClose={() => setLyricsOpen(false)} />
          )}
        </div>
      </div>
      <div className="mobile-nav">
        <button className={page === "console" && consoleTab === "catalog" ? "active" : ""} onClick={() => { onNavigate("console"); onSection("home"); setConsoleTab("catalog"); }}><span>⌂</span>Home</button>
        <button className={consoleTab === "liked" ? "active" : ""} onClick={goLiked}><span>♡</span>Liked</button>
        <button className={consoleTab === "queue" ? "active" : ""} onClick={goQueue}><span>☷</span>Queue</button>
        <button className={section === "playlists" ? "active" : ""} onClick={() => { onNavigate("console"); onSection("playlists"); }}><span>▣</span>Playlists</button>
        <button className={lyricsOpen ? "active" : ""} onClick={() => current && setLyricsOpen(true)} disabled={!current}><span>♫</span>Lyrics</button>
      </div>
      <PlayerBar lyricsOpen={lyricsOpen} onLyricsToggle={() => current && setLyricsOpen((v) => !v)} queueCount={queue.length} onCoverClick={() => current && setFullscreenOpen(true)} />
      {fullscreenOpen && current && <FullscreenPlayer track={current} onClose={() => setFullscreenOpen(false)} />}
    </div>
  );
}
