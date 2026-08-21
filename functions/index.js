const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { getAuth } = require("firebase-admin/auth");
const { moderateListing } = require("./moderation");

initializeApp();
const db = getFirestore();

/**
 * Server-side mirror of src/utils/sanitize.ts. Client-side sanitization is
 * a UX nicety, not a security boundary — a request can always be sent
 * directly, bypassing the client entirely, so anything user-submitted gets
 * cleaned again here before it's actually written.
 */
function sanitizeText(input, maxLength = 2000) {
  if (typeof input !== "string" || !input) return "";
  return input
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

// Keep these in sync with src/data/listings.ts — the client enforces the same
// numbers for a good UX, but these are the versions that actually can't be bypassed.
const MAX_PHOTOS_PER_LISTING = 5;
const MAX_ACTIVE_LISTINGS_PER_USER = 25;

// Rate limiting — separate from the total-active cap above. This is about
// *speed*, not total count: stops a script from creating 25 listings in a
// few seconds even if all 25 would otherwise be allowed.
const MIN_SECONDS_BETWEEN_LISTINGS = 5;
const MAX_LISTINGS_PER_ROLLING_HOUR = 10;

// If the moderation check itself fails (API down, quota hit, bad response —
// not "the listing got rejected", but the check couldn't run at all), should
// listing creation still go through? true = don't let a moderation outage
// take down the whole marketplace. Flip to false for stricter fail-closed
// behavior (blocks listing creation whenever the check can't run).
const MODERATION_FAIL_OPEN = true;

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

/**
 * Checks and records a listing-creation attempt against rateLimits/{uid} in
 * one transaction, so two concurrent requests can't both slip through. Throws
 * HttpsError('resource-exhausted', ...) if the user is going too fast.
 */
async function checkAndRecordRateLimit(uid) {
  const ref = db.collection("rateLimits").doc(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const data = snap.exists ? snap.data() : { timestamps: [] };
    const recent = (data.timestamps || []).filter((t) => now - t < 60 * 60 * 1000);

    const last = recent[recent.length - 1];
    if (last && now - last < MIN_SECONDS_BETWEEN_LISTINGS * 1000) {
      throw new HttpsError("resource-exhausted", "You're posting too fast — wait a few seconds and try again.");
    }
    if (recent.length >= MAX_LISTINGS_PER_ROLLING_HOUR) {
      throw new HttpsError(
        "resource-exhausted",
        `You've hit the limit of ${MAX_LISTINGS_PER_ROLLING_HOUR} new listings per hour. Try again later.`
      );
    }

    recent.push(now);
    tx.set(ref, { timestamps: recent, updatedAt: FieldValue.serverTimestamp() });
  });
}

/**
 * Creates a listing. Called by the app instead of writing to Firestore
 * directly (firestore.rules denies direct client creates on /listings),
 * so this is the one place the active-listing limit, rate limit, photo
 * count, and content moderation are actually enforced against real data —
 * not whatever the client happened to send.
 */
