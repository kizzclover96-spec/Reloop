import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, where, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";

export type OrderStatus = "awaiting_shipment" | "completed" | "cancelled";
export type PackageSize = "small" | "medium" | "large";

export interface ListingSnapshot {
  brand: string;
  title: string;
  image: string;
  price: number; // what the buyer paid, including shipping
}

export interface OrderShippingAddress {
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface Order {
  id: string;
  listingId: string;
  listing: ListingSnapshot;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  status: OrderStatus;
  createdAt: number;
  /** Business-hours deadline (weekends don't count) the seller has to ship by. */
  shipByAt?: number;
  completedAt: number | null;
  paymentStatus?: "paid";
  paymentIntentId?: string;
  giveaway?: boolean;
  packageSize?: PackageSize;
  shippingCost?: number;
  /** What the seller receives once shipment is verified — 0 for giveaways, never includes shipping. */
  sellerEarned?: number;
  platformFee?: number;
  /** Snapshotted at purchase time — the buyer's address as it was then, not a live reference. */
  shippingAddress?: OrderShippingAddress | null;
  carrier?: string;
  trackingNumber?: string;
  shipmentVerifiedAt?: number;
  transferId?: string;
}

const ordersRef = collection(db, "orders");

/**
 * Creates a Stripe PaymentIntent for a listing — paid or giveaway, both go
 * through this now. Throws a coded error (e.g. "SELLER_NOT_READY") if the
 * seller isn't ready to accept payment. The listing only gets marked sold
 * once Stripe confirms payment, via the webhook — never directly from the
 * client.
 */
export async function createCheckoutIntent(listingId: string, buyerName: string): Promise<string> {
  const call = httpsCallable<{ listingId: string; buyerName: string }, { clientSecret: string }>(
    functions,
    "createPaymentIntent"
  );
  const result = await call({ listingId, buyerName });
  return result.data.clientSecret;
}

/**
 * Seller submits a tracking number for an order. If (stub-)verified, this
 * is also the moment their cut actually leaves Reloop's platform Stripe
 * balance — see functions/submitShipment.js for the real mechanics and its
 * honest disclosure that carrier verification isn't wired up to a real API yet.
 */
export async function submitShipment(orderId: string, carrier: string, trackingNumber: string) {
  const call = httpsCallable(functions, "submitShipment");
  await call({ orderId, carrier, trackingNumber });
}

/** A client can only ever cancel an order awaiting shipment — firestore.rules enforces this too. */
export async function cancelOrder(orderId: string) {
  await updateDoc(doc(ordersRef, orderId), { status: "cancelled" });
}

function useOrderQuery(field: "buyerId" | "sellerId", uid: string | undefined) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!uid) {
      setOrders([]);
      return;
    }
    const q = query(ordersRef, where(field, "==", uid));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, "id">) }));
      docs.sort((a, b) => b.createdAt - a.createdAt);
      setOrders(docs);
    });
    return unsub;
  }, [field, uid]);

  return orders;
}

/** Every order where the user is the buyer, and every order where they're the seller. */
export function useUserOrders(uid: string | undefined) {
  const asBuyer = useOrderQuery("buyerId", uid);
  const asSeller = useOrderQuery("sellerId", uid);
  return { asBuyer, asSeller };
}
