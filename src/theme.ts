// Minimalist palette: white background, black ink for icons/text/shapes,
// blue as the one accent color (links, "see more", selected states). Kept
// the same key names (oxblood/oxbloodSoft) rather than renaming them
// everywhere they're used — they're the "accent" slot, just repointed from
// the old ivory/oxblood aesthetic to blue.
export const COLOR = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  ink: "#111111",
  inkSoft: "#6B6B6B",
  line: "#E5E5E5",
  lineSoft: "#F5F5F5",
  oxblood: "#2563EB", // accent — blue, used for links/"see more"/selected states
  oxbloodSoft: "#EFF6FF", // light accent background tint
  gold: "#B08A4E",
} as const;

export const SERIF = "'Fraunces', Georgia, serif";
export const SANS = "'Inter', -apple-system, sans-serif";

/** Listing images are either a CSS gradient (placeholder) or a real Storage download URL. */
export function cssBackground(value: string): string {
  if (!value) return COLOR.lineSoft;
  if (value.startsWith("http")) return `center / cover no-repeat url("${value}")`;
  return value;
}

/** Same as cssBackground, but shows the full photo uncropped (letterboxed if needed) instead of filling/cropping the container. */
export function cssBackgroundContain(value: string): string {
  if (!value) return COLOR.lineSoft;
  if (value.startsWith("http")) return `center / contain no-repeat ${COLOR.lineSoft} url("${value}")`;
  return value;
}
