// Keep in sync with src/utils/shipping.ts (client display).
const SHIPPING_RATES_CENTS = {
  small: 249, // €2.49 — t-shirt, book, small accessory
  medium: 349, // €3.49 — shoes, sweater, small electronics
  large: 549, // €5.49 — jacket, bag, larger item
};

function shippingCentsFor(packageSize) {
  return SHIPPING_RATES_CENTS[packageSize] ?? SHIPPING_RATES_CENTS.medium;
}

/**
 * 24 hours, but weekend time doesn't count against the deadline — buy
 * something Friday evening and the clock effectively pauses until Monday.
 * Walks forward an hour at a time (max ~24 iterations plus weekend skips),
 * which is plenty cheap for a once-per-order computation.
 */
function computeShipDeadline(fromMs) {
  const ONE_HOUR = 3600 * 1000;
  let hoursLeft = 24;
  let cursor = new Date(fromMs);

  while (hoursLeft > 0) {
    const day = cursor.getUTCDay(); // 0 = Sunday, 6 = Saturday
    if (day === 0 || day === 6) {
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1, 0, 0, 0));
      continue;
    }
    cursor = new Date(cursor.getTime() + ONE_HOUR);
    hoursLeft -= 1;
  }

  return cursor.getTime();
}

module.exports = { SHIPPING_RATES_CENTS, shippingCentsFor, computeShipDeadline };
