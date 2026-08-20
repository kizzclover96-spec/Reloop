import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit, updateDoc, doc } from "firebase/firestore";
import { db, storage, functions } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { SEED_LISTINGS, type ListingData } from "./products";
import { compressImage } from "../utils/image";

export const MAX_PHOTOS_PER_LISTING = 5;
export const MAX_ACTIVE_LISTINGS_PER_USER = 25;

export interface Listing extends ListingData {
  id: string;
  sellerId: string;
  status: "active" | "sold";
  createdAt: number;
}

const listingsRef = collection(db, "listings");

/** Realtime subscription to every listing, newest first. */
// Bounds how much data every client pulls down on every load. Without this,
// Home/Discover/Favourites all subscribe to the *entire* listings collection
// forever — fine at a handful of listings, a real problem once there are
// thousands. 300 most-recent is generous for a hyper-local marketplace and
// keeps the initial load fast regardless of total listing count.
const LISTINGS_QUERY_LIMIT = 300;

export function useListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(listingsRef, orderBy("createdAt", "desc"), limit(LISTINGS_QUERY_LIMIT));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setListings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Listing, "id">) })));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return { listings, loading, error };
}

/** Derives a user's own listings from an already-fetched list — no extra query/index needed. */
export function useUserListings(listings: Listing[], sellerId: string | undefined, status: "active" | "sold") {
  if (!sellerId) return [];
  return listings.filter((l) => l.sellerId === sellerId && l.status === status);
}

/** A fresh Firestore id, generated client-side, used to tie a draft listing's
 *  photos (in Storage) to the listing doc they'll end up attached to. */
export function newListingId(): string {
  return doc(listingsRef).id;
}

/**
 * Creates a listing via the createListing Cloud Function rather than writing
 * to Firestore directly — that's where the active-listing limit and photo
 * count are actually enforced against the real current count.
 */
export async function createListing(
  id: string,
  data: Omit<ListingData, "seller"> & { description?: string },
  sellerId: string,
  seller: { name: string; rating: number; reviews: number }
) {
  const call = httpsCallable(functions, "createListing");
  try {
    await call({ id, data, seller });
  } catch (err: any) {
    throw new Error(err?.message || "Couldn't save your listing. Try again.");
  }
}

/**
 * Compresses an image client-side (resized + re-encoded, target ~1.5MB) before
 * uploading it under listings/{uid}/{listingId}/ — Storage rules enforce a hard
 * 2MB/JPEG-or-WebP cap and forbid overwriting an existing file at that path.
 */
export async function uploadListingPhoto(uid: string, listingId: string, file: File): Promise<string> {
  const { blob } = await compressImage(file, { maxDimension: 1600, maxBytes: 1.5 * 1024 * 1024 });
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `listings/${uid}/${listingId}/${Date.now()}.${ext}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob, { contentType: blob.type });
  return getDownloadURL(fileRef);
}

export async function markListingSold(id: string) {
  await updateDoc(doc(db, "listings", id), { status: "sold" });
}

/** One-time helper: pushes the sample catalog in as real listings, tagged to the given seller. */
export async function seedListingsIfEmpty(sellerId: string, sellerName: string) {
  const call = httpsCallable<{ items: typeof SEED_LISTINGS }, { seeded: boolean }>(functions, "seedListings");
  const result = await call({ items: SEED_LISTINGS });
  return result.data;
}
