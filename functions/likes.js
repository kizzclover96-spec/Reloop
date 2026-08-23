const { onDocumentCreated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();

/**
 * Likes are tracked as individual docs at likes/{uid}_{listingId} (see
 * firestore.rules — a client can only ever create/delete their own, never
 * anyone else's, and never write a likeCount value directly). These
 * triggers are what actually turn that into the number shown on screen:
 * each create/delete atomically increments/decrements listings/{listingId}
 * .likeCount via the Admin SDK. A client sending an arbitrary likeCount
 * value would do nothing — the field is never accepted from client writes
 * at all (firestore.rules denies updates to /listings that touch it —
 * see the listings match block).
 */
exports.onLikeCreated = onDocumentCreated("likes/{likeId}", async (event) => {
  const { listingId } = event.data.data();
  if (!listingId) return;
  await db
    .collection("listings")
    .doc(listingId)
    .update({ likeCount: FieldValue.increment(1) })
    .catch(() => {
      // Listing may have been deleted (sold) between the like being created
      // and this trigger running — nothing to increment on, safe to ignore.
    });
});

exports.onLikeDeleted = onDocumentDeleted("likes/{likeId}", async (event) => {
  const { listingId } = event.data.data();
  if (!listingId) return;
  await db
    .collection("listings")
    .doc(listingId)
    .update({ likeCount: FieldValue.increment(-1) })
    .catch(() => {});
});
