export interface Seller {
  name: string;
  rating: number;
  reviews: number;
}

export interface ListingData {
  brand: string;
  title: string;
  size: string;
  location: string;
  price: number;
  was?: number;
  condition: string;
  seller: Seller;
  images: string[];
  ratio: string;
  category: string;
  giveaway?: boolean;
  packageSize: "small" | "medium" | "large";
}

export const SEED_LISTINGS: ListingData[] = [
  {
    brand: "Toteme",
    packageSize: "small",
    title: "Structured sunglasses",
    size: "OSFA",
    location: "Stuttgart, DE",
    price: 325,
    condition: "Good condition",
    category: "Accessories",
    seller: { name: "SJP Studio", rating: 4.9, reviews: 205 },
    images: ["linear-gradient(135deg,#D8CFC0,#B7A98F)", "linear-gradient(315deg,#B7A98F,#D8CFC0)"],
    ratio: "3 / 4",
  },
  {
    brand: "Lee",
    packageSize: "medium",
    title: "Wide leg jeans",
    size: "30 / 12",
    location: "Stuttgart, DE",
    price: 56,
    condition: "Very good condition",
    category: "Bottoms",
    seller: { name: "SarahK89", rating: 4.8, reviews: 63 },
    images: ["linear-gradient(135deg,#AFC3D6,#7C93A8)", "linear-gradient(315deg,#7C93A8,#AFC3D6)"],
    ratio: "4 / 5",
  },
  {
    brand: "Harris Tapper",
    packageSize: "medium",
    title: "Polo shirt dress",
    size: "12 / L",
    location: "Stuttgart, DE",
    price: 224,
    condition: "Good condition",
    category: "Dresses",
    seller: { name: "Claudia75", rating: 5.0, reviews: 41 },
    images: ["linear-gradient(135deg,#3B3A38,#141312)", "linear-gradient(315deg,#141312,#3B3A38)"],
    ratio: "3 / 5",
  },
  {
    brand: "New Balance",
    packageSize: "medium",
    title: "574 trainers",
    size: "8 / 39",
    location: "Stuttgart, DE",
    price: 89,
    condition: "Like new",
    category: "Footwear",
    seller: { name: "ChloeS88", rating: 4.7, reviews: 118 },
    images: ["linear-gradient(135deg,#E7E2D6,#C7BFA8)", "linear-gradient(315deg,#C7BFA8,#E7E2D6)"],
    ratio: "1 / 1",
  },
  {
    brand: "Teflar",
    packageSize: "medium",
    title: "Woven tote bag",
    size: "OSFA",
    location: "Stuttgart, DE",
    price: 285,
    condition: "Good condition",
    category: "Bags",
    seller: { name: "JuliaB", rating: 4.9, reviews: 87 },
    images: ["linear-gradient(135deg,#8B5E3C,#5A3A22)", "linear-gradient(315deg,#5A3A22,#8B5E3C)"],
    ratio: "5 / 6",
  },
  {
    brand: "Assembly Label",
    packageSize: "small",
    title: "Poplin shirt",
    size: "12/L, 14/XL",
    location: "Stuttgart, DE",
    price: 64,
    was: 140,
    condition: "Very good condition",
    category: "Tops",
    seller: { name: "Mia", rating: 4.6, reviews: 29 },
    images: ["linear-gradient(135deg,#B9CBB0,#8AA079)", "linear-gradient(315deg,#8AA079,#B9CBB0)"],
    ratio: "3 / 4",
  },
  {
    brand: "Loewe",
    packageSize: "small",
    title: "Inflated rectangular sunglasses",
    size: "OSFA",
    location: "Stuttgart, DE",
    price: 278,
    was: 507,
    condition: "Good condition",
    category: "Accessories",
    seller: { name: "Nora", rating: 5.0, reviews: 152 },
    images: ["linear-gradient(135deg,#3C4E63,#22303F)", "linear-gradient(315deg,#22303F,#3C4E63)"],
    ratio: "3 / 5",
  },
  {
    brand: "Chloe",
    packageSize: "medium",
    title: "Leather shoulder bag",
    size: "OSFA",
    location: "Stuttgart, DE",
    price: 410,
    condition: "Good condition",
    category: "Bags",
    seller: { name: "Frankie", rating: 4.8, reviews: 74 },
    images: ["linear-gradient(135deg,#D9C7A3,#B69A6C)", "linear-gradient(315deg,#B69A6C,#D9C7A3)"],
    ratio: "1 / 1",
  },
];

export const PHOTO_PALETTE = [
  "linear-gradient(135deg,#D8CFC0,#B7A98F)",
  "linear-gradient(135deg,#AFC3D6,#7C93A8)",
  "linear-gradient(135deg,#3B3A38,#141312)",
  "linear-gradient(135deg,#E7E2D6,#C7BFA8)",
  "linear-gradient(135deg,#8B5E3C,#5A3A22)",
  "linear-gradient(135deg,#B9CBB0,#8AA079)",
];
