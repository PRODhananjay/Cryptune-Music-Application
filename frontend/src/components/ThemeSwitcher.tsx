import { useEffect, useRef, useState } from "react";

const THEMES = [
  { id: "orange", name: "Sunset Orange", accent: "#FF9F0A", deep: "#F97316", desc: "Warm & energetic" },
  { id: "purple", name: "Midnight Purple", accent: "#9B5CFF", deep: "#7C3AED", desc: "Royal & modern" },
  { id: "teal", name: "Ocean Teal", accent: "#00B8D4", deep: "#0891B2", desc: "Calm & premium" },
  { id: "green", name: "Forest Green", accent: "#22C55E", deep: "#16A34A", desc: "Fresh & natural" },
] as const;

type ThemeId = typeof THEMES[number]["id"];
const KEY = "songcrate.theme";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(KEY) as ThemeId | null;
    return THEMES.some(t => t.id === saved) ? saved! : "orange";
  });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(KEY, theme);
  }, [theme]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", key);
    };
  }, []);

  const current = THEMES.find(t => t.id === theme) ?? THEMES[0];

  return (
    <div className="theme-switcher" ref={ref}>
      <button className="theme-trigger" type="button" onClick={() => setOpen(v => !v)}
        aria-haspopup="menu" aria-expanded={open} title="Change theme">
        <span className="theme-swatch" style={{background:`linear-gradient(135deg,${current.accent},${current.deep})`}} />
        <span className="theme-trigger-label">Theme</span>
        <span className="theme-chevron">⌄</span>
      </button>

      {open && (
        <div className="theme-menu" role="menu">
          <div className="theme-menu-title">Choose theme</div>
          {THEMES.map(t => (
            <button key={t.id} className={`theme-option${theme === t.id ? " selected" : ""}`}
              type="button" role="menuitemradio" aria-checked={theme === t.id}
              onClick={() => { setTheme(t.id); setOpen(false); }}>
              <span className="theme-option-swatch" style={{background:`linear-gradient(135deg,${t.accent},${t.deep})`}} />
              <span className="theme-option-copy"><strong>{t.name}</strong><small>{t.desc}</small></span>
              {theme === t.id && <span className="theme-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
