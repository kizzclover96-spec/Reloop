export const COLOR = {
  bg: "#FAF7F1",
  card: "#FFFFFF",
  ink: "#1C1A17",
  inkSoft: "#6E6A62",
  line: "#E7E2D6",
  lineSoft: "#F0ECE1",
  oxblood: "#6E2632",
  oxbloodSoft: "#F3E4E4",
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
