const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore } = require("firebase-admin/firestore");
const Stripe = require("stripe");

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const db = getFirestore();

function getStripe(key) {
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

function sumEur(entries) {
  return (entries || [])
    .filter((e) => e.currency === "eur")
    .reduce((sum, e) => sum + e.amount, 0) / 100;
}

/**
 * The wallet the app shows a seller is meant to be "essentially a
 * representation of the seller's Stripe balance" — not a number Reloop
 * computes and hopes matches reality. This calls Stripe's own balance API
 * for their connected account and returns exactly what Stripe says.
 */
exports.getSellerBalance = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");

  const userSnap = await db.collection("users").doc(uid).get();
  const accountId = userSnap.exists ? userSnap.data().stripeAccountId : null;
  if (!accountId) return { available: 0, pending: 0, connected: false };

  const stripe = getStripe(STRIPE_SECRET_KEY.value());
  const balance = await stripe.balance.retrieve({ stripeAccount: accountId });

  return {
    connected: true,
    available: sumEur(balance.available),
    pending: sumEur(balance.pending),
  };
});
