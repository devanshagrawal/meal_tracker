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

// No-ops outside the native Android app (web/PWA never call this).
export async function registerForPushNotifications(userId) {
  if (!isNativeAndroid()) return;

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
