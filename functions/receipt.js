const crypto = require("crypto");

// No 0/O, 1/l/I, no easily-confused pairs — this gets read off a screen and
// possibly typed, so ambiguous characters cause real support headaches.
const RECEIPT_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*";

/**
 * A 6-character unique code for an order — mixes letters, digits, and a
 * handful of symbols. Generated once at order creation and stored on the
 * order doc itself, so the buyer's receipt and the seller's receipt for the
 * same order always show the identical code (they're reading the same field
 * off the same document, not two independently-generated values).
 */
function generateReceiptCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += RECEIPT_CODE_CHARS[crypto.randomInt(RECEIPT_CODE_CHARS.length)];
  }
  return code;
}

module.exports = { generateReceiptCode };
