import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { uploadBodyPhoto, deleteBodyPhoto, bodyPhotoUrl } from "./bodyPhotos";
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

const MEASUREMENT_FIELDS = [
  { key: "waist", label: "Waist" },
  { key: "chest", label: "Chest" },
  { key: "hips", label: "Hips" },
  { key: "arms", label: "Arms" },
  { key: "thighs", label: "Thighs" },
];

const PHOTO_ANGLES = [
  { key: "front", label: "Front", column: "photo_front_path" },
  { key: "side", label: "Side", column: "photo_side_path" },
  { key: "back", label: "Back", column: "photo_back_path" },
];

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseNum(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function fmtNum(n) {
  return n === null || n === undefined ? "" : String(n);
}
const EMPTY_FORM = { weight: "", fat_percent: "", waist: "", chest: "", hips: "", arms: "", thighs: "" };

export default function BodyProgressTab({ userId, initialDate }) {
  const [targetWeight, setTargetWeight] = useState("");
  const [targetSaving, setTargetSaving] = useState(false);
  const [targetMessage, setTargetMessage] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [entryRow, setEntryRow] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [entryLoading, setEntryLoading] = useState(false);
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryMessage, setEntryMessage] = useState(null);
  const [uploadingAngle, setUploadingAngle] = useState(null);

  const key = dateKey(selectedDate);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("target_weight")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (data && data.target_weight !== null) setTargetWeight(String(data.target_weight));
      });
  }, [userId]);

  function loadHistory() {
    setHistoryLoading(true);
    supabase
      .from("body_metrics")
      .select("*")
      .eq("user_id", userId)
      .order("log_date", { ascending: false })
      .then(({ data }) => {
        setHistory(data || []);
        setHistoryLoading(false);
      });
  }
  useEffect(loadHistory, [userId]);

  useEffect(() => {
    if (!formOpen) return;
    let cancelled = false;
    setEntryLoading(true);
    setEntryMessage(null);
    supabase
      .from("body_metrics")
      .select("*")
      .eq("user_id", userId)
      .eq("log_date", key)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setEntryRow(data || null);
        setForm(
          data
            ? {
                weight: fmtNum(data.weight),
                fat_percent: fmtNum(data.fat_percent),
                waist: fmtNum(data.waist),
                chest: fmtNum(data.chest),
                hips: fmtNum(data.hips),
                arms: fmtNum(data.arms),
                thighs: fmtNum(data.thighs),
              }
            : EMPTY_FORM
        );
        setEntryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, key, formOpen]);

  async function saveTargetWeight() {
    setTargetMessage(null);
    setTargetSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ target_weight: parseNum(targetWeight) })
      .eq("id", userId);
    setTargetSaving(false);
    setTargetMessage(error ? { type: "error", text: "Could not save." } : { type: "success", text: "Saved." });
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openNewEntry() {
    setSelectedDate(new Date());
    setFormOpen(true);
  }

  function openEntry(logDate) {
    setSelectedDate(new Date(`${logDate}T00:00:00`));
    setFormOpen(true);
  }

  async function saveEntry() {
    setEntryMessage(null);
    setEntrySaving(true);
    const payload = {
      user_id: userId,
      log_date: key,
      weight: parseNum(form.weight),
      fat_percent: parseNum(form.fat_percent),
      waist: parseNum(form.waist),
      chest: parseNum(form.chest),
      hips: parseNum(form.hips),
      arms: parseNum(form.arms),
      thighs: parseNum(form.thighs),
    };
    const { error } = await supabase.from("body_metrics").upsert(payload, { onConflict: "user_id,log_date" });
    setEntrySaving(false);
    if (error) {
      setEntryMessage({ type: "error", text: "Could not save entry." });
    } else {
      loadHistory();
      setFormOpen(false);
    }
  }

  async function handlePhotoSelect(angle, column, file) {
    if (!file) return;
    setUploadingAngle(angle);
    try {
      const path = await uploadBodyPhoto(userId, key, angle, file);
      const version = Date.now();
      const { error } = await supabase
        .from("body_metrics")
        .upsert({ user_id: userId, log_date: key, [column]: path, photos_version: version }, { onConflict: "user_id,log_date" });
      if (error) throw error;
      setEntryRow((prev) => ({ ...(prev || { user_id: userId, log_date: key }), [column]: path, photos_version: version }));
      loadHistory();
    } catch (e) {
      console.error(e);
    } finally {
      setUploadingAngle(null);
    }
  }

  async function handlePhotoRemove(column) {
    const path = entryRow?.[column];
    setEntryRow((prev) => ({ ...prev, [column]: null }));
    try {
      await supabase.from("body_metrics").update({ [column]: null }).eq("user_id", userId).eq("log_date", key);
      if (path) await deleteBodyPhoto(path);
      loadHistory();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, system-ui, sans-serif", background: C.bg, minHeight: "100vh", padding: "20px 16px" }}>
      <div style={{ maxWidth: 400, margin: "0 auto", background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: "24px 20px" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 4 }}>Body Progress</div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>Weight, measurements, and photos over time</div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Target weight (kg)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              style={{ ...fieldStyle, flex: 1 }}
            />
            <button
              onClick={saveTargetWeight}
              disabled={targetSaving}
              style={{
                padding: "8px 16px", borderRadius: 8, border: "none",
                background: targetSaving ? C.accentSoft : C.accent, color: targetSaving ? C.accent : "#fff",
                fontSize: 13, fontWeight: 700, cursor: targetSaving ? "default" : "pointer",
              }}
            >
              {targetSaving ? "Saving…" : "Save"}
            </button>
          </div>
          {targetMessage && (
            <div style={{ fontSize: 11, color: targetMessage.type === "success" ? C.green : C.red, marginTop: 6 }}>
              {targetMessage.text}
            </div>
          )}
        </div>

        {formOpen ? (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <button
              onClick={() => setFormOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.sub, padding: 0, marginBottom: 14 }}
            >
              ← Back to list
            </button>

            <label style={labelStyle}>Entry date</label>
            <input
              type="date"
              value={key}
              onChange={(e) => setSelectedDate(new Date(`${e.target.value}T00:00:00`))}
              style={{ ...fieldStyle, marginBottom: 14 }}
            />

            {entryLoading ? (
              <div style={{ fontSize: 13, color: C.sub }}>Loading…</div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Weight (kg)</label>
                    <input type="number" value={form.weight} onChange={(e) => updateField("weight", e.target.value)} style={fieldStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Body fat %</label>
                    <input type="number" value={form.fat_percent} onChange={(e) => updateField("fat_percent", e.target.value)} style={fieldStyle} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  {MEASUREMENT_FIELDS.map(({ key: mKey, label }) => (
                    <div key={mKey}>
                      <label style={labelStyle}>{label} (cm)</label>
                      <input type="number" value={form[mKey]} onChange={(e) => updateField(mKey, e.target.value)} style={fieldStyle} />
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Progress photos</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    {PHOTO_ANGLES.map(({ key: angle, label, column }) => {
                      const path = entryRow?.[column];
                      return (
                        <div key={angle} style={{ textAlign: "center" }}>
                          {path ? (
                            <div style={{ position: "relative", display: "inline-block" }}>
                              <img
                                src={bodyPhotoUrl(path, entryRow?.photos_version)}
                                alt={label}
                                style={{ width: 72, height: 72, borderRadius: 8, objectFit: "cover", border: `1px solid ${C.border}`, display: "block" }}
                              />
                              <button
                                onClick={() => handlePhotoRemove(column)}
                                style={{
                                  position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%",
                                  background: C.red, color: "#fff", border: `2px solid ${C.card}`, cursor: "pointer", fontSize: 11, lineHeight: 1,
                                }}
                              >×</button>
                            </div>
                          ) : (
                            <PhotoPickerButton
                              triggerContent={uploadingAngle === angle ? "…" : "📷"}
                              triggerStyle={{
                                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                                width: 72, height: 72, borderRadius: 8, border: `1.5px dashed ${C.border}`, fontSize: 10, color: C.sub, background: "none",
                              }}
                              disabled={uploadingAngle === angle}
                              onSelect={(file) => handlePhotoSelect(angle, column, file)}
                            />
                          )}
                          <div style={{ fontSize: 10, color: C.sub, marginTop: 4 }}>{label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {entryMessage && (
                  <div style={{
                    background: entryMessage.type === "success" ? C.greenSoft : C.redSoft,
                    color: entryMessage.type === "success" ? C.green : C.red,
                    fontSize: 12, padding: "8px 10px", borderRadius: 8, marginBottom: 14,
                  }}>
                    {entryMessage.text}
                  </div>
                )}

                <button
                  onClick={saveEntry}
                  disabled={entrySaving}
                  style={{
                    width: "100%", padding: "11px", borderRadius: 8, border: "none",
                    background: entrySaving ? C.accentSoft : C.accent, color: entrySaving ? C.accent : "#fff",
                    fontSize: 14, fontWeight: 700, cursor: entrySaving ? "default" : "pointer",
                  }}
                >
                  {entrySaving ? "Saving…" : "Save entry"}
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <button
              onClick={openNewEntry}
              style={{
                width: "100%", padding: "11px", borderRadius: 8, border: "none", marginBottom: 16,
                background: C.accent, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}
            >
              + Add new entry
            </button>

            {historyLoading ? (
              <div style={{ fontSize: 13, color: C.sub }}>Loading…</div>
            ) : history.length === 0 ? (
              <div style={{ fontSize: 13, color: C.sub, textAlign: "center", padding: "12px 0" }}>
                No entries yet — add your first one above.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map((row) => (
                  <button
                    key={row.log_date}
                    onClick={() => openEntry(row.log_date)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px",
                      borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{row.log_date}</span>
                    <span style={{ fontSize: 12, color: C.sub }}>
                      {row.weight ? `${row.weight}kg` : "—"} {row.fat_percent ? `· ${row.fat_percent}%` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
