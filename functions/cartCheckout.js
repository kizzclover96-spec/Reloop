const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const Stripe = require("stripe");
const { shippingCentsFor, computeShipDeadline } = require("./shipping");
const { generateReceiptCode } = require("./receipt");
const { notifyUser } = require("./notifications");

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const db = getFirestore();

const PLATFORM_FEE_CENTS = 100;
const GIVEAWAY_CHARGE_CENTS = 300;
const SIZE_RANK = { small: 0, medium: 1, large: 2 };
const MAX_CART_ITEMS = 20;

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
 * Creates a single PaymentIntent covering multiple listings — possibly from
 * different sellers — in one payment. "Split to each original seller"
 * happens the same way single-item money-holding already works (see
 * functions/checkout.js): the full amount lands on Reloop's platform
 * balance, then N separate orders get created after payment succeeds, each
 * independently gated behind its own seller shipping their own item(s).
 *
 * Items from the same seller share ONE shipping charge and, once shipped,
 * ONE tracking submission — "1 seller · 1 package" — via a shared
 * cartGroupId on their resulting orders. Shipping cost for a group uses the
 * LARGEST package size among that seller's items in the cart. That's a
 * simplification, not a real combined-box volumetric calculation — same
 * spirit as the flat S/M/L rates themselves, just extended to groups.
 *
 * Stripe's metadata has a hard size limit a multi-item cart could easily
 * exceed, so the actual line-item breakdown lives in a
 * `cartCheckouts/{id}` Firestore doc instead — the PaymentIntent's metadata
 * just points at it.
 */
exports.createCartPaymentIntent = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");

  const { listingIds, buyerName } = request.data || {};
  if (!Array.isArray(listingIds) || listingIds.length === 0) {
    throw new HttpsError("invalid-argument", "CART_EMPTY");
  }
  if (listingIds.length > MAX_CART_ITEMS) {
    throw new HttpsError("invalid-argument", "CART_TOO_LARGE");
  }

  const listingSnaps = await Promise.all(listingIds.map((id) => db.collection("listings").doc(id).get()));
  const items = [];
  for (let i = 0; i < listingSnaps.length; i++) {
    const snap = listingSnaps[i];
    const id = listingIds[i];
    if (!snap.exists || snap.data().status !== "active") {
      throw new HttpsError("failed-precondition", `ITEM_UNAVAILABLE:${id}`);
    }
    const listing = snap.data();
    if (listing.sellerId === uid) throw new HttpsError("failed-precondition", `OWN_LISTING:${id}`);
    items.push({ id, ...listing });
  }

  const bySeller = new Map();
  for (const item of items) {
    if (!bySeller.has(item.sellerId)) bySeller.set(item.sellerId, []);
    bySeller.get(item.sellerId).push(item);
  }

  // Every seller with at least one non-giveaway item in the cart must be
  // ready to receive payment, or the whole checkout is blocked before it opens.
  for (const [sellerId, sellerItems] of bySeller) {
    if (!sellerItems.some((i) => !i.giveaway)) continue;
    const sellerSnap = await db.collection("users").doc(sellerId).get();
    const sellerData = sellerSnap.exists ? sellerSnap.data() : null;
    if (!sellerData?.stripeAccountId || !sellerData.chargesEnabled) {
      throw new HttpsError("failed-precondition", `SELLER_NOT_READY:${sellerId}`);
    }
  }

  const lineItems = [];
  let totalCents = 0;

  for (const [sellerId, sellerItems] of bySeller) {
    const biggestSize = sellerItems.reduce((max, i) => {
      const size = i.packageSize || "medium";
      return SIZE_RANK[size] > SIZE_RANK[max] ? size : max;
    }, "small");
    const groupShippingCents = shippingCentsFor(biggestSize);
    let shippingAssigned = false;

    for (const item of sellerItems) {
      let itemCents, sellerEarnedCents;
      if (item.giveaway) {
        itemCents = GIVEAWAY_CHARGE_CENTS;
        sellerEarnedCents = 0;
      } else {
        itemCents = Number(item.price) === 30 ? 3000 : Math.round((Number(item.price) + 1) * 100);
        sellerEarnedCents = itemCents - PLATFORM_FEE_CENTS;
      }
      // Only the first item in each seller's group actually carries the
      // shipping charge — the rest are 0, since it's genuinely one package.
      const shippingForThisItem = shippingAssigned ? 0 : groupShippingCents;
      shippingAssigned = true;

      lineItems.push({
        listingId: item.id,
        sellerId,
        sellerName: item.seller?.name || "",
        brand: item.brand || "",
        title: item.title || "",
        image: (item.images && item.images[0]) || "",
        giveaway: Boolean(item.giveaway),
        packageSize: item.packageSize || "medium",
        itemCents,
        sellerEarnedCents,
        shippingCents: shippingForThisItem,
      });
      totalCents += itemCents + shippingForThisItem;
    }
  }

  const stripe = getStripe(STRIPE_SECRET_KEY.value());
  const customerId = await getOrCreateCustomer(stripe, uid, request.auth.token?.email);

  const cartCheckoutRef = db.collection("cartCheckouts").doc();
  await cartCheckoutRef.set({
    buyerId: uid,
    buyerName: buyerName || "",
    items: lineItems,
    createdAt: Date.now(),
    consumed: false,
  });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalCents,
    currency: "eur",
    customer: customerId,
    setup_future_usage: "off_session",
    payment_method_types: ["card"],
    metadata: {
      cartCheckoutId: cartCheckoutRef.id,
      buyerId: uid,
    },
  });

  return { clientSecret: paymentIntent.client_secret };
});

