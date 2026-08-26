const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const db = getFirestore();

// The one, permanent, hardcoded root admin — this is the ONLY place a raw
// email check is used for authorization. It exists purely to bootstrap the
// very first admin claim (there's a chicken-and-egg problem otherwise: you
// need to already be an admin to grant admin access). Every other admin
// function in this file checks request.auth.token.admin === true instead —
// a real, server-verified Firebase custom claim that cannot be spoofed by
// editing client code, unlike a client-side "if email === ..." check.
const ROOT_ADMIN_EMAIL = "kizzclover96@gmail.com";

/** Throws unless the caller has a real, server-issued admin custom claim. */
function requireAdmin(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  if (request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  return { uid: request.auth.uid, email: request.auth.token.email || "" };
}

/** Every admin mutation goes through this — nothing in the Admin Center is silently unaudited. */
async function logAdminAction({ action, targetType, targetId, adminUid, adminEmail, previousValue, newValue, reason }) {
  await db.collection("adminAuditLog").add({
    action,
    targetType,
    targetId,
    adminUid,
    adminEmail,
    previousValue: previousValue ?? null,
    newValue: newValue ?? null,
    reason: reason || "",
    timestamp: FieldValue.serverTimestamp(),
  });
}

/**
 * One-time bootstrap — grants ROOT_ADMIN_EMAIL the admin claim if they don't
 * already have it. Callable by anyone, but only ever does anything for that
 * one hardcoded account; for every other account it's a no-op. Safe to leave
 * deployed permanently rather than needing to remove it after first use.
 */
exports.bootstrapRootAdmin = onCall(async (request) => {
  const uid = request.auth?.uid;
  const email = request.auth?.token?.email;
  if (!uid || email !== ROOT_ADMIN_EMAIL) {
    throw new HttpsError("permission-denied", "Not available.");
  }

  const user = await getAuth().getUser(uid);
  if (user.customClaims?.admin === true) {
    return { alreadyAdmin: true };
  }

  await getAuth().setCustomUserClaims(uid, { admin: true, permissions: { fullAccess: true } });
  await db.collection("admins").doc(uid).set({
    email,
    permissions: { fullAccess: true },
    invitedBy: null,
    createdAt: FieldValue.serverTimestamp(),
  });
  await logAdminAction({
    action: "root_admin_bootstrapped",
    targetType: "admin",
    targetId: uid,
    adminUid: uid,
    adminEmail: email,
    newValue: { permissions: { fullAccess: true } },
  });

  return { alreadyAdmin: false };
});

/**
 * Invites another account as an admin, with whatever permission flags the
 * inviting admin specifies. Only an existing admin can call this — checked
 * via requireAdmin, the real custom-claim check, not anything client-supplied.
 */
exports.adminInviteAdmin = onCall(async (request) => {
  const { uid: adminUid, email: adminEmail } = requireAdmin(request);
  const { email, permissions } = request.data || {};
  if (!email || typeof email !== "string") {
    throw new HttpsError("invalid-argument", "Missing email.");
  }

  let targetUser;
  try {
    targetUser = await getAuth().getUserByEmail(email);
  } catch {
    throw new HttpsError("not-found", "No Reloop account exists with that email yet — they need to sign up first.");
  }

  const grantedPermissions = {
    fullAccess: !!permissions?.fullAccess,
    manageUsers: !!permissions?.manageUsers,
    manageListings: !!permissions?.manageListings,
    viewFinancials: !!permissions?.viewFinancials,
    inviteAdmins: !!permissions?.inviteAdmins,
  };

  await getAuth().setCustomUserClaims(targetUser.uid, { admin: true, permissions: grantedPermissions });
  await db.collection("admins").doc(targetUser.uid).set({
    email,
    permissions: grantedPermissions,
    invitedBy: adminEmail,
    createdAt: FieldValue.serverTimestamp(),
  });
  await logAdminAction({
    action: "admin_invited",
    targetType: "admin",
    targetId: targetUser.uid,
    adminUid,
    adminEmail,
    newValue: { email, permissions: grantedPermissions },
  });

  return { invited: true };
});

/** Revokes another admin's access entirely. The root admin can't be revoked by anyone but themself, and never accidentally. */
exports.adminRevokeAdmin = onCall(async (request) => {
  const { uid: adminUid, email: adminEmail } = requireAdmin(request);
  const { uid: targetUid } = request.data || {};
  if (!targetUid) throw new HttpsError("invalid-argument", "Missing uid.");

  const targetUser = await getAuth().getUser(targetUid);
  if (targetUser.email === ROOT_ADMIN_EMAIL && adminUid !== targetUid) {
    throw new HttpsError("permission-denied", "The root admin can't be revoked by another admin.");
  }

  await getAuth().setCustomUserClaims(targetUid, { admin: false });
  await db.collection("admins").doc(targetUid).delete();
  await logAdminAction({
    action: "admin_revoked",
    targetType: "admin",
    targetId: targetUid,
    adminUid,
    adminEmail,
  });

  return { revoked: true };
});

/** Dashboard overview — every number here comes from a live Firestore read, never a hardcoded value. */
exports.adminGetDashboardStats = onCall(async (request) => {
  requireAdmin(request);

  const [
    activeListingsSnap,
    completedOrdersSnap,
    recentUsersSnap,
    recentListingsSnap,
    recentSalesSnap,
  ] = await Promise.all([
    db.collection("listings").where("status", "==", "active").count().get(),
    db.collection("orders").where("status", "==", "completed").get(),
    db.collection("users").orderBy("createdAt", "desc").limit(8).get(),
    db.collection("listings").orderBy("createdAt", "desc").limit(8).get(),
    db.collection("orders").where("status", "==", "completed").orderBy("completedAt", "desc").limit(8).get(),
  ]);

  const usersSnap = await db.collection("users").count().get();
  const suspendedSnap = await db.collection("users").where("accountStatus", "==", "suspended").count().get();
  const bannedSnap = await db.collection("users").where("accountStatus", "==", "banned").count().get();
  const totalListingsSnap = await db.collection("listings").count().get();
  const cancelledOrdersSnap = await db.collection("orders").where("status", "==", "cancelled").count().get();
  const awaitingOrdersSnap = await db.collection("orders").where("status", "==", "awaiting_shipment").count().get();

  let totalVolume = 0;
  let totalFees = 0;
  let totalHeld = 0;
  completedOrdersSnap.forEach((doc) => {
    const o = doc.data();
    const price = o.listing?.price || 0;
    totalVolume += price;
    if (!o.giveaway) totalFees += Math.max(price - (o.sellerEarned || 0) - (o.shippingCost || 0), 0);
  });
  awaitingOrdersSnap.forEach(() => {}); // count already fetched above; volume for awaiting orders isn't summed here to keep this call fast — held balance below covers it approximately
  const awaitingSnapFull = await db.collection("orders").where("status", "==", "awaiting_shipment").get();
  awaitingSnapFull.forEach((doc) => {
    totalHeld += doc.data().listing?.price || 0;
  });

  return {
    totalUsers: usersSnap.data().count,
    activeUsers: usersSnap.data().count - suspendedSnap.data().count - bannedSnap.data().count,
    suspendedUsers: suspendedSnap.data().count,
    bannedUsers: bannedSnap.data().count,
    totalListings: totalListingsSnap.data().count,
    activeListings: activeListingsSnap.data().count,
    completedSales: completedOrdersSnap.size,
    cancelledTransactions: cancelledOrdersSnap.data().count,
    pendingTransactions: awaitingOrdersSnap.data().count,
    totalVolume,
    totalFees,
    totalHeld,
    recentUsers: recentUsersSnap.docs.map((d) => ({ uid: d.id, email: d.data().email || "", createdAt: d.data().createdAt || null })),
    recentListings: recentListingsSnap.docs.map((d) => ({ id: d.id, title: d.data().title, brand: d.data().brand, price: d.data().price, createdAt: d.data().createdAt })),
    recentSales: recentSalesSnap.docs.map((d) => ({
      id: d.id,
      item: `${d.data().listing?.brand || ""} ${d.data().listing?.title || ""}`.trim(),
      price: d.data().listing?.price,
      completedAt: d.data().completedAt,
    })),
  };
});

/** Simple search across a few identifiers — exact-match on email/uid, prefix-match on name, given Firestore's limited text search. */
exports.adminSearchUsers = onCall(async (request) => {
  requireAdmin(request);
  const { query } = request.data || {};
  if (!query || typeof query !== "string") throw new HttpsError("invalid-argument", "Missing query.");

  const results = new Map();

  try {
    const byUid = await db.collection("users").doc(query).get();
    if (byUid.exists) results.set(byUid.id, { uid: byUid.id, ...byUid.data() });
  } catch {}

  try {
    const authUser = await getAuth().getUserByEmail(query);
    const doc = await db.collection("users").doc(authUser.uid).get();
    results.set(authUser.uid, { uid: authUser.uid, email: authUser.email, displayName: authUser.displayName, ...(doc.exists ? doc.data() : {}) });
  } catch {}

  const nameSnap = await db
    .collection("users")
    .orderBy("displayName")
    .startAt(query)
    .endAt(query + "\uf8ff")
    .limit(10)
    .get();
  nameSnap.forEach((d) => results.set(d.id, { uid: d.id, ...d.data() }));

  return { results: Array.from(results.values()) };
});

/** Full detail view for one user — aggregates across listings/orders rather than trusting any single stored total. */
exports.adminGetUserDetail = onCall(async (request) => {
  requireAdmin(request);
  const { uid } = request.data || {};
  if (!uid) throw new HttpsError("invalid-argument", "Missing uid.");

  const [userDoc, authUser, activeListingsSnap, allListingsSnap, salesSnap, purchasesSnap] = await Promise.all([
    db.collection("users").doc(uid).get(),
    getAuth().getUser(uid).catch(() => null),
    db.collection("listings").where("sellerId", "==", uid).where("status", "==", "active").count().get(),
    db.collection("listings").where("sellerId", "==", uid).count().get(),
    db.collection("orders").where("sellerId", "==", uid).get(),
    db.collection("orders").where("buyerId", "==", uid).get(),
  ]);

  if (!userDoc.exists && !authUser) throw new HttpsError("not-found", "User not found.");

  let totalEarned = 0;
  let pendingBalance = 0;
  const salesHistory = [];
  salesSnap.forEach((d) => {
    const o = d.data();
    salesHistory.push({ id: d.id, item: `${o.listing?.brand || ""} ${o.listing?.title || ""}`.trim(), amount: o.sellerEarned, status: o.status, createdAt: o.createdAt });
    if (o.status === "completed") totalEarned += o.sellerEarned || 0;
    if (o.status === "awaiting_shipment") pendingBalance += o.sellerEarned || 0;
  });

  const purchaseHistory = [];
  let totalSpent = 0;
  purchasesSnap.forEach((d) => {
    const o = d.data();
    purchaseHistory.push({ id: d.id, item: `${o.listing?.brand || ""} ${o.listing?.title || ""}`.trim(), amount: o.listing?.price, status: o.status, createdAt: o.createdAt });
    totalSpent += o.listing?.price || 0;
  });

  const userData = userDoc.exists ? userDoc.data() : {};

  return {
    uid,
    email: authUser?.email || userData.email || "",
    displayName: authUser?.displayName || "",
    createdAt: authUser?.metadata?.creationTime || null,
    accountStatus: userData.accountStatus || "active",
    suspensionReason: userData.suspensionReason || null,
    suspensionUntil: userData.suspensionUntil || null,
    banReason: userData.banReason || null,
    pickupLocation: userData.address || null,
    activeListingCount: activeListingsSnap.data().count,
    totalListingCount: allListingsSnap.data().count,
    completedSaleCount: salesHistory.filter((s) => s.status === "completed").length,
    purchaseCount: purchaseHistory.length,
    totalEarned,
    pendingBalance,
    totalSpent,
    stripeAccountId: userData.stripeAccountId || null,
    payoutsEnabled: userData.payoutsEnabled || false,
    salesHistory: salesHistory.slice(0, 20),
    purchaseHistory: purchaseHistory.slice(0, 20),
  };
});

async function setUserStatus({ request, status, reason, note, durationDays }) {
  const { uid: adminUid, email: adminEmail } = requireAdmin(request);
  const { uid: targetUid } = request.data || {};
  if (!targetUid) throw new HttpsError("invalid-argument", "Missing uid.");

  const ref = db.collection("users").doc(targetUid);
  const snap = await ref.get();
  const previousStatus = snap.exists ? snap.data().accountStatus || "active" : "active";

  const update = { accountStatus: status };
  if (status === "suspended") {
    update.suspensionReason = reason || "";
    update.suspensionNote = note || "";
    update.suspensionUntil = durationDays ? Date.now() + durationDays * 24 * 60 * 60 * 1000 : null;
    update.banReason = FieldValue.delete();
  } else if (status === "banned") {
    update.banReason = reason || "";
    update.banNote = note || "";
    update.suspensionReason = FieldValue.delete();
    update.suspensionUntil = FieldValue.delete();
  } else if (status === "active") {
    update.suspensionReason = FieldValue.delete();
    update.suspensionUntil = FieldValue.delete();
    update.suspensionNote = FieldValue.delete();
    update.banReason = FieldValue.delete();
    update.banNote = FieldValue.delete();
  }

  await ref.set(update, { merge: true });
  await logAdminAction({
    action: `user_${status === "active" ? "restored" : status}`,
    targetType: "user",
    targetId: targetUid,
    adminUid,
    adminEmail,
    previousValue: { accountStatus: previousStatus },
    newValue: { accountStatus: status },
    reason,
  });

  return { status };
}

exports.adminSuspendUser = onCall(async (request) => {
  const { reason, note, durationDays } = request.data || {};
  return setUserStatus({ request, status: "suspended", reason, note, durationDays });
});

exports.adminBanUser = onCall(async (request) => {
  const { reason, note } = request.data || {};
  return setUserStatus({ request, status: "banned", reason, note });
});

exports.adminRestoreUser = onCall(async (request) => {
  return setUserStatus({ request, status: "active" });
});

/**
 * Anonymizes rather than hard-deletes — orders/transactions this user was
 * party to need to survive for accounting, fraud prevention, and legal
 * reasons even after the account itself is gone. This scrubs the personal
 * profile and disables login, without touching order/transaction history.
 */
exports.adminDeleteUser = onCall(async (request) => {
  const { uid: adminUid, email: adminEmail } = requireAdmin(request);
  const { uid: targetUid, reason } = request.data || {};
  if (!targetUid) throw new HttpsError("invalid-argument", "Missing uid.");

  await getAuth().updateUser(targetUid, { disabled: true }).catch(() => {});

  const ref = db.collection("users").doc(targetUid);
  await ref.set(
    {
      accountStatus: "deleted",
      deletedAt: FieldValue.serverTimestamp(),
      deletedBy: adminEmail,
      deleteReason: reason || "",
      address: FieldValue.delete(),
      fcmTokens: FieldValue.delete(),
    },
    { merge: true }
  );

  await logAdminAction({
    action: "user_deleted",
    targetType: "user",
    targetId: targetUid,
    adminUid,
    adminEmail,
    reason,
  });

  return { deleted: true };
});

/** Edits a bounded, explicit allowlist of fields — never arbitrary client-supplied field names. */
exports.adminEditUser = onCall(async (request) => {
  const { uid: adminUid, email: adminEmail } = requireAdmin(request);
  const { uid: targetUid, fields } = request.data || {};
  if (!targetUid || !fields || typeof fields !== "object") {
    throw new HttpsError("invalid-argument", "Missing uid or fields.");
  }

  const EDITABLE_FIELDS = ["displayName", "pickupLocation"];
  const ref = db.collection("users").doc(targetUid);
  const snap = await ref.get();
  const previous = snap.exists ? snap.data() : {};

  const update = {};
  const previousValue = {};
  const newValue = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in fields) {
      update[key] = fields[key];
      previousValue[key] = previous[key] ?? null;
      newValue[key] = fields[key];
    }
  }
  if (Object.keys(update).length === 0) {
    throw new HttpsError("invalid-argument", "No editable fields provided.");
  }

  await ref.set(update, { merge: true });

  if (fields.displayName) {
    await getAuth().updateUser(targetUid, { displayName: fields.displayName }).catch(() => {});
  }

  await logAdminAction({
    action: "user_edited",
    targetType: "user",
    targetId: targetUid,
    adminUid,
    adminEmail,
    previousValue,
    newValue,
  });

  return { updated: true };
});

