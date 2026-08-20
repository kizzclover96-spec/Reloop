// Keep these in sync with functions/checkout.js — this file is display-only,
// the actual charge amounts are set server-side and these are just what the
// UI shows before checkout confirms them.
export const PLATFORM_FEE_EUR = 1;
export const GIVEAWAY_PRICE_EUR = 3;
export const PRICE_CEILING_EUR = 30;

/**
 * What a buyer actually pays for a listing:
 * - Giveaway: flat €3, all kept by Reloop.
 * - €30 tier (the price ceiling): stays at exactly €30 — the €1 platform fee
 *   comes out of the seller's cut instead of being added on top.
 * - Every other tier: listed price + €1 platform fee, seller receives the
 *   full listed price.
 */
export function buyerPrice(listing: { giveaway?: boolean; price: number }): number {
  if (listing.giveaway) return GIVEAWAY_PRICE_EUR;
  if (listing.price === PRICE_CEILING_EUR) return PRICE_CEILING_EUR;
  return listing.price + PLATFORM_FEE_EUR;
}
