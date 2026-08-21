/**
 * Strips HTML-significant and control characters from user-submitted text
 * before it's stored.
 *
 * This is defense-in-depth, not the primary XSS protection — React already
 * escapes every piece of text this app renders by default (nothing in this
 * codebase uses dangerouslySetInnerHTML), so a malicious `<script>` typed
 * into a listing title was never actually executable in the app itself.
 * This exists for the surfaces React's escaping doesn't cover: if listing
 * text ever gets rendered somewhere else — an email, a PDF, a printed
 * receipt, an admin tool built later — this ensures the stored data is
 * already clean rather than relying on every future consumer to escape it
 * correctly themselves.
 */
export function sanitizeText(input: string, maxLength = 2000): string {
  if (!input) return "";
  return input
    .replace(/[<>]/g, "") // the actual HTML-injection vector
    .replace(/[\u0000-\u001F\u007F]/g, "") // control characters
    .trim()
    .slice(0, maxLength);
}
