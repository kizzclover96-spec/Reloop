const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const db = getFirestore();

/**
 * Writes an in-app notification (feeds the bell icon / notification list on
 * Home) and, if the user has a registered device, also sends a push
 * notification. These always happen together — a push with nothing to show
 * in-app, or an in-app notification the user never gets nudged about, are
 * both worse than doing both at once.
 *
 * Push failures (no token yet, expired token, etc.) never throw — the
 * in-app notification has already succeeded by that point, and a push
 * hiccup shouldn't roll back or fail whatever actually triggered this
 * (a completed purchase, a new listing going live).
 */
async function notifyUser(userId, { type, title, body, data = {} }) {
  if (!userId || !title || !body) return;

  await db.collection("notifications").doc().set({
    userId,
    type,
    title,
    body,
    data,
    read: false,
    createdAt: Date.now(),
  });

  try {
    const userSnap = await db.collection("users").doc(userId).get();
    const tokens = userSnap.exists ? userSnap.data().fcmTokens || [] : [];
    if (tokens.length === 0) return;

    // Stringify every data value — FCM's data payload only accepts strings.
    const stringData = { type };
    for (const [k, v] of Object.entries(data)) stringData[k] = String(v);

    const response = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      android: {
        priority: "high",
        notification: {
          channelId: "reloop_default",
          color: "#2563EB",
          icon: "ic_stat_reloop",
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: { sound: "default" },
        },
      },
      data: stringData,
    });

    // Clean up tokens that are no longer valid (app uninstalled, token
    // rotated, etc.) so future sends don't keep retrying dead devices.
    const deadTokens = [];
    response.responses.forEach((r, i) => {
      if (!r.success && (r.error?.code === "messaging/registration-token-not-registered" || r.error?.code === "messaging/invalid-registration-token")) {
        deadTokens.push(tokens[i]);
      }
    });
    if (deadTokens.length > 0) {
      await db.collection("users").doc(userId).update({
        fcmTokens: tokens.filter((t) => !deadTokens.includes(t)),
      });
    }
  } catch (err) {
    console.error(`Push notification failed for user ${userId}:`, err.message);
  }
}

module.exports = { notifyUser };
