import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "./supabaseClient";

export function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

async function saveToken(userId, token) {
  const { error } = await supabase
    .from("push_tokens")
    .upsert({ user_id: userId, token, platform: "android" }, { onConflict: "token" });
  if (error) console.error("Failed to save push token:", error);
}

// Firebase/FCM is not configured yet (no google-services.json). Once the
// @capacitor/push-notifications native plugin is compiled into the APK,
// calling PushNotifications.register() without an initialized FirebaseApp
// HARD-CRASHES the Android app on a native thread ("Default FirebaseApp is
// not initialized" → FirebaseMessaging.getInstance), which a JS try/catch
// cannot catch. Keep this false until Firebase is actually set up.
const PUSH_ENABLED = false;

// No-ops outside the native Android app (web/PWA never call this).
export async function registerForPushNotifications(userId) {
  if (!PUSH_ENABLED || !isNativeAndroid()) return;

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === "prompt") {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== "granted") return;

    PushNotifications.addListener("registration", (token) => {
      saveToken(userId, token.value);
    });
    PushNotifications.addListener("registrationError", (err) => {
      console.error("Push registration error:", err);
    });

    await PushNotifications.register();
  } catch (e) {
    console.error("Push notification setup failed:", e);
  }
}
