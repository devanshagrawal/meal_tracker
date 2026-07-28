import { LocalNotifications } from "@capacitor/local-notifications";
import { isNativeAndroid } from "./pushNotifications";

const REMINDER_ID = 1001; // fixed id → rescheduling replaces rather than stacks
const CHANNEL_ID = "evening-reminder";

const LS_ENABLED = "eveningReminder.enabled";
const LS_HOUR = "eveningReminder.hour";
const LS_MINUTE = "eveningReminder.minute";

const DEFAULT_HOUR = 21; // 9:00 PM
const DEFAULT_MINUTE = 0;

const TITLE = "Prep for tomorrow 🌙";
const BODY = "Soak your almonds & walnuts, and set out your morning jeera/cinnamon water.";

// ── Settings (pure JS, browser-safe) ──
export function getReminderSettings() {
  try {
    const enabled = localStorage.getItem(LS_ENABLED) === "true";
    const hourRaw = localStorage.getItem(LS_HOUR);
    const minuteRaw = localStorage.getItem(LS_MINUTE);
    const hour = hourRaw === null ? DEFAULT_HOUR : Number(hourRaw);
    const minute = minuteRaw === null ? DEFAULT_MINUTE : Number(minuteRaw);
    return {
      enabled,
      hour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : DEFAULT_HOUR,
      minute: Number.isInteger(minute) && minute >= 0 && minute <= 59 ? minute : DEFAULT_MINUTE,
    };
  } catch {
    return { enabled: false, hour: DEFAULT_HOUR, minute: DEFAULT_MINUTE };
  }
}

export function saveReminderSettings({ enabled, hour, minute }) {
  try {
    localStorage.setItem(LS_ENABLED, String(enabled));
    localStorage.setItem(LS_HOUR, String(hour));
    localStorage.setItem(LS_MINUTE, String(minute));
  } catch (e) {
    console.error("Failed to save reminder settings:", e);
  }
}

// ── Native scheduling (no-ops outside the native Android app) ──
async function ensurePermission() {
  let status = await LocalNotifications.checkPermissions();
  if (status.display === "prompt" || status.display === "prompt-with-rationale") {
    status = await LocalNotifications.requestPermissions();
  }
  return status.display === "granted";
}

async function ensureChannel() {
  // Idempotent; safe to call repeatedly.
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: "Evening reminders",
    importance: 4, // HIGH
    visibility: 1, // PUBLIC
  });
}

export async function scheduleReminder(hour, minute) {
  if (!isNativeAndroid()) return;
  try {
    const granted = await ensurePermission();
    if (!granted) return;
    await ensureChannel();
    await cancelReminder(); // replace any existing schedule for this id
    await LocalNotifications.schedule({
      notifications: [
        {
          id: REMINDER_ID,
          channelId: CHANNEL_ID,
          title: TITLE,
          body: BODY,
          // Only hour+minute set → fires DAILY at that local wall-clock time,
          // surviving app close + reboot. Fires at local time; DST/timezone
          // self-corrects each cycle — do NOT convert to UTC.
          schedule: { on: { hour, minute }, allowWhileIdle: true },
        },
      ],
    });
  } catch (e) {
    console.error("Failed to schedule reminder:", e);
  }
}

export async function cancelReminder() {
  if (!isNativeAndroid()) return;
  try {
    // Cancel by id, plus sweep any other pending notifications. This app only
    // ever schedules the single reminder, so clearing all pending is safe and
    // guards against stacking: cancel-by-id alone proved unreliable when the
    // time was changed right after toggling on (the old alarm survived).
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
    const pending = await LocalNotifications.getPending();
    const ids = (pending?.notifications ?? []).map((n) => ({ id: n.id }));
    if (ids.length) await LocalNotifications.cancel({ notifications: ids });
  } catch (e) {
    console.error("Failed to cancel reminder:", e);
  }
}

// Called on app load — converge the device schedule to saved settings.
export async function initReminder() {
  if (!isNativeAndroid()) return;
  const { enabled, hour, minute } = getReminderSettings();
  if (enabled) {
    await scheduleReminder(hour, minute);
  } else {
    await cancelReminder();
  }
}
