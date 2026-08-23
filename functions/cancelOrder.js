const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore } = require("firebase-admin/firestore");
const Stripe = require("stripe");

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const db = getFirestore();

function getStripe(key) {
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

/**
 * Cancels an order that hasn't shipped yet — and actually refunds the
 * buyer. The money is still sitting untouched in Reloop's platform Stripe
 * balance at this point (no transfer has happened yet, since that only
 * occurs once shipment is verified — see submitShipment.js), so a real
 * Stripe refund of this order's own price is the correct action, not just
 * a Firestore status flip. Either the buyer or the seller can cancel.
 *
 * Refunds only THIS order's own price (its item + its share of shipping) —
 * never the whole PaymentIntent — since a multi-item cart PaymentIntent can
 * cover other orders that are still active and shouldn't be touched.
 *
 * Claims the order via a transaction before doing anything else — the same
 * pattern submitShipment.js uses to claim into "shipment_processing". This
 * is what actually prevents a cancellation and a shipment verification from
 * both succeeding on the same order: whichever of the two transactions
 * reaches Firestore first wins the transition out of "awaiting_shipment",
 * and the other sees the order already claimed and fails cleanly — instead
 * of both a refund AND a seller payout happening for the same money.
 */
exports.cancelOrder = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");

  const { orderId } = request.data || {};
  if (!orderId || typeof orderId !== "string") {
    throw new HttpsError("invalid-argument", "Missing order id.");
  }

  const orderRef = db.collection("orders").doc(orderId);
  let order;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
    order = snap.data();

    if (order.buyerId !== uid && order.sellerId !== uid) {
      throw new HttpsError("permission-denied", "Not your order.");
    }
    if (order.status !== "awaiting_shipment") {
      throw new HttpsError("failed-precondition", "ALREADY_PROCESSED");
    }

    tx.update(orderRef, { status: "cancelling" });
  });

  try {
    if (order.paymentIntentId && order.listing?.price > 0) {
      const stripe = getStripe(STRIPE_SECRET_KEY.value());
      await stripe.refunds.create(
        {
          payment_intent: order.paymentIntentId,
          amount: Math.round(order.listing.price * 100),
        },
        // Deterministic key: if this exact refund is ever attempted twice
        // (e.g. the refund actually succeeded but the Firestore update just
        // below failed, and this gets retried), Stripe returns the original
        // refund instead of refunding the buyer twice.
        { idempotencyKey: `cancel-refund-${orderId}` }
      );
    }

    await orderRef.update({ status: "cancelled", cancelledAt: Date.now() });
    return { cancelled: true, refunded: true };
  } catch (err) {
    console.error("Refund failed during cancellation:", err.message);
    // Release the claim so this can be retried rather than leaving the
    // order permanently stuck in "cancelling" limbo. Safe even if the
    // refund itself actually went through right before some later step
    // failed — the idempotency key above means a retry can't double-refund.
    await orderRef.update({ status: "awaiting_shipment" }).catch((revertErr) => {
      console.error("Failed to revert cancelling claim after error:", revertErr.message);
    });
    throw new HttpsError("internal", "REFUND_FAILED");
  }
});

module.exports = { cancelOrder: exports.cancelOrder };
