import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { uploadMealPhoto, deleteMealPhoto, mealPhotoUrl } from "./mealPhotos";

// ── 7-day meal rotation ──
const MEAL_PLAN = {
  0: { // Sunday
    breakfast: { name: "Moong Dal Chilla", items: "60g moong dal chilla, 10-15g ghee. 100g low-fat curd. 10-15 almonds. 1 guava." },
    lunch: { name: "Butter Chicken", items: "100g chicken breast, butter gravy, 10-15g ghee. 1 cup brown/red rice. 100g salad." },
    dinner: { name: "Paneer Handi", items: "100g paneer, veggies, 15g ghee. 1 ragi/jowar roti. Sauteed spinach." },
  },
  1: { // Monday
    breakfast: { name: "Eggs Omelette + Cheese", items: "2 boiled eggs, 25g cheese cube, 150ml toned milk, 2 walnuts, 5g ghee. 1 green apple." },
    lunch: { name: "Chicken Tikka Salad", items: "125g chicken breast grilled, 15g ghee/coconut oil. 100g cucumber-carrot-capsicum salad." },
    dinner: { name: "Paneer Handi", items: "100g paneer, 50-100g mixed veggies, 15g ghee. 1 cup cooked brown rice." },
  },
  2: { // Tuesday
    breakfast: { name: "Paneer Bhurji", items: "100g paneer, onion, tomato, capsicum in 10g ghee. 100g curd. Strawberries." },
    lunch: { name: "Fish Roasted", items: "100g fish in 25g butter. 1 bajra/jowar roti. 1 bowl cucumber salad." },
    dinner: { name: "Chicken Tikka Salad", items: "125g chicken breast tikka, 15g coconut oil. 100g sauteed broccoli + zucchini." },
  },
  3: { // Wednesday
    breakfast: { name: "Moong Dal Chilla", items: "60g moong dal chilla, 10-15g ghee. 100g low-fat curd. 10-15 almonds. 1 guava/apple." },
    lunch: { name: "Butter Chicken", items: "100g chicken breast in butter gravy. 1 cup red/black rice. 100g cucumber salad." },
    dinner: { name: "Paneer Handi", items: "100g paneer with mixed veggies, 15g butter. 1 cup quinoa or brown rice." },
  },
  4: { // Thursday
    breakfast: { name: "Oats Meal", items: "30g oats in 100g toned milk. 3 boiled eggs. Blueberries/strawberries." },
    lunch: { name: "Paneer Handi", items: "100g paneer, 100g mixed veggies, 15g ghee. 1 jowar/ragi roti. Salad." },
    dinner: { name: "Fish Roasted", items: "100g fish in 25g butter. 1 cup brown rice. Sauteed spinach/palak." },
  },
  5: { // Friday
    breakfast: { name: "Eggs Omelette + Cheese", items: "2 boiled eggs, 25g cheese cube, 150ml toned milk, 2 walnuts, 5g coconut oil. 1 green apple." },
    lunch: { name: "Chicken Tikka Salad", items: "125g chicken breast grilled, 15g ghee. 100g lettuce-cherry tomato-cucumber salad." },
    dinner: { name: "Butter Chicken", items: "100g chicken breast in butter gravy. 1 cup brown rice. 100g cucumber salad." },
  },
  6: { // Saturday
    breakfast: { name: "Paneer Bhurji", items: "100g paneer, onion, tomato, capsicum in 10g ghee. 100g curd. Strawberries/orange." },
    lunch: { name: "Fish Roasted", items: "100g fish, 25g butter. 1 bajra roti. Cucumber-carrot salad." },
    dinner: { name: "Chicken Tikka Salad", items: "125g chicken breast tikka, 15g coconut oil. 100g sauteed broccoli + capsicum." },
  },
};