/**
 * Called from the Stripe webhook (payment_intent.succeeded) for cart
 * PaymentIntents specifically — identified by metadata.cartCheckoutId,
 * distinguishing them from single-item intents (functions/checkout.js's
 * markOrderPaid handles those). Creates one order per line item, with
 * same-seller items sharing a cartGroupId so they ship together.
 */
async function markCartPaid(paymentIntent) {
  const { cartCheckoutId, buyerId } = paymentIntent.metadata || {};
  if (!cartCheckoutId || !buyerId) return;

  const cartRef = db.collection("cartCheckouts").doc(cartCheckoutId);
  const cartSnap = await cartRef.get();
  if (!cartSnap.exists) return;
  const cart = cartSnap.data();
  if (cart.consumed) return; // idempotency guard against redelivered webhook events

  const buyerSnap = await db.collection("users").doc(buyerId).get();
  const buyerAddress = buyerSnap.exists ? buyerSnap.data().address : null;
  const shippingAddress = buyerAddress
    ? {
        line1: buyerAddress.line1 || "",
        line2: buyerAddress.line2 || "",
        city: buyerAddress.city || "",
        postalCode: buyerAddress.postalCode || "",
        country: buyerAddress.country || "",
      }
    : null;

  const groupIdBySeller = new Map();
  for (const item of cart.items) {
    if (!groupIdBySeller.has(item.sellerId)) {
      groupIdBySeller.set(item.sellerId, db.collection("orders").doc().id);
    }
  }

  const now = Date.now();
  let wonItems = [];
  let lostItems = [];

  // A plain batch write (the old implementation) commits blindly — it has
  // no way to check "is this still available?" as part of the same atomic
  // operation, so two concurrent purchases (a single-item sale and a cart
  // checkout, or two carts) could both successfully delete-and-resell the
  // same listing. A transaction is what actually prevents that: Firestore
  // guarantees that if this transaction's reads are invalidated by another
  // write that landed first, this transaction retries and sees the real,
  // current state — so "still active" here is a real guarantee, not a
  // hopeful check.
  await db.runTransaction(async (tx) => {
    wonItems = [];
    lostItems = [];
    const listingRefs = cart.items.map((item) => db.collection("listings").doc(item.listingId));
    const snaps = await Promise.all(listingRefs.map((ref) => tx.get(ref)));

    cart.items.forEach((item, i) => {
      const snap = snaps[i];
      const stillActive = snap.exists && snap.data().status === "active";
      (stillActive ? wonItems : lostItems).push(item);
    });

    for (const item of wonItems) {
      const listingRef = db.collection("listings").doc(item.listingId);
      const orderRef = db.collection("orders").doc();
      tx.set(orderRef, {
        listingId: item.listingId,
        receiptCode: generateReceiptCode(),
        cartGroupId: groupIdBySeller.get(item.sellerId),
        listing: {
          brand: item.brand,
          title: item.title,
          image: item.image,
          price: (item.itemCents + item.shippingCents) / 100,
        },
        buyerId,
        buyerName: cart.buyerName || "",
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        status: "awaiting_shipment",
        livemode: paymentIntent.livemode,
        createdAt: now,
        shipByAt: computeShipDeadline(now),
        completedAt: null,
        paymentIntentId: paymentIntent.id,
        paymentStatus: "paid",
        giveaway: item.giveaway,
        packageSize: item.packageSize,
        shippingCost: item.shippingCents / 100,
        sellerEarned: item.sellerEarnedCents / 100,
        shippingAddress,
      });
      tx.delete(listingRef);
    }

    tx.update(cartRef, { consumed: true, consumedAt: now, wonCount: wonItems.length, lostCount: lostItems.length });
  });

  // Photo cleanup only for items that actually sold — a lost item's listing
  // (and its photos) still belongs to whoever legitimately won it, or is
  // simply still live if it was some other anomaly.
  const bucket = getStorage().bucket();
  await Promise.all(
    wonItems.map((item) =>
      bucket
        .deleteFiles({ prefix: `listings/${item.sellerId}/${item.listingId}/` })
        .catch((err) => console.error("Failed to delete listing photos after cart sale:", err))
    )
  );

  // Refund exactly the lost items' share of the payment — never the whole
  // cart total, since the won items were genuinely charged for and did sell.
  if (lostItems.length > 0) {
    const lostCents = lostItems.reduce((sum, item) => sum + item.itemCents + item.shippingCents, 0);
    try {
      const stripe = getStripe(STRIPE_SECRET_KEY.value());
      await stripe.refunds.create({ payment_intent: paymentIntent.id, amount: lostCents });
    } catch (err) {
      console.error(`Failed to refund lost cart items for ${paymentIntent.id}:`, err.message);
    }
  }

  if (wonItems.length > 0) {
    const totalPaid = (wonItems.reduce((sum, item) => sum + item.itemCents + item.shippingCents, 0) / 100).toFixed(2);
    await notifyUser(buyerId, {
      type: "purchase",
      title: "Payment successful",
      body: `Your payment of €${totalPaid} for ${wonItems.length} item${wonItems.length > 1 ? "s" : ""} went through. Head to Profile → Receipts to see it.`,
      data: { screen: "receipts" },
    });
  }
  if (lostItems.length > 0) {
    await notifyUser(buyerId, {
      type: "purchase_failed",
      title: lostItems.length === cart.items.length ? "Items no longer available" : "Some items were already sold",
      body: `${lostItems.length} item${lostItems.length > 1 ? "s" : ""} in your cart sold to someone else first. You've been refunded for ${lostItems.length > 1 ? "those" : "that one"}.`,
      data: {},
    });
  }

  const sellerItemCounts = new Map();
  for (const item of wonItems) {
    sellerItemCounts.set(item.sellerId, (sellerItemCounts.get(item.sellerId) || 0) + 1);
  }
  await Promise.all(
    Array.from(sellerItemCounts.entries()).map(([sellerId, count]) =>
      notifyUser(sellerId, {
        type: "sale",
        title: "You made a sale!",
        body: `${count} item${count > 1 ? "s" : ""} just sold. Ship within 24 business hours to get paid.`,
        data: { screen: "pickup" },
      })
    )
  );
}

module.exports = {
  createCartPaymentIntent: exports.createCartPaymentIntent,
  markCartPaid,
};
