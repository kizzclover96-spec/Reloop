import React from "react";
import { User } from "lucide-react";
import { COLOR } from "../theme";
import type { TabIconProps } from "./SearchTabIcon";

export default function ProfileTabIcon({ active, size = 18 }: TabIconProps) {
  return <User size={size} color={active ? COLOR.ink : COLOR.inkSoft} strokeWidth={1.6} />;
}