// Unique dish options per meal type, for the "pick what you're having" dropdown.
function uniqueMealOptions(mealType) {
  const seen = new Map();
  Object.values(MEAL_PLAN).forEach((day) => {
    const m = day[mealType];
    if (!seen.has(m.name)) seen.set(m.name, m);
  });
  return Array.from(seen.values());
}
const MEAL_OPTIONS = {
  breakfast: uniqueMealOptions("breakfast"),
  lunch: uniqueMealOptions("lunch"),
  dinner: uniqueMealOptions("dinner"),
};

const OTHER_VALUE = "__other__";
const SKIPPED_VALUE = "__skipped__";

const AVOID_KEYWORDS = [
  "wheat", "chapati", "roti", "naan", "paratha", "maida", "bread", "pasta", "rice krispie",
  "sugar", "candy", "cake", "cookie", "pastry", "ice cream", "chocolate", "mithai", "gulab jamun", "jalebi", "barfi",
  "banana", "mango", "grapes", "watermelon", "lychee", "chikoo", "dates",
  "peanut", "samosa", "pakora", "bhaji", "fries", "pizza", "burger", "maggi", "noodle",
  "coke", "pepsi", "soda", "juice", "fanta", "sprite", "cold drink", "soft drink",
  "alcohol", "beer", "wine", "whisky", "vodka", "rum",
  "biscuit", "chips", "namkeen",
];

const MORNING_WATER_OPTIONS = ["Jeera water", "Cinnamon water", "Plain warm water"];

// ── Helpers ──
function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function nowTimeValue() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}
function formatTimeValue(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function dayLabel(d) {
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}
function isAvoidItem(text) {
  const t = text.toLowerCase();
  return AVOID_KEYWORDS.some((k) => t.includes(k));
}
function addDays(d, n) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}
function startOfWeekMonday(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay(); // 0 Sun ... 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}
function midnight(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function isMealLogged(m) {
  if (!m.selection) return false;
  if (m.selection === SKIPPED_VALUE) return true;
  if (m.selection === OTHER_VALUE) return Boolean(m.otherTitle.trim()) && Boolean(m.time);
  return Boolean(m.time);
}

// Consecutive submitted days ending today or yesterday — an unfinished
// "today" doesn't break the streak, but a real gap (2+ days ago) does.
function computeStreak(submittedDates, today) {
  const todayKey = dateKey(today);
  const yesterdayKey = dateKey(addDays(today, -1));
  let cursor;
  if (submittedDates.has(todayKey)) {
    cursor = today;
  } else if (submittedDates.has(yesterdayKey)) {
    cursor = addDays(today, -1);
  } else {
    return 0;
  }
  let count = 0;
  while (submittedDates.has(dateKey(cursor))) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

const EMPTY_DAY = {
  morningWater: false,
  morningWaterType: "",
  morningNuts: false,
  meals: {
    breakfast: { selection: null, otherTitle: "", otherDescription: "", time: "", photoPath: null, photoVersion: null },
    lunch: { selection: null, otherTitle: "", otherDescription: "", time: "", photoPath: null, photoVersion: null },
    dinner: { selection: null, otherTitle: "", otherDescription: "", time: "", photoPath: null, photoVersion: null },
  },
  extras: [],
  waterGlasses: 0,
  submitted: false,
};

// ── Storage (Supabase day_logs, one row per user per day) ──
function rowToData(row) {
  if (!row) return null;
  return {
    morningWater: row.morning_water,
    morningWaterType: row.morning_water_type,
    morningNuts: row.morning_nuts,
    meals: row.meals,
    extras: row.extras,
    waterGlasses: row.water_glasses,
    submitted: row.submitted,
  };
}
function dataToRow(data, userId, logDate) {
  return {
    user_id: userId,
    log_date: logDate,
    morning_water: data.morningWater,
    morning_water_type: data.morningWaterType,
    morning_nuts: data.morningNuts,
    meals: data.meals,
    extras: data.extras,
    water_glasses: data.waterGlasses,
    submitted: data.submitted,
  };
}
async function loadDay(userId, logDate) {
  try {
    const { data, error } = await supabase
      .from("day_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("log_date", logDate)
      .maybeSingle();
    if (error) throw error;
    return rowToData(data);
  } catch (e) {
    console.error(e);
    return null;
  }
}
async function saveDay(userId, logDate, data) {
  try {
    const { error } = await supabase
      .from("day_logs")
      .upsert(dataToRow(data, userId, logDate), { onConflict: "user_id,log_date" });
    if (error) throw error;
  } catch (e) {
    console.error(e);
  }
}

// ── Colors ──
const C = {
  bg: "#f7f6f3",
  card: "#ffffff",
  accent: "#d94f2b",
  accentSoft: "#fef0ec",
  green: "#22963d",
  greenSoft: "#eefbf0",
  yellow: "#c58c07",
  yellowSoft: "#fefaeb",
  red: "#d94040",
  redSoft: "#fef0f0",
  text: "#1c1c1c",
  sub: "#6b6b6b",
  border: "#e8e8e4",
  blue: "#2568d4",
  blueSoft: "#edf4ff",
  water: "#3b9dd6",
  waterSoft: "#e8f5fc",
};

const selectStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  fontSize: 13,
  fontWeight: 700,
  outline: "none",
  boxSizing: "border-box",
  background: C.card,
  color: C.text,
  marginBottom: 6,
};

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  background: C.bg,
  fontFamily: "inherit",
};

const CONFETTI = ["🎉", "✨", "🥳", "💪", "🎊"];

// ── Components ──
function WaterDot({ filled, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 36, height: 36, borderRadius: "50%", border: `2px solid ${filled ? C.water : C.border}`,
        background: filled ? C.water : "transparent", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, color: filled ? "#fff" : C.border, transition: "all 0.15s",
      }}
    >💧</button>
  );
}

