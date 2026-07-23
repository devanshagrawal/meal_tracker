import { useState } from "react";
import { confirmPasswordReset } from "./auth";

const C = {
  bg: "#f7f6f3",
  card: "#ffffff",
  accent: "#d94f2b",
  accentSoft: "#fef0ec",
  green: "#22963d",
  greenSoft: "#eefbf0",
  red: "#d94040",
  redSoft: "#fef0f0",
  text: "#1c1c1c",
  sub: "#6b6b6b",
  border: "#e8e8e4",
};

const fieldStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: C.bg,
  fontFamily: "inherit",
};

export default function ResetPasswordScreen({ token, onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await confirmPasswordReset(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
        background: C.bg,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: 360, background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: "28px 24px" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 20 }}>Set a new password</div>

        {done ? (
          <div>
            <div style={{ background: C.greenSoft, color: C.green, borderRadius: 8, padding: "12px 14px", fontSize: 13, marginBottom: 16 }}>
              Password updated. You can log in with it now.
            </div>
            <button
              onClick={onDone}
              style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none", background: C.accent, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              Back to log in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: C.sub, marginBottom: 6 }}>New password</label>
              <input
                autoFocus
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                style={fieldStyle}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: C.sub, marginBottom: 6 }}>Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                style={fieldStyle}
              />
            </div>

            {error && (
              <div style={{ background: C.redSoft, color: C.red, fontSize: 12, padding: "8px 10px", borderRadius: 8, marginBottom: 14 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !password || !confirm}
              style={{
                width: "100%", padding: "11px", borderRadius: 8, border: "none",
                background: busy ? C.accentSoft : C.accent, color: busy ? C.accent : "#fff",
                fontSize: 14, fontWeight: 700, cursor: busy ? "default" : "pointer",
              }}
            >
              {busy ? "Please wait…" : "Set new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
