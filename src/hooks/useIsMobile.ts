import { useState, useEffect } from "react";

export function useIsMobile(threshold = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    if (params.has("mobile")) return true;
    if (params.has("desktop")) return false;
    return window.innerWidth <= threshold;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (params.has("mobile") || params.has("desktop")) return;

    const mediaQuery = window.matchMedia(`(max-width: ${threshold}px)`);
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    setIsMobile(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, [threshold]);

  return isMobile;
}