function Section({ title, subtitle, children, color }) {
  return (
    <div style={{ background: C.card, borderRadius: 14, padding: "16px", marginBottom: 12, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: subtitle ? 2 : 10 }}>
        <div style={{ width: 4, height: 16, borderRadius: 2, background: color || C.accent, flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</span>
      </div>
      {subtitle && <div style={{ fontSize: 11, color: C.sub, marginBottom: 10, paddingLeft: 12 }}>{subtitle}</div>}
      {children}
    </div>
  );
}

const STATUS_STYLE = {
  done: { bg: C.green, icon: "✓" },
  pending: { bg: C.red, icon: "!" },
  partial: { bg: C.yellow, icon: "~" },
};

function WeekDot({ label, status, isSelected, onClick }) {
  const s = STATUS_STYLE[status];
  const border = isSelected ? C.accent : C.border;
  return (
    <button onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none",
      border: "none", cursor: "pointer", padding: 0,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        border: `2px solid ${border}`, background: s ? s.bg : "transparent", color: s ? "#fff" : C.sub,
        fontSize: 10, fontWeight: 700, boxShadow: isSelected ? `0 0 0 2px ${C.accentSoft}` : "none",
      }}>
        {s ? s.icon : "·"}
      </div>
      <span style={{ fontSize: 10, color: isSelected ? C.accent : C.sub, fontWeight: isSelected ? 700 : 400 }}>{label}</span>
    </button>
  );
}

