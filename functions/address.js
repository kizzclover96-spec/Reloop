const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore } = require("firebase-admin/firestore");

const GOOGLE_MAPS_API_KEY = defineSecret("GOOGLE_MAPS_API_KEY");
const db = getFirestore();

/**
 * Verifies a pickup address is real (not just well-formatted) via Google's
 * Geocoding API before storing it. Rejects addresses Google can't locate
 * precisely — a street that doesn't exist, a made-up postal code, etc.
 * Stored on users/{uid}, readable only by that user (see firestore.rules) —
 * this function is the only thing that ever writes it.
 */
exports.verifyAddress = onCall({ secrets: [GOOGLE_MAPS_API_KEY] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");

  const { line1, line2, city, postalCode, country } = request.data || {};
  if (!line1 || !city || !postalCode || !country) {
    throw new HttpsError("invalid-argument", "Missing address fields.");
  }

  const addressString = [line1, line2, postalCode, city, country].filter(Boolean).join(", ");
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    addressString
  )}&key=${GOOGLE_MAPS_API_KEY.value()}`;

  let data;
  try {
    const res = await fetch(url);
    data = await res.json();
  } catch (err) {
    console.error("Geocoding request failed:", err.message);
    throw new HttpsError("unavailable", "ADDRESS_CHECK_FAILED");
  }

  if (data.status === "ZERO_RESULTS" || !data.results?.length) {
    throw new HttpsError("failed-precondition", "ADDRESS_NOT_FOUND");
  }
  if (data.status !== "OK") {
    console.error("Geocoding API error:", data.status, data.error_message);
    throw new HttpsError("unavailable", "ADDRESS_CHECK_FAILED");
  }

  const result = data.results[0];
  const locationType = result.geometry?.location_type;
  // ROOFTOP/RANGE_INTERPOLATED = Google matched an actual building/street
  // number. APPROXIMATE/GEOMETRIC_CENTER = it only found the general area
  // (e.g. just the city) — not precise enough to be a real pickup point.
  const preciseEnough = locationType === "ROOFTOP" || locationType === "RANGE_INTERPOLATED";
  if (!preciseEnough || result.partial_match) {
    throw new HttpsError("failed-precondition", "ADDRESS_IMPRECISE");
  }

  const { lat, lng } = result.geometry.location;

  await db.collection("users").doc(uid).set(
    {
      address: {
        line1,
        line2: line2 || "",
        city,
        postalCode,
        country,
        formatted: result.formatted_address,
        lat,
        lng,
        verified: true,
        updatedAt: Date.now(),
      },
    },
    { merge: true }
  );

  return { verified: true, formatted: result.formatted_address };
});
