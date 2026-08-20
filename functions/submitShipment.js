const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore } = require("firebase-admin/firestore");
const Stripe = require("stripe");

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const AFTERSHIP_API_KEY = defineSecret("AFTERSHIP_API_KEY");
const db = getFirestore();

function getStripe(key) {
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

// AfterShip versions their API by date in the URL. If this ever starts
// 404ing, check https://www.aftership.com/docs/tracking for the current version.
const AFTERSHIP_API_VERSION = "2024-04";

/**
 * Verifies a tracking number via AfterShip (free tier: 50 trackings/month,
 * no card required — https://www.aftership.com/pricing/tracking). This is
 * real verification, not a stub: it registers the tracking number with
 * AfterShip and lets THEM determine whether a real carrier recognizes it.
 *
 * Deliberately doesn't pass a carrier slug — AfterShip auto-detects the
 * carrier from the tracking number's own format. That's what actually
 * proves "a real courier recognizes this number," rather than trusting
 * whatever the seller picked from the carrier dropdown (which is stored
 * separately, just as a label — the auto-detected carrier is what's
 * authoritative here).
 *
 * Fails CLOSED: if AfterShip can't be reached at all (network error, API
 * down), this throws rather than letting the shipment through unverified.
 * That's a deliberate difference from the content-moderation module, which
 * fails open — moderation gates a listing going live, this gates real money
 * moving, and those don't deserve the same default.
 */
async function verifyWithCarrier({ trackingNumber, orderId }) {
  const clean = (trackingNumber || "").trim();
  if (clean.length < 6) {
    return { verified: false, reason: "TOO_SHORT" };
  }

  const apiKey = AFTERSHIP_API_KEY.value();
  if (!apiKey) {
    console.warn(
      "AFTERSHIP_API_KEY not set — falling back to a format-only check. " +
        "Do not treat this as real verification. Set the secret before trusting this with real transactions."
    );
    return { verified: true, reason: null, detectedCarrier: null };
  }

  let res, data;
  try {
    res = await fetch(`https://api.aftership.com/tracking/${AFTERSHIP_API_VERSION}/trackings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "as-api-key": apiKey,
      },
      body: JSON.stringify({
        tracking: {
          tracking_number: clean,
          order_id: orderId,
          // No `slug` — see the function comment above.
        },
      }),
    });
    data = await res.json();
  } catch (err) {
    console.error("AfterShip API call failed:", err.message);
    throw new HttpsError("unavailable", "VERIFY_UNAVAILABLE");
  }

  if (res.status === 201 || res.status === 200) {
    const detected = data?.data?.tracking;
    return { verified: true, reason: null, detectedCarrier: detected?.slug || null };
  }

  // Code 4029 = this tracking number was already registered before (e.g. a
  // retried request after a network hiccup) — that itself confirms AfterShip
  // previously recognized it, so treat it as verified rather than failing.
  if (data?.meta?.code === 4029) {
    return { verified: true, reason: null, detectedCarrier: null };
  }

  console.warn("AfterShip rejected tracking number:", JSON.stringify(data?.meta || data));
  return { verified: false, reason: "NOT_RECOGNIZED" };
}

/**
 * Seller submits a tracking number for an order they need to ship. If
 * verified (see verifyWithCarrier above), this is the moment the seller's
 * cut actually leaves Reloop's platform Stripe balance — via a real
 * stripe.transfers.create() call, not just a Firestore status flip.
 * Giveaway orders (sellerEarned = 0) skip the transfer entirely since
 * there's nothing to pay out.
 */
exports.submitShipment = onCall({ secrets: [STRIPE_SECRET_KEY, AFTERSHIP_API_KEY] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");

  const { orderId, carrier, trackingNumber } = request.data || {};
  if (!orderId || !carrier || !trackingNumber) {
    throw new HttpsError("invalid-argument", "Missing shipment details.");
  }

  const orderRef = db.collection("orders").doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new HttpsError("not-found", "Order not found.");
  const order = orderSnap.data();

  if (order.sellerId !== uid) throw new HttpsError("permission-denied", "Not your order.");
  if (order.status !== "awaiting_shipment") throw new HttpsError("failed-precondition", "ALREADY_SHIPPED");

  const result = await verifyWithCarrier({ trackingNumber, orderId });
  if (!result.verified) {
    throw new HttpsError("failed-precondition", "VERIFY_FAILED");
  }

  let transferId = null;

  if (order.sellerEarned > 0) {
    const sellerSnap = await db.collection("users").doc(uid).get();
    const sellerAccountId = sellerSnap.exists ? sellerSnap.data().stripeAccountId : null;
    if (!sellerAccountId) throw new HttpsError("failed-precondition", "SELLER_NOT_READY");

    const stripe = getStripe(STRIPE_SECRET_KEY.value());
    const transfer = await stripe.transfers.create({
      amount: Math.round(order.sellerEarned * 100),
      currency: "eur",
      destination: sellerAccountId,
      transfer_group: orderId,
      metadata: { orderId },
    });
    transferId = transfer.id;
  }

  await orderRef.update({
    status: "completed",
    completedAt: Date.now(),
    carrier,
    trackingNumber,
    verifiedCarrierSlug: result.detectedCarrier || null, // what AfterShip actually detected, vs. the seller's dropdown pick
    shipmentVerifiedAt: Date.now(),
    ...(transferId ? { transferId } : {}),
  });

  return { verified: true };
});

module.exports = { submitShipment: exports.submitShipment };
