import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

/** Creates a single PaymentIntent covering every listing in the cart. Throws a coded error (e.g. "SELLER_NOT_READY:<id>") if any seller isn't ready. */
export async function createCartCheckoutIntent(listingIds: string[], buyerName: string): Promise<string> {
  const call = httpsCallable<{ listingIds: string[]; buyerName: string }, { clientSecret: string }>(
    functions,
    "createCartPaymentIntent"
  );
  const result = await call({ listingIds, buyerName });
  return result.data.clientSecret;
}