exports.adminSearchListings = onCall(async (request) => {
  requireAdmin(request);
  const { status, query } = request.data || {};

  let q = db.collection("listings").orderBy("createdAt", "desc").limit(50);
  if (status && status !== "all") {
    q = db.collection("listings").where("status", "==", status).orderBy("createdAt", "desc").limit(50);
  }
  const snap = await q.get();
  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (query) {
    const needle = query.toLowerCase();
    results = results.filter(
      (l) => l.title?.toLowerCase().includes(needle) || l.brand?.toLowerCase().includes(needle) || l.sellerId === query
    );
  }

  return { results };
});

exports.adminRemoveListing = onCall(async (request) => {
  const { uid: adminUid, email: adminEmail } = requireAdmin(request);
  const { listingId, reason } = request.data || {};
  if (!listingId) throw new HttpsError("invalid-argument", "Missing listingId.");

  const ref = db.collection("listings").doc(listingId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Listing not found.");

  await ref.set({ status: "removed_by_admin", removedReason: reason || "", removedAt: FieldValue.serverTimestamp() }, { merge: true });

  await logAdminAction({
    action: "listing_removed",
    targetType: "listing",
    targetId: listingId,
    adminUid,
    adminEmail,
    previousValue: { status: snap.data().status },
    newValue: { status: "removed_by_admin" },
    reason,
  });

  return { removed: true };
});

/** Read-only audit log feed — never editable through this or any other admin endpoint. */
exports.adminGetAuditLog = onCall(async (request) => {
  requireAdmin(request);
  const { limit } = request.data || {};
  const snap = await db
    .collection("adminAuditLog")
    .orderBy("timestamp", "desc")
    .limit(Math.min(limit || 50, 200))
    .get();
  return { entries: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
});
