import { useEffect, useState } from "react";
import { collection, addDoc, onSnapshot, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import type { Order } from "./orders";

export interface Withdrawal {
  id: string;
  uid: string;
  amount: number;
  createdAt: number;
}

export interface Transaction {
  id: string;
  label: string;
  amount: number; // positive = money in, negative = money out
  date: number;
}

export interface LiveBalance {
  connected: boolean;
  available: number;
  pending: number;
}

const withdrawalsRef = collection(db, "withdrawals");

export function useWithdrawals(uid: string | undefined) {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  useEffect(() => {
    if (!uid) {
      setWithdrawals([]);
      return;
    }
    const q = query(withdrawalsRef, where("uid", "==", uid));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Withdrawal, "id">) }));
      docs.sort((a, b) => b.createdAt - a.createdAt);
      setWithdrawals(docs);
    });
    return unsub;
  }, [uid]);

  return withdrawals;
}

export async function requestWithdrawal(uid: string, amount: number) {
  await addDoc(withdrawalsRef, { uid, amount, createdAt: Date.now() });
}

/**
 * The wallet's headline available/pending numbers, read live from Stripe's
 * own balance API for the seller's connected account — not computed by
 * Reloop. This is deliberately not a Firestore listener (Stripe balance
 * isn't in Firestore); it's a manual fetch-on-mount plus an explicit
 * refresh, since polling a paid API call on a timer isn't worth the cost
 * for a number that only changes when a transfer or payout actually happens.
 */
export function useLiveSellerBalance(uid: string | undefined) {
  const [balance, setBalance] = useState<LiveBalance>({ connected: false, available: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!uid) {
      setBalance({ connected: false, available: 0, pending: 0 });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const call = httpsCallable<void, LiveBalance>(functions, "getSellerBalance");
      const result = await call();
      setBalance(result.data);
    } catch {
      // leave the previous value in place rather than flashing to zero on a transient error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  return { balance, loading, refresh };
}

/**
 * Transaction history log, from real order/withdrawal data — still useful
 * as a record even though the headline available/pending numbers now come
 * from Stripe directly (useLiveSellerBalance) rather than from this.
 */
export function computeTransactionHistory(sellerOrders: Order[], withdrawals: Withdrawal[]): Transaction[] {
  const earnedFor = (o: Order) => o.sellerEarned ?? o.listing.price;

  return [
    ...sellerOrders
      .filter((o) => o.status === "completed")
      .map((o) => ({
        id: `sale-${o.id}`,
        label: `${o.listing.brand} ${o.listing.title}`.trim(),
        amount: earnedFor(o),
        date: o.completedAt ?? o.createdAt,
      })),
    ...withdrawals.map((w) => ({
      id: `withdrawal-${w.id}`,
      label: "Withdrawal to bank",
      amount: -w.amount,
      date: w.createdAt,
    })),
  ].sort((a, b) => b.date - a.date);
}
