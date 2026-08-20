import React from "react";
import { Heart } from "lucide-react";
import { COLOR } from "../theme";
import type { TabIconProps } from "./SearchTabIcon";

export default function FavouritesTabIcon({ active, size = 18 }: TabIconProps) {
  return (
    <Heart
      size={size}
      color={active ? COLOR.ink : COLOR.inkSoft}
      fill={active ? COLOR.ink : "none"}
      strokeWidth={1.6}
    />
  );
}
