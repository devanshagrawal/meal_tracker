import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { signOut } from "./auth";
import AuthScreen from "./AuthScreen";
import MealTracker from "./MealTracker";
import ProfileScreen from "./ProfileScreen";

const C = {
  bg: "#f7f6f3",
  card: "#ffffff",
  accent: "#d94f2b",
  accentSoft: "#fef0ec",
  red: "#d94040",
  text: "#1c1c1c",
  sub: "#6b6b6b",
  border: "#e8e8e4",
};

function menuItemStyle(active, danger) {
  return {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "10px 14px",
    background: active ? C.accentSoft : "none",
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    color: danger ? C.red : active ? C.accent : C.text,
    fontWeight: active ? 700 : 500,
  };
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [view, setView] = useState("tracker"); // "tracker" | "profile"
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.sub, fontFamily: "Inter, sans-serif" }}>
        Loading...
      </div>
    );
  }

  if (!session) {
    return <AuthScreen onAuthed={({ session: s }) => setSession(s)} />;
  }

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, system-ui, sans-serif" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: C.card,
          borderBottom: `1px solid ${C.border}`,
          position: "relative",
          zIndex: 40,
        }}
      >
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.text, padding: 4, lineHeight: 1 }}
        >
          ☰
        </button>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
          {view === "profile" ? "My Profile" : "My Daily Tracker"}
        </div>
        <div style={{ width: 28 }} />

        {menuOpen && (
          <>
            <div
              onClick={() => setMenuOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 30 }}
            />
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 14,
                marginTop: 4,
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                zIndex: 40,
                minWidth: 190,
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => { setView("tracker"); setMenuOpen(false); }}
                style={menuItemStyle(view === "tracker")}
              >
                My Daily Tracker
              </button>
              <button
                onClick={() => { setView("profile"); setMenuOpen(false); }}
                style={menuItemStyle(view === "profile")}
              >
                My Profile
              </button>
              <div style={{ borderTop: `1px solid ${C.border}` }} />
              <button
                onClick={() => { setMenuOpen(false); signOut(); }}
                style={menuItemStyle(false, true)}
              >
                Log out
              </button>
            </div>
          </>
        )}
      </div>

      {view === "profile" ? <ProfileScreen userId={session.user.id} /> : <MealTracker />}
    </div>
  );
}
