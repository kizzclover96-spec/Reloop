const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const Stripe = require("stripe");
const { shippingCentsFor, computeShipDeadline } = require("./shipping");

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const db = getFirestore();

// Keep in sync with the client display constants (src/utils/price.ts).
const PLATFORM_FEE_CENTS = 100; // €1 kept by Reloop on every normal paid sale
const GIVEAWAY_CHARGE_CENTS = 300; // €3 flat "claim fee" for giveaway items, 100% kept by Reloop

function getStripe(key) {
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

async function getOrCreateCustomer(stripe, uid, email) {
  const userRef = db.collection("users").doc(uid);
  const snap = await userRef.get();
  const existing = snap.exists ? snap.data().stripeCustomerId : null;
  if (existing) return existing;

  const customer = await stripe.customers.create({ email: email || undefined, metadata: { uid } });
  await userRef.set({ stripeCustomerId: customer.id }, { merge: true });
  return customer.id;
}

/**
 * Creates a PaymentIntent for a listing — paid or giveaway, both go through
 * Stripe now. Restricted to `card` only: that single payment_method_type is
 * what makes the Payment Element show Card entry, Apple Pay, and Google Pay
 * and nothing else Stripe might otherwise auto-suggest.
 *
 * IMPORTANT ARCHITECTURE NOTE: unlike the previous version, this does NOT
 * set transfer_data on the PaymentIntent. The full charge (item + shipping)
 * lands in Reloop's own platform Stripe balance, not the seller's. The
 * seller's cut only moves to their connected account later, via a manual
 * stripe.transfers.create() call in submitShipment.js — and only once
 * their tracking number has been verified with the carrier. This is what
 * makes "seller doesn't get paid until they actually ship" a real
 * financial fact, not just a Firestore status field.
 *
 * Shipping cost is folded into the same charge (no separate PaymentIntent)
 * and always stays with Reloop — see sellerEarnedCents in the metadata,
 * which deliberately excludes shipping.
 */
exports.createPaymentIntent = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");

  const { listingId, buyerName } = request.data || {};
  if (!listingId || typeof listingId !== "string") {
    throw new HttpsError("invalid-argument", "Missing listing id.");
  }

  const listingSnap = await db.collection("listings").doc(listingId).get();
  if (!listingSnap.exists) throw new HttpsError("not-found", "This listing no longer exists.");
  const listing = listingSnap.data();

  if (listing.status !== "active") throw new HttpsError("failed-precondition", "ITEM_UNAVAILABLE");
  if (listing.sellerId === uid) throw new HttpsError("failed-precondition", "OWN_LISTING");

  const shippingCents = shippingCentsFor(listing.packageSize);

  const stripe = getStripe(STRIPE_SECRET_KEY.value());
  const customerId = await getOrCreateCustomer(stripe, uid, request.auth.token?.email);

  const baseMetadata = {
    listingId,
    buyerId: uid,
    buyerName: buyerName || "",
    sellerId: listing.sellerId,
    sellerName: listing.seller?.name || "",
    brand: listing.brand || "",
    title: listing.title || "",
    image: (listing.images && listing.images[0]) || "",
    giveaway: listing.giveaway ? "true" : "false",
    packageSize: listing.packageSize || "medium",
    shippingCents: String(shippingCents),
  };

  let itemCents;
  let sellerEarnedCents;

  if (listing.giveaway) {
    itemCents = GIVEAWAY_CHARGE_CENTS;
    sellerEarnedCents = 0;
  } else {
    const sellerSnap = await db.collection("users").doc(listing.sellerId).get();
    const sellerData = sellerSnap.exists ? sellerSnap.data() : null;
    if (!sellerData?.stripeAccountId || !sellerData.chargesEnabled) {
      // Blocks checkout before it ever opens — matches "the system must never
      // allow a buyer to pay for a normal item if the seller hasn't set up payouts."
      throw new HttpsError("failed-precondition", "SELLER_NOT_READY");
    }

    itemCents =
      Number(listing.price) === 30
        ? 3000 // top tier: buyer pays exactly €30 for the item, the €1 fee comes out of the seller's cut instead
        : Math.round((Number(listing.price) + 1) * 100); // every other tier: fee added on top, seller gets the full listed price
    sellerEarnedCents = itemCents - PLATFORM_FEE_CENTS;
  }

  const amount = itemCents + shippingCents; // shipping always stays with Reloop, on top of whatever the item split is

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "eur",
    customer: customerId,
    setup_future_usage: "off_session", // lets the buyer save this card for next time
    payment_method_types: ["card"],
    // No transfer_data here — see the architecture note above.
    metadata: {
      ...baseMetadata,
      sellerEarnedCents: String(sellerEarnedCents),
    },
  });

  return { clientSecret: paymentIntent.client_secret };
});

