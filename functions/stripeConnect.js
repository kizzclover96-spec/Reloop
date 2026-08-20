const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const Stripe = require("stripe");

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");

const db = getFirestore();

function getStripe(key) {
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

function statusFromAccount(account) {
  return {
    connected: true,
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
    detailsSubmitted: Boolean(account.details_submitted),
  };
}

/**
 * Creates (if needed) a Stripe Connect Express account for the caller and
 * returns a fresh onboarding link. Safe to call repeatedly — an existing
 * account is reused, only the link is regenerated (links expire quickly).
 */
exports.createStripeConnectLink = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");

  const origin = request.data?.origin;
  if (!origin || typeof origin !== "string" || !/^https?:\/\//.test(origin)) {
    throw new HttpsError("invalid-argument", "Missing or invalid origin.");
  }

  const stripe = getStripe(STRIPE_SECRET_KEY.value());
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  let accountId = userSnap.exists ? userSnap.data().stripeAccountId : null;

  if (!accountId) {
    let account;
    try {
      account = await stripe.accounts.create({
        type: "express",
        email: request.auth.token?.email || undefined,
        metadata: { uid },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
    } catch (err) {
      console.error("Stripe account creation failed:", err.message);
      throw new HttpsError("internal", err.message || "Couldn't create a Stripe account. Try again.");
    }
    accountId = account.id;
    await userRef.set(
      {
        stripeAccountId: accountId,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  let link;
  try {
    link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/?stripe_refresh=1`,
      return_url: `${origin}/?stripe_return=1`,
      type: "account_onboarding",
    });
  } catch (err) {
    console.error("Stripe account link creation failed:", err.message);
    throw new HttpsError("internal", err.message || "Couldn't open Stripe onboarding. Try again.");
  }

  return { url: link.url };
});

/**
 * Pulls fresh status directly from Stripe and updates the cached copy in
 * Firestore. Called right after the user returns from onboarding, so the UI
 * doesn't have to wait for the webhook to land.
 */
exports.getStripeAccountStatus = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");

  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const accountId = userSnap.exists ? userSnap.data().stripeAccountId : null;
  if (!accountId) return { connected: false, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false };

  const stripe = getStripe(STRIPE_SECRET_KEY.value());
  const account = await stripe.accounts.retrieve(accountId);
  const status = statusFromAccount(account);

  await userRef.set({ ...status, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return status;
});

/**
 * Stripe webhook — keeps Firestore in sync with account status changes that
 * happen outside the app's own flow (e.g. Stripe re-verifying details days
 * later). Uses onRequest (not onCall) because Stripe needs the raw request
 * body to verify the signature.
 */
exports.stripeWebhook = onRequest({ secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] }, async (req, res) => {
  const stripe = getStripe(STRIPE_SECRET_KEY.value());
  let event;
  try {
    const signature = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(req.rawBody, signature, STRIPE_WEBHOOK_SECRET.value());
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    res.status(400).send("Invalid signature");
    return;
  }

  if (event.type === "account.updated") {
    const account = event.data.object;
    const uid = account.metadata?.uid;
    if (uid) {
      await db
        .collection("users")
        .doc(uid)
        .set({ ...statusFromAccount(account), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const { markOrderPaid } = require("./checkout");
    await markOrderPaid(event.data.object);
  }

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object;
    console.warn("Payment failed:", pi.id, pi.last_payment_error?.message || "(no message)");
    // No Firestore write needed here — the client already learns about the
    // failure directly from stripe.confirmPayment()'s return value. This is
    // just server-side visibility (e.g. for your own logs/monitoring).
  }

  res.status(200).send("ok");
});
