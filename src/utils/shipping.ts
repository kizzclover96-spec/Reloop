export type PackageSize = "small" | "medium" | "large";

// Keep in sync with SHIPPING_RATES_CENTS in functions/shipping.js.
export const SHIPPING_RATES_EUR: Record<PackageSize, number> = {
  small: 2.49,
  medium: 3.49,
  large: 5.49,
};

export const PACKAGE_SIZES: { value: PackageSize; labelKey: string; exampleKey: string }[] = [
  { value: "small", labelKey: "shipping.small", exampleKey: "shipping.smallExample" },
  { value: "medium", labelKey: "shipping.medium", exampleKey: "shipping.mediumExample" },
  { value: "large", labelKey: "shipping.large", exampleKey: "shipping.largeExample" },
];

export function shippingCostFor(packageSize: PackageSize | undefined): number {
  return SHIPPING_RATES_EUR[packageSize || "medium"];
}
