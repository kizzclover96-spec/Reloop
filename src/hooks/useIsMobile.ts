import { useState, useEffect } from "react";

/** True when the viewport is at or below phone width. Live — updates on resize, not just at mount. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 520 : false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 520);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isMobile;
}