exports.createListing = onCall({ secrets: [GEMINI_API_KEY], timeoutSeconds: 60 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");

  await checkAndRecordRateLimit(uid);

  const { id, data, seller } = request.data || {};
  if (!id || typeof id !== "string") {
    throw new HttpsError("invalid-argument", "Missing listing id.");
  }
  if (!data || typeof data !== "object") {
    throw new HttpsError("invalid-argument", "Missing listing data.");
  }
  if (!Array.isArray(data.images) || data.images.length === 0) {
    throw new HttpsError("invalid-argument", "Add at least one photo.");
  }
  if (data.images.length > MAX_PHOTOS_PER_LISTING) {
    throw new HttpsError("invalid-argument", `Max ${MAX_PHOTOS_PER_LISTING} photos per listing.`);
  }

  // Every photo must actually live under this user's own folder for this listing id.
  const expectedPathPart = `/listings%2F${uid}%2F${id}%2F`;
  for (const url of data.images) {
    if (typeof url !== "string" || !url.includes(expectedPathPart)) {
      throw new HttpsError("permission-denied", "Photos must belong to this listing.");
    }
  }

  const activeCount = await db
    .collection("listings")
    .where("sellerId", "==", uid)
    .where("status", "==", "active")
    .count()
    .get();

  if (activeCount.data().count >= MAX_ACTIVE_LISTINGS_PER_USER) {
    throw new HttpsError(
      "resource-exhausted",
      `You've reached the ${MAX_ACTIVE_LISTINGS_PER_USER} active listing limit.`
    );
  }

  try {
    const result = await moderateListing({
      title: `${data.brand || ""} ${data.title || ""}`.trim(),
      description: data.description,
      images: data.images,
      apiKey: GEMINI_API_KEY.value(),
    });

    if (!result.safe) {
      throw new HttpsError("permission-denied", result.reason || "This listing isn't allowed on Reloop.");
    }
    if (!result.appropriate) {
      throw new HttpsError(
        "permission-denied",
        result.reason || "Reloop is for secondhand clothing, shoes, and accessories only."
      );
    }
  } catch (err) {
    if (err instanceof HttpsError) throw err; // a real moderation rejection — always propagate
    console.error("Moderation check failed to run:", err);
    if (!MODERATION_FAIL_OPEN) {
      throw new HttpsError("unavailable", "Couldn't check this listing right now. Try again shortly.");
    }
    // fail open: log it and let the listing through
  }

  await db.collection("listings").doc(id).set({
    ...data,
    title: sanitizeText(data.title, 120),
    description: data.description ? sanitizeText(data.description, 1000) : undefined,
    brand: sanitizeText(data.brand || "", 60),
    seller: seller ? { ...seller, name: sanitizeText(seller.name || "", 60) } : seller,
    sellerId: uid,
    status: "active",
    createdAt: Date.now(),
  });

  return { id };
});

/**
 * One-time sample-catalog seed, also routed through a function since direct
 * client creates on /listings are denied.
 */
exports.seedListings = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");

  const { items } = request.data || {};
  if (!Array.isArray(items)) {
    throw new HttpsError("invalid-argument", "Missing seed items.");
  }

  const existing = await db.collection("listings").limit(1).get();
  if (!existing.empty) return { seeded: false };

  const batch = db.batch();
  items.forEach((item) => {
    const ref = db.collection("listings").doc();
    batch.set(ref, { ...item, sellerId: uid, status: "active", createdAt: Date.now() });
  });
  await batch.commit();

  return { seeded: true };
});

/**
 * Storage rules can validate a single upload (size, type, ownership) but
 * can't count how many files already exist in a folder. This trigger runs
 * after every listing-photo upload and deletes anything past the cap —
 * closing the gap for a client that skips the app's own photo-count check.
 */
exports.enforcePhotoLimit = onObjectFinalized(async (event) => {
  const filePath = event.data.name; // listings/{uid}/{listingId}/{fileName}
  const match = filePath && filePath.match(/^listings\/([^/]+)\/([^/]+)\/[^/]+$/);
  if (!match) return;

  const [, uid, listingId] = match;
  const bucket = getStorage().bucket(event.data.bucket);
  const [files] = await bucket.getFiles({ prefix: `listings/${uid}/${listingId}/` });

  if (files.length <= MAX_PHOTOS_PER_LISTING) return;

  // Keep the oldest MAX_PHOTOS_PER_LISTING files, delete the rest.
  const sorted = files.sort(
    (a, b) => new Date(a.metadata.timeCreated) - new Date(b.metadata.timeCreated)
  );
  const overflow = sorted.slice(MAX_PHOTOS_PER_LISTING);
  await Promise.all(overflow.map((file) => file.delete().catch(() => {})));
});

async function gatherUserData(uid) {
  const [listingsSnap, ordersAsSellerSnap, ordersAsBuyerSnap, withdrawalsSnap] = await Promise.all([
    db.collection("listings").where("sellerId", "==", uid).get(),
    db.collection("orders").where("sellerId", "==", uid).get(),
    db.collection("orders").where("buyerId", "==", uid).get(),
    db.collection("withdrawals").where("uid", "==", uid).get(),
  ]);

  return {
    listings: listingsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    ordersAsSeller: ordersAsSellerSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    ordersAsBuyer: ordersAsBuyerSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    withdrawals: withdrawalsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

/**
 * Returns everything Reloop's servers hold about the caller: their listings,
 * every order they're party to (as buyer or seller), and their withdrawal
 * history. Combined client-side with the local IndexedDB export for the
 * "download my data" button — this is the server half of that.
 */
exports.exportMyData = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");
  return gatherUserData(uid);
});