/**
 * Called from the Stripe webhook on payment_intent.succeeded. This is the
 * ONLY place a listing gets sold and its order created — never the client,
 * so payment can't be skipped by calling a Firestore write directly.
 * Idempotent: re-delivered webhook events are a no-op.
 *
 * The order starts in "awaiting_shipment" — the seller's cut is NOT
 * transferred yet (see createPaymentIntent's architecture note). It becomes
 * "completed" only once submitShipment.js verifies a real tracking number
 * and creates the actual Stripe transfer.
 *
 * The listing doc (and its Storage photos) are deleted entirely once sold —
 * not just marked "sold" — so a purchased item stops showing up anywhere
 * it's browsable. Every screen that needs to keep showing a sold item
 * (Profile → Sold, Buying, receipts) reads from the order's own denormalized
 * `listing` snapshot instead, which is why that snapshot exists.
 */
async function markOrderPaid(paymentIntent) {
  const {
    listingId,
    buyerId,
    buyerName,
    sellerId,
    sellerName,
    brand,
    title,
    image,
    giveaway,
    sellerEarnedCents,
    packageSize,
    shippingCents,
  } = paymentIntent.metadata || {};
  if (!listingId || !buyerId) return;

  const already = await db.collection("orders").where("paymentIntentId", "==", paymentIntent.id).limit(1).get();
  if (!already.empty) return;

  // Snapshot the buyer's address as it is right now — not a live reference,
  // so if they change their address later, past orders still show where the
  // item was actually meant to go at the time of purchase.
  const buyerSnap = await db.collection("users").doc(buyerId).get();
  const buyerAddress = buyerSnap.exists ? buyerSnap.data().address : null;

  const listingRef = db.collection("listings").doc(listingId);
  let shouldDeletePhotos = false;
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(listingRef);
    if (!snap.exists) return;
    const listing = snap.data();
    if (listing.status !== "active") return; // already sold/claimed — don't double-process

    tx.delete(listingRef);
    shouldDeletePhotos = true;
    tx.set(db.collection("orders").doc(), {
      listingId,
      listing: {
        brand: brand || "",
        title: title || "",
        image: image || "",
        price: paymentIntent.amount / 100, // what the buyer actually paid, including shipping
      },
      buyerId,
      buyerName: buyerName || "",
      sellerId,
      sellerName: sellerName || "",
      status: "awaiting_shipment",
      createdAt: now,
      shipByAt: computeShipDeadline(now),
      completedAt: null,
      paymentIntentId: paymentIntent.id,
      paymentStatus: "paid",
      giveaway: giveaway === "true",
      packageSize: packageSize || "medium",
      shippingCost: Number(shippingCents || 0) / 100,
      // What the seller will receive once shipment is verified — 0 for
      // giveaways, (price - €1) for normal sales, never includes shipping.
      // Wallet balance and payout transfers are computed from this, never
      // from the buyer-facing total.
      sellerEarned: Number(sellerEarnedCents || 0) / 100,
      // Only ever readable by this order's buyer/seller (firestore.rules) —
      // never exposed on the public listing.
      shippingAddress: buyerAddress
        ? {
            line1: buyerAddress.line1 || "",
            line2: buyerAddress.line2 || "",
            city: buyerAddress.city || "",
            postalCode: buyerAddress.postalCode || "",
            country: buyerAddress.country || "",
          }
        : null,
    });
  });

  if (shouldDeletePhotos) {
    try {
      const bucket = getStorage().bucket();
      await bucket.deleteFiles({ prefix: `listings/${sellerId}/${listingId}/` });
    } catch (err) {
      console.error("Failed to delete listing photos after sale:", err);
    }
  }
}

module.exports = {
  createPaymentIntent: exports.createPaymentIntent,
  markOrderPaid,
};
