import React from "react";

export interface ClothingIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function DressIcon({ size = 24, color = "currentColor", strokeWidth = 2 }: ClothingIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M18 8C18 8 20 6 24 6C28 6 30 8 30 8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M18 8L18 14C18 14 13 21 12 33C11.6 37 16 40 24 40C32 40 36.4 37 36 33C35 21 30 14 30 14L30 8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SneakerIcon({ size = 24, color = "currentColor", strokeWidth = 2 }: ClothingIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 31C6 27.5 9.5 25 13.5 25L19.5 25C21.5 22.5 25.5 18.5 29.5 18.5C32.5 18.5 34 20.5 36 22.5L39.5 22.5C42 22.5 43 24.5 43 26.5L43 31.5C43 34 41 36 37.5 36L9.5 36C7 36 6 33.5 6 31Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 25L14.5 31M20 25L21 31M28 20L28 29" stroke={color} strokeWidth={strokeWidth * 0.8} strokeLinecap="round" />
    </svg>
  );
}

export function JacketIcon({ size = 24, color = "currentColor", strokeWidth = 2 }: ClothingIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 8L24 6L30 8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M18 8C18 8 20 15 24 15C28 15 30 8 30 8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M18 8L13 12L9 17L9 38L18 38L18 20L18 38M30 8L35 12L39 17L39 38L30 38L30 20L30 38"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BagIcon({ size = 24, color = "currentColor", strokeWidth = 2 }: ClothingIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="20" width="30" height="19" rx="3" stroke={color} strokeWidth={strokeWidth} />
      <path d="M16 20C16 12.5 32 12.5 32 20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M9 27L39 27" stroke={color} strokeWidth={strokeWidth * 0.7} />
    </svg>
  );
}

export function HeelsIcon({ size = 24, color = "currentColor", strokeWidth = 2 }: ClothingIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 34C8 30.5 12 28.5 16 27.5L30 22.5C33 21.5 35 19.5 35 16.5L38.5 16.5L38.5 20.5C38.5 24.5 35 26.5 32 27.5L14 34.5C12 35.3 10 36 8 36Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M35.5 16.5L36.5 30" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function PantsIcon({ size = 24, color = "currentColor", strokeWidth = 2 }: ClothingIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 8L36 8L37 20L34 40L26.5 40L24 20L21.5 40L14 40L11 20Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 8L36 8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}
