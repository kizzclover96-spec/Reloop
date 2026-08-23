import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

/** Realtime set of listing ids the given user has liked — persists across reloads and devices, unlike the old local-only Set. */
export function useUserLikes(uid: string | undefined) {
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLiked(new Set());
      setLoading(false);
      return;
    }
    const q = query(collection(db, "likes"), where("uid", "==", uid));
    const unsub = onSnapshot(q, (snap) => {
      setLiked(new Set(snap.docs.map((d) => d.data().listingId as string)));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  return { liked, loading };
}

/**
 * Toggles a like on/off for a listing. The doc id itself ("{uid}_{listingId}")
 * is what actually enforces "one like per user per listing" — firestore.rules
 * requires it to match exactly, so there's no separate query needed to
 * prevent duplicates. The on-screen like COUNT isn't computed here at all —
 * that's maintained authoritatively by Cloud Function triggers
 * (functions/likes.js) reacting to this doc being created/deleted, never by
 * the client incrementing anything directly.
 */
export async function toggleLike(uid: string, listingId: string, currentlyLiked: boolean) {
  const ref = doc(db, "likes", `${uid}_${listingId}`);
  if (currentlyLiked) {
    await deleteDoc(ref);
  } else {
    await setDoc(ref, { uid, listingId, createdAt: Date.now() });
  }
}
