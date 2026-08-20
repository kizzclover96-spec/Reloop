import React from "react";
import { Search } from "lucide-react";
import { COLOR } from "../theme";

export interface TabIconProps {
  active: boolean;
  size?: number;
}

export default function SearchTabIcon({ active, size = 18 }: TabIconProps) {
  return <Search size={size} color={active ? COLOR.ink : COLOR.inkSoft} strokeWidth={1.6} />;
}
