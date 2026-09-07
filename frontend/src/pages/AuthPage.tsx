import { useState } from "react";
import { useAuth } from "../auth";
import { useToast } from "../components/Toast";

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") await signUp(email, password, displayName);
      else await signIn(email, password);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <div className="brand">
          <span className="word">SONGCRATE</span>
          <span className="label">Mastering Room · 04</span>
        </div>

        <h1 style={{ fontSize: 30, margin: "22px 0 4px" }}>
          {mode === "signin" ? "Step into the room" : "Cut your first key"}
        </h1>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          The very first account created becomes the admin who fills the crate.
        </p>

        <form onSubmit={submit} className="card stack" style={{ marginTop: 20 }}>
          {mode === "signup" && (
            <label>
              <span className="label">Display name</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ayla Reyes" />
            </label>
          )}
          <label>
            <span className="label">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.fm" />
          </label>
          <label>
            <span className="label">Password</span>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </label>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          className="tab"
          style={{ marginTop: 14, paddingLeft: 0 }}
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "No account? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
