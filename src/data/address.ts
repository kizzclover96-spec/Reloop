import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";

export interface UserAddress {
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  country: string;
  formatted: string;
  lat: number;
  lng: number;
  verified: boolean;
}

/** Live address status for the signed-in user — null while loading, undefined if never set. */
export function useUserAddress(uid: string | undefined) {
  const [address, setAddress] = useState<UserAddress | undefined | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setAddress(undefined);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        setAddress(snap.data()?.address);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [uid]);

  return { address, loading };
}

export interface AddressInput {
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country: string;
}

/** Verifies the address is real via Geocoding, then saves it — throws a coded error if it can't be located. */
export async function verifyAndSaveAddress(input: AddressInput): Promise<{ formatted: string }> {
  const call = httpsCallable<AddressInput, { verified: boolean; formatted: string }>(functions, "verifyAddress");
  const result = await call(input);
  return { formatted: result.data.formatted };
}
