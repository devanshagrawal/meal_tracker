import { useState } from "react";
import {
  signInWithUsername,
  signUpWithUsername,
  GENDER_OPTIONS,
  CITY_OPTIONS,
} from "./auth";

const C = {
  bg: "#f7f6f3",
  card: "#ffffff",
  accent: "#d94f2b",
  accentSoft: "#fef0ec",
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

const EMPTY_PROFILE = {
  firstName: "",
  lastName: "",
  age: "",
  gender: "",
  city: "",
};

function Field({ label, children }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label style={{ display: "block", fontSize: 12, color: C.sub, marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function updateProfile(field, value) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  function switchMode(next) {
    setMode(next);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result =
        mode === "login"
          ? await signInWithUsername(username, password)
          : await signUpWithUsername(username, password, profile);
      onAuthed(result);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const signupIncomplete =
    mode === "signup" &&
    (!profile.firstName || !profile.lastName || !profile.age || !profile.gender || !profile.city);

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
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          background: C.card,
          borderRadius: 14,
          border: `1px solid ${C.border}`,
          padding: "28px 24px",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            color: C.sub,
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          FitnessTalks · 37 Day Challenge
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 20 }}>
          {mode === "login" ? "Log in" : "Create account"}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: C.sub, marginBottom: 6 }}>
              Username
            </label>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. devansh"
              style={fieldStyle}
            />
          </div>

          <div style={{ marginBottom: mode === "signup" ? 14 : 16 }}>
            <label style={{ display: "block", fontSize: 12, color: C.sub, marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
              style={fieldStyle}
            />
          </div>

          {mode === "signup" && (
            <>
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <Field label="First name">
                  <input
                    value={profile.firstName}
                    onChange={(e) => updateProfile("firstName", e.target.value)}
                    style={fieldStyle}
                  />
                </Field>
                <Field label="Last name">
                  <input
                    value={profile.lastName}
                    onChange={(e) => updateProfile("lastName", e.target.value)}
                    style={fieldStyle}
                  />
                </Field>
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <Field label="Age">
                  <input
                    type="number"
                    min="1"
                    max="119"
                    value={profile.age}
                    onChange={(e) => updateProfile("age", e.target.value)}
                    style={fieldStyle}
                  />
                </Field>
                <Field label="Gender">
                  <select
                    value={profile.gender}
                    onChange={(e) => updateProfile("gender", e.target.value)}
                    style={fieldStyle}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, color: C.sub, marginBottom: 6 }}>
                  City
                </label>
                <select
                  value={profile.city}
                  onChange={(e) => updateProfile("city", e.target.value)}
                  style={fieldStyle}
                >
                  <option value="" disabled>
                    Select
                  </option>
                  {CITY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {error && (
            <div
              style={{
                background: C.redSoft,
                color: C.red,
                fontSize: 12,
                padding: "8px 10px",
                borderRadius: 8,
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !username || !password || signupIncomplete}
            style={{
              width: "100%",
              padding: "11px",
              borderRadius: 8,
              border: "none",
              background: busy ? C.accentSoft : C.accent,
              color: busy ? C.accent : "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: busy ? "default" : "pointer",
            }}
          >
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: C.sub }}>
          {mode === "login" ? (
            <>
              No account yet?{" "}
              <button
                onClick={() => switchMode("signup")}
                style={{
                  background: "none",
                  border: "none",
                  color: C.accent,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 12,
                  padding: 0,
                }}
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => switchMode("login")}
                style={{
                  background: "none",
                  border: "none",
                  color: C.accent,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 12,
                  padding: 0,
                }}
              >
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