/**
 * Permanently deletes the caller's account and everything Reloop's servers
 * hold about them:
 * - every listing they own, and its Storage photos
 * - their withdrawal records and rate-limit tracking doc
 * - the Firebase Auth account itself
 *
 * Orders are the one exception to outright deletion: an order is a shared
 * record between a buyer and a seller, and deleting it out from under the
 * *other* party would corrupt their own transaction history and trust
 * counts. Instead, the deleted user's name on any order they're part of is
 * replaced with a generic placeholder — the record (and the other party's
 * history) survives, but nothing personally identifying does.
 */
exports.deleteMyAccount = onCall({ timeoutSeconds: 120 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");

  const { listings, ordersAsSeller, ordersAsBuyer } = await gatherUserData(uid);

  // Delete owned listings.
  const listingsBatch = db.batch();
  listings.forEach((l) => listingsBatch.delete(db.collection("listings").doc(l.id)));
  await listingsBatch.commit();

  // Anonymize (don't delete) orders — the other party's record must survive.
  const ordersBatch = db.batch();
  ordersAsSeller.forEach((o) =>
    ordersBatch.update(db.collection("orders").doc(o.id), { sellerName: "Deleted user" })
  );
  ordersAsBuyer.forEach((o) =>
    ordersBatch.update(db.collection("orders").doc(o.id), { buyerName: "Deleted user" })
  );
  if (ordersAsSeller.length || ordersAsBuyer.length) await ordersBatch.commit();

  // Delete withdrawal records, the rate-limit tracking doc, and the cached
  // Stripe Connect status doc. This does NOT delete the underlying Stripe
  // Connect account itself — Stripe advises against deleting accounts with
  // real transaction/payout history, so the account persists on Stripe's
  // side even though Reloop no longer references it anywhere.
  const withdrawalsSnap = await db.collection("withdrawals").where("uid", "==", uid).get();
  const cleanupBatch = db.batch();
  withdrawalsSnap.docs.forEach((d) => cleanupBatch.delete(d.ref));
  cleanupBatch.delete(db.collection("rateLimits").doc(uid));
  cleanupBatch.delete(db.collection("users").doc(uid));
  await cleanupBatch.commit();

  // Best-effort delete of their listing photos in Storage.
  try {
    const bucket = getStorage().bucket();
    await bucket.deleteFiles({ prefix: `listings/${uid}/` });
  } catch (err) {
    console.error("Storage cleanup failed during account deletion:", err);
  }

  // Finally, delete the actual Auth account.
  await getAuth().deleteUser(uid);

  return { deleted: true };
});

// Stripe Connect seller onboarding — see stripeConnect.js
const stripeConnect = require("./stripeConnect");
exports.createStripeConnectLink = stripeConnect.createStripeConnectLink;
exports.getStripeAccountStatus = stripeConnect.getStripeAccountStatus;
exports.stripeWebhook = stripeConnect.stripeWebhook;

// Buyer checkout — see checkout.js
const checkout = require("./checkout");
exports.createPaymentIntent = checkout.createPaymentIntent;

// Pickup address verification — see address.js
const address = require("./address");
exports.verifyAddress = address.verifyAddress;

// Shipment submission + verification (real carrier check via AfterShip — see submitShipment.js)
const submitShipment = require("./submitShipment");
exports.submitShipment = submitShipment.submitShipment;

// Seller wallet — reads the real Stripe Connect balance
const getSellerBalance = require("./getSellerBalance");
exports.getSellerBalance = getSellerBalance.getSellerBalance;

// Multi-item cart checkout — see cartCheckout.js
const cartCheckout = require("./cartCheckout");
exports.createCartPaymentIntent = cartCheckout.createCartPaymentIntent;

// Order cancellation with a real Stripe refund — see cancelOrder.js
const cancelOrderFn = require("./cancelOrder");
exports.cancelOrder = cancelOrderFn.cancelOrder;
