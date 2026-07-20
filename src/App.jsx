import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { signOut } from "./auth";
import AuthScreen from "./AuthScreen";
import MealTracker from "./MealTracker";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#6b6b6b", fontFamily: "Inter, sans-serif" }}>
        Loading...
      </div>
    );
  }

  if (!session) {
    return <AuthScreen onAuthed={({ session: s }) => setSession(s)} />;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "8px 14px",
          background: "#f7f6f3",
        }}
      >
        <button
          onClick={signOut}
          style={{
            border: "none",
            background: "none",
            color: "#6b6b6b",
            fontSize: 12,
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          Log out
        </button>
      </div>
      <MealTracker />
    </div>
  );
}
