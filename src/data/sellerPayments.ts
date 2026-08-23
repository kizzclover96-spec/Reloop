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

import { Capacitor } from "@capacitor/core";

/**
 * On the web, window.location.origin is the real page origin and works
 * fine as the base for Stripe's return_url/refresh_url. On native,
 * window.location.origin resolves to Capacitor's internal "https://localhost"
 * placeholder — it passes the server's /^https?:\/\// check, so link
 * creation doesn't fail outright, but it isn't a real address anything can
 * actually redirect to. Since native onboarding is handled via an in-app
 * browser tab (see ProfileScreen.tsx) rather than by following a redirect
 * back into the app, the exact return_url content doesn't need to route
 * anywhere special — it just needs to be a real, valid HTTPS URL.
 */
function connectOrigin(): string {
  return Capacitor.isNativePlatform() ? "https://reloop-72656.web.app" : window.location.origin;
}

/** Creates (or reuses) a Stripe Connect account and returns a fresh onboarding link URL. */
export async function getStripeOnboardingUrl(): Promise<string> {
  const call = httpsCallable<{ origin: string }, { url: string }>(functions, "createStripeConnectLink");
  const result = await call({ origin: connectOrigin() });
  return result.data.url;
}

/** Forces a fresh status pull straight from Stripe (used right after returning from onboarding). */
export async function refreshStripeStatus(): Promise<SellerPaymentStatus> {
  const call = httpsCallable<void, SellerPaymentStatus>(functions, "getStripeAccountStatus");
  const result = await call();
  return result.data;
}
