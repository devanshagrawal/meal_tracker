import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { GENDER_OPTIONS, CITY_OPTIONS } from "./auth";
import { uploadProfilePhoto, deleteProfilePhoto, profilePhotoUrl } from "./profilePhoto";
import PhotoPickerButton from "./PhotoPickerButton";

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

const labelStyle = { display: "block", fontSize: 12, color: C.sub, marginBottom: 6 };

export default function ProfileScreen({ userId, onAvatarChange }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          setProfile(data);
          setForm({
            first_name: data.first_name,
            last_name: data.last_name,
            age: data.age,
            gender: data.gender,
            city: data.city,
            recovery_email: data.recovery_email || "",
          });
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAvatarSelect(file) {
    if (!file) return;
    setAvatarUploading(true);
    try {
      const path = await uploadProfilePhoto(userId, file);
      const version = Date.now();
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_path: path, avatar_version: version })
        .eq("id", userId);
      if (error) throw error;
      setProfile((prev) => ({ ...prev, avatar_path: path, avatar_version: version }));
      onAvatarChange?.(path, version);
    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: "Could not upload photo." });
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleAvatarRemove() {
    const path = profile.avatar_path;
    setProfile((prev) => ({ ...prev, avatar_path: null, avatar_version: null }));
    onAvatarChange?.(null, null);
    try {
      await supabase.from("profiles").update({ avatar_path: null, avatar_version: null }).eq("id", userId);
      if (path) await deleteProfilePhoto(path);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setMessage(null);

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setMessage({ type: "error", text: "First and last name can't be empty." });
      return;
    }
    const ageNum = Number(form.age);
    if (!Number.isInteger(ageNum) || ageNum <= 0 || ageNum >= 120) {
      setMessage({ type: "error", text: "Enter a valid age." });
      return;
    }
    const recoveryEmail = form.recovery_email.trim();
    if (recoveryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) {
      setMessage({ type: "error", text: "Enter a valid recovery email, or leave it blank." });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        age: ageNum,
        gender: form.gender,
        city: form.city,
        recovery_email: recoveryEmail || null,
      })
      .eq("id", userId);
    setSaving(false);

    if (error) {
      setMessage({ type: "error", text: "Could not save changes." });
    } else {
      setMessage({ type: "success", text: "Profile updated." });
      setProfile((prev) => ({ ...prev, ...form, age: ageNum }));
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.sub, fontFamily: "Inter, sans-serif" }}>
        Loading...
      </div>
    );
  }

  if (!profile || !form) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.red, fontFamily: "Inter, sans-serif" }}>
        Could not load profile.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, system-ui, sans-serif", background: C.bg, minHeight: "100vh", padding: "20px 16px" }}>
      <div style={{ maxWidth: 400, margin: "0 auto", background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: "24px 20px" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 4 }}>My Profile</div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>@{profile.username}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
            {profile.avatar_path ? (
              <img
                src={profilePhotoUrl(profile.avatar_path, profile.avatar_version)}
                alt="Profile"
                style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: `1px solid ${C.border}`, display: "block" }}
              />
            ) : (
              <div style={{
                width: 72, height: 72, borderRadius: "50%", background: C.bg, border: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: C.sub,
              }}>
                👤
              </div>
            )}
            {profile.avatar_path && (
              <button
                onClick={handleAvatarRemove}
                style={{
                  position: "absolute", top: -4, right: -4, width: 22, height: 22, borderRadius: "50%",
                  background: C.red, color: "#fff", border: `2px solid ${C.card}`, cursor: "pointer", fontSize: 12, lineHeight: 1,
                }}
              >×</button>
            )}
          </div>
          {avatarUploading ? (
            <div style={{
              display: "inline-flex", alignItems: "center", padding: "8px 12px", borderRadius: 8,
              border: `1.5px dashed ${C.border}`, fontSize: 12, color: C.sub,
            }}>
              Uploading…
            </div>
          ) : (
            <PhotoPickerButton
              triggerContent={<>📷 {profile.avatar_path ? "Change photo" : "Add photo (optional)"}</>}
              triggerStyle={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8,
                border: `1.5px dashed ${C.border}`, fontSize: 12, color: C.sub, background: "none",
              }}
              captureMode="user"
              onSelect={handleAvatarSelect}
            />
          )}
        </div>

        <form onSubmit={handleSave}>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>First name</label>
              <input value={form.first_name} onChange={(e) => updateField("first_name", e.target.value)} style={fieldStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Last name</label>
              <input value={form.last_name} onChange={(e) => updateField("last_name", e.target.value)} style={fieldStyle} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Age</label>
              <input
                type="number"
                min="1"
                max="119"
                value={form.age}
                onChange={(e) => updateField("age", e.target.value)}
                style={fieldStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Gender</label>
              <select value={form.gender} onChange={(e) => updateField("gender", e.target.value)} style={fieldStyle}>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>City</label>
            <select value={form.city} onChange={(e) => updateField("city", e.target.value)} style={fieldStyle}>
              {CITY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Recovery email (optional)</label>
            <input
              type="email"
              value={form.recovery_email}
              onChange={(e) => updateField("recovery_email", e.target.value)}
              placeholder="you@example.com"
              style={fieldStyle}
            />
            <div style={{ fontSize: 11, color: C.sub, marginTop: 6 }}>
              Needed for "Forgot password" — without one on file, you'd need to be helped manually.
            </div>
          </div>

          {message && (
            <div
              style={{
                background: message.type === "success" ? C.greenSoft : C.redSoft,
                color: message.type === "success" ? C.green : C.red,
                fontSize: 12,
                padding: "8px 10px",
                borderRadius: 8,
                marginBottom: 14,
              }}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              width: "100%",
              padding: "11px",
              borderRadius: 8,
              border: "none",
              background: saving ? C.accentSoft : C.accent,
              color: saving ? C.accent : "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: saving ? "default" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
