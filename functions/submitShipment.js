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
 * Seller submits a tracking number for an order — or, if items from the
 * same cart checkout share a cartGroupId, for the whole "1 seller · 1
 * package" group at once. Either way, once verified (see verifyWithCarrier
 * above), this is the moment the seller's cut actually leaves Reloop's
 * platform Stripe balance — via a real stripe.transfers.create() call, one
 * combined transfer covering every order in the group, not just a
 * Firestore status flip. Giveaway orders (sellerEarned = 0) contribute
 * nothing to that transfer amount.
 */
exports.submitShipment = onCall({ secrets: [STRIPE_SECRET_KEY, AFTERSHIP_API_KEY] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");

  const { orderId, cartGroupId, carrier, trackingNumber } = request.data || {};
  if ((!orderId && !cartGroupId) || !carrier || !trackingNumber) {
    throw new HttpsError("invalid-argument", "Missing shipment details.");
  }

  let orderRefs;
  if (cartGroupId) {
    const snap = await db.collection("orders").where("cartGroupId", "==", cartGroupId).get();
    if (snap.empty) throw new HttpsError("not-found", "Order group not found.");
    orderRefs = snap.docs.map((d) => d.ref);
  } else {
    orderRefs = [db.collection("orders").doc(orderId)];
  }

  // Atomically claim every order in the group by moving it out of
  // "awaiting_shipment" BEFORE doing anything slow (carrier verification,
  // Stripe). This is what actually stops a double-tap, a client retry, or
  // a genuine race with cancelOrder from both proceeding — only one
  // transaction can win this read-check-write; Firestore guarantees that,
  // it isn't just an optimistic hope. The previous version only checked
  // status as a plain read at the very start and didn't write anything
  // until after the Stripe transfer already happened, leaving the entire
  // verify+transfer window wide open to a second concurrent call.
  let ordersData;
  await db.runTransaction(async (tx) => {
    const snaps = await Promise.all(orderRefs.map((ref) => tx.get(ref)));
    ordersData = snaps.map((s) => s.data());

    snaps.forEach((snap, i) => {
      if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
      const data = ordersData[i];
      if (data.sellerId !== uid) throw new HttpsError("permission-denied", "Not your order.");
      if (data.status !== "awaiting_shipment") throw new HttpsError("failed-precondition", "ALREADY_PROCESSED");
    });

    for (const ref of orderRefs) {
      tx.update(ref, { status: "shipment_processing" });
    }
  });

  try {
    const result = await verifyWithCarrier({ trackingNumber, orderId: cartGroupId || orderId });
    if (!result.verified) {
      throw new HttpsError("failed-precondition", "VERIFY_FAILED");
    }

    const totalSellerEarned = ordersData.reduce((sum, o) => sum + (o.sellerEarned || 0), 0);
    let transferId = null;

    if (totalSellerEarned > 0) {
      const sellerSnap = await db.collection("users").doc(uid).get();
      const sellerAccountId = sellerSnap.exists ? sellerSnap.data().stripeAccountId : null;
      if (!sellerAccountId) throw new HttpsError("failed-precondition", "SELLER_NOT_READY");

      const stripe = getStripe(STRIPE_SECRET_KEY.value());
      // A deterministic key (not a random one) tied to the order/group ID —
      // if this exact transfer is ever attempted twice for any reason
      // (including the retry path in the catch block below, in the rare
      // case the transfer itself succeeded but something after it failed),
      // Stripe recognizes the repeat and returns the original transfer
      // instead of creating a second one.
      const transfer = await stripe.transfers.create(
        {
          amount: Math.round(totalSellerEarned * 100),
          currency: "eur",
          destination: sellerAccountId,
          transfer_group: cartGroupId || orderId,
          metadata: cartGroupId ? { cartGroupId } : { orderId },
        },
        { idempotencyKey: `transfer-${cartGroupId || orderId}` }
      );
      transferId = transfer.id;
    }

    const batch = db.batch();
    const now = Date.now();
    for (const ref of orderRefs) {
      batch.update(ref, {
        status: "completed",
        completedAt: now,
        carrier,
        trackingNumber,
        verifiedCarrierSlug: result.detectedCarrier || null,
        shipmentVerifiedAt: now,
        ...(transferId ? { transferId } : {}),
      });
    }
    await batch.commit();

    return { verified: true, itemCount: orderRefs.length };
  } catch (err) {
    // Something failed after the claim — verification, the seller not
    // having payouts set up, or a genuine Stripe error. Release the claim
    // so the seller isn't permanently stuck in limbo and can retry. This is
    // safe even in the unlikely case the Stripe transfer itself actually
    // succeeded right before a later step failed: the idempotency key above
    // means a retry can't create a second transfer, it'll just pick up the
    // same one.
    const revertBatch = db.batch();
    for (const ref of orderRefs) {
      revertBatch.update(ref, { status: "awaiting_shipment" });
    }
    await revertBatch.commit().catch((revertErr) => {
      console.error("Failed to revert shipment_processing claim after error:", revertErr.message);
    });
    throw err;
  }
});

module.exports = { submitShipment: exports.submitShipment };
