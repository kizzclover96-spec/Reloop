import React from "react";
import { LayoutGrid } from "lucide-react";
import { COLOR } from "../theme";
import type { TabIconProps } from "./SearchTabIcon";

export default function DiscoverTabIcon({ active, size = 18 }: TabIconProps) {
  return <LayoutGrid size={size} color={active ? COLOR.ink : COLOR.inkSoft} strokeWidth={1.6} />;
}