// ── Main App ──
export default function MealTracker({ userId, onGoToProgress }) {
  const [today] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [extraInput, setExtraInput] = useState("");
  const [extraTime, setExtraTime] = useState("");
  const [showExtraInput, setShowExtraInput] = useState(false);
  const [weekData, setWeekData] = useState({});
  const [showCelebration, setShowCelebration] = useState(false);
  const [uploadingMeal, setUploadingMeal] = useState(null);
  const [streak, setStreak] = useState(0);
  const [bodyProgressPending, setBodyProgressPending] = useState(false);

  const key = dateKey(selectedDate);
  const dayOfWeek = selectedDate.getDay();
  const plan = MEAL_PLAN[dayOfWeek];
  const isToday = dateKey(today) === key;

  const weekStart = startOfWeekMonday(weekAnchor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const thisWeekStart = startOfWeekMonday(today);
  const canGoNextWeek = addDays(weekStart, 7) <= thisWeekStart;
  const todayMidnight = midnight(today);

  // Recompute the streak whenever a day's data changes (e.g. submit/unlock)
  useEffect(() => {
    async function loadStreak() {
      const { data: rows, error } = await supabase
        .from("day_logs")
        .select("log_date")
        .eq("user_id", userId)
        .eq("submitted", true);
      if (error || !rows) {
        setStreak(0);
        return;
      }
      setStreak(computeStreak(new Set(rows.map((r) => r.log_date)), today));
    }
    loadStreak();
  }, [userId, today, data]);

  // Every 7-day streak milestone owes one body-progress entry logged
  // during that streak window; stays pending (regardless of how many
  // more days pass) until enough entries have been logged to catch up.
  useEffect(() => {
    async function checkBodyProgressPending() {
      const milestonesOwed = Math.floor(streak / 7);
      if (milestonesOwed === 0) {
        setBodyProgressPending(false);
        return;
      }
      const streakStart = addDays(today, -(streak - 1));
      const { data: rows, error } = await supabase
        .from("body_metrics")
        .select("log_date")
        .eq("user_id", userId)
        .gte("log_date", dateKey(streakStart))
        .lte("log_date", dateKey(today));
      if (error) {
        setBodyProgressPending(false);
        return;
      }
      setBodyProgressPending(milestonesOwed > (rows?.length || 0));
    }
    checkBodyProgressPending();
  }, [userId, today, streak]);

  // Load selected day
  useEffect(() => {
    setLoading(true);
    loadDay(userId, key).then((d) => {
      setData(d || JSON.parse(JSON.stringify(EMPTY_DAY)));
      setLoading(false);
    });
  }, [userId, key]);

  // Load week data for bottom strip
  useEffect(() => {
    async function loadWeek() {
      const wd = {};
      for (const d of weekDays) {
        const k = dateKey(d);
        const dayData = await loadDay(userId, k);
        if (dayData) wd[k] = dayData;
      }
      setWeekData(wd);
    }
    loadWeek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dateKey(weekStart), data]);

  // Normal update: no-op while the day is locked (submitted).
  const update = useCallback((fn) => {
    setData((prev) => {
      if (prev.submitted) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      fn(next);
      saveDay(userId, key, next);
      return next;
    });
  }, [userId, key]);

  // Bypasses the lock — only for the submit/unlock action itself.
  const forceUpdate = useCallback((fn) => {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      fn(next);
      saveDay(userId, key, next);
      return next;
    });
  }, [userId, key]);

  if (loading || !data) {
    return <div style={{ padding: 40, textAlign: "center", color: C.sub, fontFamily: "Inter, sans-serif" }}>Loading...</div>;
  }

  function getDayStatus(dayData, date) {
    if (dayData && dayData.submitted) return "done";
    if (date < todayMidnight) return "pending";
    if (date > todayMidnight) return null;
    if (!dayData) return null;
    const anyLogged = ["breakfast", "lunch", "dinner"].some((m) => isMealLogged(dayData.meals[m]));
    return anyLogged ? "partial" : null;
  }

  function selectMeal(meal, value) {
    const previousPhotoPath = data.meals[meal].photoPath;
    update((d) => {
      d.meals[meal].selection = value;
      if (value !== SKIPPED_VALUE && !d.meals[meal].time) {
        d.meals[meal].time = nowTimeValue();
      }
      if (value !== OTHER_VALUE) {
        d.meals[meal].otherTitle = "";
        d.meals[meal].otherDescription = "";
      }
      if (value === SKIPPED_VALUE) {
        d.meals[meal].photoPath = null;
        d.meals[meal].photoVersion = null;
      }
    });
    if (value === SKIPPED_VALUE && previousPhotoPath) {
      deleteMealPhoto(previousPhotoPath).catch((e) => console.error(e));
    }
  }

  async function handlePhotoSelect(meal, file) {
    if (!file) return;
    setUploadingMeal(meal);
    try {
      const path = await uploadMealPhoto(userId, key, meal, file);
      update((d) => { d.meals[meal].photoPath = path; d.meals[meal].photoVersion = Date.now(); });
    } catch (e) {
      console.error(e);
    } finally {
      setUploadingMeal(null);
    }
  }

  function handleRemovePhoto(meal) {
    const path = data.meals[meal].photoPath;
    update((d) => { d.meals[meal].photoPath = null; d.meals[meal].photoVersion = null; });
    if (path) deleteMealPhoto(path).catch((e) => console.error(e));
  }

  function addExtra() {
    if (!extraInput.trim() || !extraTime) return;
    update((d) => { d.extras.push({ text: extraInput.trim(), time: extraTime }); });
    setExtraInput("");
    setShowExtraInput(false);
  }

  function handleSubmitDay() {
    forceUpdate((d) => { d.submitted = true; });
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2400);
  }

  const waterPct = Math.min(100, Math.round((data.waterGlasses / 12) * 100));
  const locked = data.submitted;
  const allMealsLogged = ["breakfast", "lunch", "dinner"].every((m) => isMealLogged(data.meals[m]));
  const lockedWrapperStyle = {
    opacity: locked ? 0.55 : 1,
    pointerEvents: locked ? "none" : "auto",
    transition: "opacity 0.2s",
  };

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, system-ui, sans-serif", background: C.bg, minHeight: "100vh", paddingBottom: 120 }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.accent} 0%, #b83a1f 100%)`, padding: "20px 18px 16px", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", opacity: 0.8, textTransform: "uppercase" }}>FitnessTalks · 37 Day Challenge</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{isToday ? "Today" : dayLabel(selectedDate)}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {selectedDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </div>
          </div>
          {streak > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.18)",
              borderRadius: 20, padding: "6px 12px", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap",
            }}>
              🔥 {streak}
            </div>
          )}
        </div>
      </div>

      {bodyProgressPending && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          background: C.yellowSoft, borderBottom: `1px solid ${C.yellow}`, padding: "10px 14px",
        }}>
          <div style={{ fontSize: 12, color: "#8a6400", fontWeight: 600 }}>
            📏 7-day streak check-in — log your body progress
          </div>
          <button
            onClick={onGoToProgress}
            style={{
              background: C.yellow, color: "#fff", border: "none", borderRadius: 8,
              padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            Log now
          </button>
        </div>
      )}

      <div style={{ padding: "12px 14px 0" }}>

        <div style={lockedWrapperStyle}>
          {/* ── Morning Routine ── */}
          <Section title="Morning Routine" color={C.yellow}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Warm water */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => update((d) => { d.morningWater = !d.morningWater; if (!d.morningWater) d.morningWaterType = ""; })}
                  style={{
                    width: 22, height: 22, borderRadius: 6, border: `2px solid ${data.morningWater ? C.green : C.border}`,
                    background: data.morningWater ? C.green : "transparent", cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, flexShrink: 0,
                  }}>{data.morningWater ? "✓" : ""}</button>
                <span style={{ fontSize: 13, color: C.text }}>500ml warm water</span>
              </div>
              {data.morningWater && (
                <div style={{ display: "flex", gap: 6, paddingLeft: 32 }}>
                  {MORNING_WATER_OPTIONS.map((opt) => (
                    <button key={opt} onClick={() => update((d) => { d.morningWaterType = opt; })}
                      style={{
                        padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                        border: `1px solid ${data.morningWaterType === opt ? C.yellow : C.border}`,
                        background: data.morningWaterType === opt ? C.yellowSoft : C.card,
                        color: data.morningWaterType === opt ? C.yellow : C.sub, fontWeight: data.morningWaterType === opt ? 600 : 400,
                      }}>{opt}</button>
                  ))}
                </div>
              )}
              {/* Nuts */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => update((d) => { d.morningNuts = !d.morningNuts; })}
                  style={{
                    width: 22, height: 22, borderRadius: 6, border: `2px solid ${data.morningNuts ? C.green : C.border}`,
                    background: data.morningNuts ? C.green : "transparent", cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, flexShrink: 0,
                  }}>{data.morningNuts ? "✓" : ""}</button>
                <span style={{ fontSize: 13, color: C.text }}>10 almonds + 2 walnuts (soaked)</span>
              </div>
            </div>
          </Section>

          {/* ── Meals ── */}
          {["breakfast", "lunch", "dinner"].map((meal) => {
            const planned = plan[meal];
            const mealData = data.meals[meal];
            const options = MEAL_OPTIONS[meal];
            const timeLabel = meal === "breakfast" ? "7:30 – 9:30 AM" : meal === "lunch" ? "1:00 – 2:30 PM" : "8:00 – 9:30 PM";
            const mealColor = meal === "breakfast" ? C.blue : meal === "lunch" ? C.green : C.accent;
            const selectedDish = options.find((o) => o.name === mealData.selection);
            return (
              <Section key={meal} title={meal.charAt(0).toUpperCase() + meal.slice(1)} subtitle={timeLabel} color={mealColor}>
                <div style={{ fontSize: 11, color: C.sub, marginBottom: 6 }}>Planned: {planned.name}</div>

                {/* What did you have */}
                <select
                  value={mealData.selection || ""}
                  onChange={(e) => selectMeal(meal, e.target.value)}
                  style={selectStyle}
                >
                  <option value="" disabled>Select what you had</option>
                  {options.map((o) => (
                    <option key={o.name} value={o.name}>{o.name}</option>
                  ))}
                  <option value={OTHER_VALUE}>↔ Ate something else</option>
                  <option value={SKIPPED_VALUE}>✗ Skipped</option>
                </select>

                {selectedDish && (
                  <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", marginBottom: 10, border: `1px dashed ${C.border}` }}>
                    <div style={{ fontSize: 11, color: C.sub, lineHeight: 1.5 }}>{selectedDish.items}</div>
                  </div>
                )}

                {mealData.selection === OTHER_VALUE && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                    <input
                      placeholder="Title — e.g. Sandwich"
                      value={mealData.otherTitle}
                      onChange={(e) => update((d) => { d.meals[meal].otherTitle = e.target.value; })}
                      style={inputStyle}
                    />
                    <textarea
                      placeholder="Description — what was in it, how much, etc."
                      value={mealData.otherDescription}
                      onChange={(e) => update((d) => { d.meals[meal].otherDescription = e.target.value; })}
                      rows={2}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                    {isAvoidItem(`${mealData.otherTitle} ${mealData.otherDescription}`) && (
                      <div style={{ fontSize: 11, color: C.red, display: "flex", alignItems: "center", gap: 4 }}>
                        ⚠️ This may be on your Avoid List
                      </div>
                    )}
                  </div>
                )}

                {mealData.selection && mealData.selection !== SKIPPED_VALUE && (
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: C.sub, marginBottom: 4 }}>What time did you eat?</label>
                    <input
                      type="time"
                      value={mealData.time}
                      onChange={(e) => update((d) => { d.meals[meal].time = e.target.value; })}
                      style={{ ...inputStyle, width: "auto" }}
                    />
                  </div>
                )}

                {mealData.selection === SKIPPED_VALUE && (
                  <div style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>Marked as skipped</div>
                )}

                {mealData.selection && mealData.selection !== SKIPPED_VALUE && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ display: "block", fontSize: 11, color: C.sub, marginBottom: 4 }}>Photo (optional)</label>
                    {mealData.photoPath ? (
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <img
                          src={mealPhotoUrl(mealData.photoPath, mealData.photoVersion)}
                          alt={`${meal} photo`}
                          style={{ width: 96, height: 96, borderRadius: 8, objectFit: "cover", border: `1px solid ${C.border}`, display: "block" }}
                        />
                        <button
                          onClick={() => handleRemovePhoto(meal)}
                          style={{
                            position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%",
                            background: C.red, color: "#fff", border: `2px solid ${C.card}`, cursor: "pointer", fontSize: 12, lineHeight: 1,
                          }}
                        >×</button>
                      </div>
                    ) : uploadingMeal === meal ? (
                      <div style={{
                        display: "inline-flex", alignItems: "center", padding: "8px 12px", borderRadius: 8,
                        border: `1.5px dashed ${C.border}`, fontSize: 12, color: C.sub,
                      }}>
                        Uploading…
                      </div>
                    ) : (
                      <label style={{
                        display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8,
                        border: `1.5px dashed ${C.border}`, fontSize: 12, color: C.sub, cursor: "pointer",
                      }}>
                        📷 Add photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoSelect(meal, e.target.files[0])}
                          style={{ display: "none" }}
                        />
                      </label>
                    )}
                  </div>
                )}
              </Section>
            );
          })}

          {/* ── Extras / Snacks ── */}
          <Section title="Extras & Snacks" subtitle="Anything eaten outside the 3 meals" color="#8b5cf6">
            {data.extras.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {data.extras.map((ex, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                    background: isAvoidItem(ex.text) ? C.redSoft : C.bg, borderRadius: 8,
                    border: `1px solid ${isAvoidItem(ex.text) ? "#f0c0c0" : C.border}`,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: C.text }}>{ex.text}</div>
                      <div style={{ fontSize: 10, color: C.sub }}>{formatTimeValue(ex.time)}</div>
                      {isAvoidItem(ex.text) && (
                        <div style={{ fontSize: 10, color: C.red, marginTop: 2 }}>⚠️ On your Avoid List</div>
                      )}
                    </div>
                    <button onClick={() => update((d) => { d.extras.splice(i, 1); })}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.sub, padding: 4 }}>×</button>
                  </div>
                ))}
              </div>
            )}
            {showExtraInput ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  autoFocus
                  placeholder="e.g. 2 biscuits, chai with sugar..."
                  value={extraInput}
                  onChange={(e) => setExtraInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addExtra(); }}
                  style={inputStyle}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="time"
                    value={extraTime}
                    onChange={(e) => setExtraTime(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={addExtra} disabled={!extraInput.trim() || !extraTime}
                    style={{
                      padding: "8px 14px", borderRadius: 8, border: "none",
                      background: extraInput.trim() && extraTime ? C.accent : C.border,
                      color: extraInput.trim() && extraTime ? "#fff" : C.sub,
                      fontSize: 13, fontWeight: 600, cursor: extraInput.trim() && extraTime ? "pointer" : "default",
                    }}>Add</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setShowExtraInput(true); setExtraTime(nowTimeValue()); }}
                style={{
                  width: "100%", padding: "10px", borderRadius: 8, border: `1.5px dashed ${C.border}`,
                  background: "transparent", cursor: "pointer", fontSize: 13, color: C.sub,
                }}>+ Log extra food or snack</button>
            )}
          </Section>

          {/* ── Water Tracker ── */}
          <Section title={`Water — ${data.waterGlasses} / 12 glasses`} subtitle={`${(data.waterGlasses * 250 / 1000).toFixed(1)}L of 3L target`} color={C.water}>
            {/* Progress bar */}
            <div style={{ height: 8, borderRadius: 4, background: C.waterSoft, marginBottom: 12, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${waterPct}%`, background: C.water, borderRadius: 4, transition: "width 0.3s" }} />
            </div>
            {/* Dots grid */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 12 }}>
              {Array.from({ length: 12 }, (_, i) => (
                <WaterDot key={i} filled={i < data.waterGlasses} onClick={() => update((d) => {
                  d.waterGlasses = i < d.waterGlasses ? i : i + 1;
                })} />
              ))}
            </div>
            {/* Quick buttons */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={() => update((d) => { d.waterGlasses = Math.min(12, d.waterGlasses + 1); })}
                style={{
                  padding: "8px 18px", borderRadius: 8, border: `1.5px solid ${C.water}`, background: C.waterSoft,
                  color: C.water, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>+ 1 glass (250ml)</button>
              <button onClick={() => update((d) => { d.waterGlasses = Math.min(12, d.waterGlasses + 2); })}
                style={{
                  padding: "8px 18px", borderRadius: 8, border: `1.5px solid ${C.water}`, background: C.waterSoft,
                  color: C.water, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>+ 1 bottle (500ml)</button>
            </div>
            <div style={{ fontSize: 10, color: C.sub, textAlign: "center", marginTop: 8 }}>
              Herbal tea, lemon water, coconut water (no sugar) count too
            </div>
          </Section>
        </div>

        {/* ── Submit / Locked banner (always interactive, at the end) ── */}
        {locked ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: C.greenSoft, border: `1px solid ${C.green}`, borderRadius: 12,
            padding: "12px 16px", marginBottom: 12,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>✅ Day submitted — logging locked</div>
            <button onClick={() => forceUpdate((d) => { d.submitted = false; })}
              style={{ background: "none", border: `1.5px solid ${C.green}`, color: C.green, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Edit
            </button>
          </div>
        ) : (
          <button
            disabled={!allMealsLogged}
            onClick={handleSubmitDay}
            style={{
              width: "100%", padding: "12px", borderRadius: 12, border: "none", marginBottom: 12,
              background: allMealsLogged ? C.accent : C.border, color: allMealsLogged ? "#fff" : C.sub,
              fontSize: 14, fontWeight: 700, cursor: allMealsLogged ? "pointer" : "default",
            }}
          >
            {allMealsLogged ? "Submit Day" : "Log all 3 meals to submit"}
          </button>
        )}
      </div>

      {/* ── Weekly Strip (Monday → Sunday) ── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, background: C.card,
        borderTop: `1px solid ${C.border}`, padding: "8px 10px 14px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px", marginBottom: 6 }}>
          <button onClick={() => setWeekAnchor((d) => addDays(d, -7))}
            style={{ background: "none", border: "none", fontSize: 16, color: C.sub, cursor: "pointer", padding: "2px 8px" }}>
            ‹
          </button>
          <span style={{ fontSize: 11, color: C.sub, fontWeight: 600 }}>
            {weekDays[0].toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {weekDays[6].toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
          <button
            onClick={() => canGoNextWeek && setWeekAnchor((d) => addDays(d, 7))}
            disabled={!canGoNextWeek}
            style={{ background: "none", border: "none", fontSize: 16, color: C.sub, cursor: canGoNextWeek ? "pointer" : "default", padding: "2px 8px", opacity: canGoNextWeek ? 1 : 0.3 }}>
            ›
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
          {weekDays.map((d) => {
            const k = dateKey(d);
            const status = getDayStatus(weekData[k] || (k === key ? data : null), d);
            const isSelected = k === key;
            return (
              <WeekDot
                key={k}
                label={d.toLocaleDateString("en-IN", { weekday: "narrow" })}
                status={status}
                isSelected={isSelected}
                onClick={() => setSelectedDate(new Date(d))}
              />
            );
          })}
        </div>
      </div>

      {/* ── Submission celebration ── */}
      {showCelebration && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <style>{`
            @keyframes popIn { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            @keyframes confettiFall { from { transform: translateY(0) rotate(0deg); opacity: 1; } to { transform: translateY(110vh) rotate(180deg); opacity: 0; } }
          `}</style>
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} style={{
              position: "absolute", left: `${i * 10 + 5}%`, top: -30, fontSize: 22,
              animation: `confettiFall 1.8s ease-in ${i * 0.06}s forwards`,
            }}>{CONFETTI[i % CONFETTI.length]}</span>
          ))}
          <div style={{ background: C.card, borderRadius: 16, padding: "28px 32px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", animation: "popIn 0.35s ease" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Day logged!</div>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>Nice work staying on track today.</div>
          </div>
        </div>
      )}
    </div>
  );
}
