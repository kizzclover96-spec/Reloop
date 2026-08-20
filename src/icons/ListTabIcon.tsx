import React from "react";
import { Plus } from "lucide-react";
import { COLOR } from "../theme";
import type { TabIconProps } from "./SearchTabIcon";

export default function ListTabIcon({ active, size = 20 }: TabIconProps) {
  return <Plus size={size} color={active ? COLOR.ink : COLOR.inkSoft} strokeWidth={1.6} />;
}
