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
 */
exports.cancelOrder = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");

  const { orderId } = request.data || {};
  if (!orderId || typeof orderId !== "string") {
    throw new HttpsError("invalid-argument", "Missing order id.");
  }

  const orderRef = db.collection("orders").doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new HttpsError("not-found", "Order not found.");
  const order = orderSnap.data();

  if (order.buyerId !== uid && order.sellerId !== uid) {
    throw new HttpsError("permission-denied", "Not your order.");
  }
  if (order.status !== "awaiting_shipment") {
    throw new HttpsError("failed-precondition", "ALREADY_PROCESSED");
  }

  if (order.paymentIntentId && order.listing?.price > 0) {
    const stripe = getStripe(STRIPE_SECRET_KEY.value());
    try {
      await stripe.refunds.create({
        payment_intent: order.paymentIntentId,
        amount: Math.round(order.listing.price * 100),
      });
    } catch (err) {
      console.error("Refund failed during cancellation:", err.message);
      throw new HttpsError("internal", "REFUND_FAILED");
    }
  }

  await orderRef.update({ status: "cancelled", cancelledAt: Date.now() });

  return { cancelled: true, refunded: true };
});

module.exports = { cancelOrder: exports.cancelOrder };
