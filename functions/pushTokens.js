const { onCall, HttpsError } = require("firebase-functions/v2/https");
const functionsV1 = require("firebase-functions/v1");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { notifyUser } = require("./notifications");

const db = getFirestore();

/**
 * Fires once, when an account is actually created — not on every sign-in.
 * Notifying on every sign-in would be noisy for this app specifically,
 * since auth is session-only (browserSessionPersistence) unless the user
 * opts into "remember me", so a returning user can end up signing in quite
 * often. A one-time welcome is the useful signal; a "you signed in" ping
 * every session is not.
 *
 * This is a v1-style trigger (firebase-functions/v1) alongside the v2
 * HTTPS/Firestore functions used everywhere else in this codebase — v2's
 * identity module only exposes *blocking* triggers (beforeUserCreated etc.),
 * not a simple post-creation notification hook, so v1's functions.auth.user()
 * is the right tool for this specific job and the two styles coexist fine
 * in the same functions/index.js.
 */
exports.onUserCreated = functionsV1.auth.user().onCreate(async (user) => {
  await notifyUser(user.uid, {
    type: "welcome",
    title: "Welcome to Reloop",
    body: "Give clothes a second life — list your first item or start browsing what's nearby.",
    data: { screen: "home" },
  });
});

/**
 * Registers (or re-registers) this device's FCM push token against the
 * signed-in user, so Cloud Function triggers know where to send pushes.
 * Called from the client right after push permission is granted, and again
 * whenever the token rotates (FCM tokens aren't permanent).
 */
exports.registerPushToken = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");

  const { token } = request.data || {};
  if (!token || typeof token !== "string") {
    throw new HttpsError("invalid-argument", "Missing push token.");
  }

  await db.collection("users").doc(uid).set(
    { fcmTokens: FieldValue.arrayUnion(token) },
    { merge: true }
  );

  return { registered: true };
});

/**
 * Removes this device's token — called on logout, so a signed-out device
 * doesn't keep receiving another account's pushes if someone else signs
 * into the same device afterward.
 */
exports.unregisterPushToken = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");

  const { token } = request.data || {};
  if (!token || typeof token !== "string") {
    throw new HttpsError("invalid-argument", "Missing push token.");
  }

  await db.collection("users").doc(uid).set(
    { fcmTokens: FieldValue.arrayRemove(token) },
    { merge: true }
  );

  return { unregistered: true };
});
