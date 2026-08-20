import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

export interface ServerAccountData {
  listings: unknown[];
  ordersAsSeller: unknown[];
  ordersAsBuyer: unknown[];
  withdrawals: unknown[];
}

/** Everything Reloop's servers hold about the signed-in user. */
export async function exportServerData(): Promise<ServerAccountData> {
  const call = httpsCallable<void, ServerAccountData>(functions, "exportMyData");
  const result = await call();
  return result.data;
}

/**
 * Permanently deletes the signed-in user's account: their listings, storage
 * photos, withdrawals, and the Auth account itself. Orders they're part of
 * are anonymized rather than deleted, since the other party's record needs
 * to survive. This cannot be undone.
 */
export async function deleteServerAccount(): Promise<void> {
  const call = httpsCallable(functions, "deleteMyAccount");
  await call();
}
