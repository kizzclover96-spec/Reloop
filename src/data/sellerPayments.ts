import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";

export interface SellerPaymentStatus {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

const EMPTY_STATUS: SellerPaymentStatus = {
  connected: false,
  chargesEnabled: false,
  payoutsEnabled: false,
  detailsSubmitted: false,
};

/** Live-updating Stripe Connect status for the given seller, straight from Firestore. */
export function useSellerPaymentStatus(uid: string | undefined) {
  const [status, setStatus] = useState<SellerPaymentStatus>(EMPTY_STATUS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setStatus(EMPTY_STATUS);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        const data = snap.data();
        setStatus(
          data
            ? {
                connected: Boolean(data.stripeAccountId),
                chargesEnabled: Boolean(data.chargesEnabled),
                payoutsEnabled: Boolean(data.payoutsEnabled),
                detailsSubmitted: Boolean(data.detailsSubmitted),
              }
            : EMPTY_STATUS
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [uid]);

  return { status, loading };
}

/** Creates (or reuses) a Stripe Connect account and returns a fresh onboarding link URL. */
export async function getStripeOnboardingUrl(): Promise<string> {
  const call = httpsCallable<{ origin: string }, { url: string }>(functions, "createStripeConnectLink");
  const result = await call({ origin: window.location.origin });
  return result.data.url;
}

/** Forces a fresh status pull straight from Stripe (used right after returning from onboarding). */
export async function refreshStripeStatus(): Promise<SellerPaymentStatus> {
  const call = httpsCallable<void, SellerPaymentStatus>(functions, "getStripeAccountStatus");
  const result = await call();
  return result.data;
}
