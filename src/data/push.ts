import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { getPreference, setPreference } from "./localStore";

/** Real OS permission state — 'prompt' or 'prompt-with-rationale' means nothing's been decided yet. */
export async function checkPushPermission() {
  if (!Capacitor.isNativePlatform()) return "unsupported" as const;
  const status = await FirebaseMessaging.checkPermissions();
  return status.receive;
}

/** Triggers the actual OS permission dialog. Call only after the user has agreed to Reloop's own explainer. */
export async function requestPushPermission() {
  const status = await FirebaseMessaging.requestPermissions();
  return status.receive;
}

/** Gets this device's FCM token and registers it against the signed-in user. */
export async function registerCurrentDeviceForPush() {
  const { token } = await FirebaseMessaging.getToken();
  if (!token) return;
  const call = httpsCallable(functions, "registerPushToken");
  await call({ token });
  await setPreference("lastPushToken", token);
}

/** Removes this device's token — called on logout so the next person on this device doesn't get someone else's pushes. */
export async function unregisterCurrentDeviceForPush() {
  const lastToken = await getPreference<string | null>("lastPushToken", null);
  if (!lastToken) return;
  try {
    const call = httpsCallable(functions, "unregisterPushToken");
    await call({ token: lastToken });
    await FirebaseMessaging.deleteToken();
  } catch (err) {
    console.warn("Failed to unregister push token:", err);
  }
}
