import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions, auth } from "../firebase";

/**
 * Admin status is read from the Firebase ID token's custom claims — the
 * same server-issued claim every admin Cloud Function checks — never from
 * a Firestore field a client could theoretically read and mistake for
 * authorization. Claims are cached in the token for up to an hour, so this
 * force-refreshes once on mount to catch a claim granted moments ago (e.g.
 * right after bootstrapping).
 */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        if (!cancelled) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }
      try {
        const result = await user.getIdTokenResult(true);
        if (!cancelled) setIsAdmin(result.claims.admin === true);
      } catch {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return { isAdmin, loading };
}

export async function bootstrapRootAdmin() {
  const call = httpsCallable(functions, "bootstrapRootAdmin");
  const result = await call();
  await auth.currentUser?.getIdToken(true); // force the new claim to actually load
  return result.data as { alreadyAdmin: boolean };
}

export async function adminInviteAdmin(email: string, permissions: Record<string, boolean>) {
  const call = httpsCallable(functions, "adminInviteAdmin");
  await call({ email, permissions });
}

export async function adminRevokeAdmin(uid: string) {
  const call = httpsCallable(functions, "adminRevokeAdmin");
  await call({ uid });
}

export async function adminGetDashboardStats() {
  const call = httpsCallable(functions, "adminGetDashboardStats");
  const result = await call();
  return result.data as any;
}

export async function adminSearchUsers(query: string) {
  const call = httpsCallable(functions, "adminSearchUsers");
  const result = await call({ query });
  return (result.data as any).results as any[];
}

export async function adminGetUserDetail(uid: string) {
  const call = httpsCallable(functions, "adminGetUserDetail");
  const result = await call({ uid });
  return result.data as any;
}

export async function adminSuspendUser(uid: string, reason: string, note: string, durationDays?: number) {
  const call = httpsCallable(functions, "adminSuspendUser");
  await call({ uid, reason, note, durationDays });
}

export async function adminBanUser(uid: string, reason: string, note: string) {
  const call = httpsCallable(functions, "adminBanUser");
  await call({ uid, reason, note });
}

export async function adminRestoreUser(uid: string) {
  const call = httpsCallable(functions, "adminRestoreUser");
  await call({ uid });
}

export async function adminDeleteUser(uid: string, reason: string) {
  const call = httpsCallable(functions, "adminDeleteUser");
  await call({ uid, reason });
}

export async function adminEditUser(uid: string, fields: Record<string, any>) {
  const call = httpsCallable(functions, "adminEditUser");
  await call({ uid, fields });
}

export async function adminSearchListings(status: string, query: string) {
  const call = httpsCallable(functions, "adminSearchListings");
  const result = await call({ status, query });
  return (result.data as any).results as any[];
}

export async function adminRemoveListing(listingId: string, reason: string) {
  const call = httpsCallable(functions, "adminRemoveListing");
  await call({ listingId, reason });
}

export async function adminGetAuditLog(limit = 50) {
  const call = httpsCallable(functions, "adminGetAuditLog");
  const result = await call({ limit });
  return (result.data as any).entries as any[];
}
