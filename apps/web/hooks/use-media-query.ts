import { useEffect, useState } from "react";

/**
 * Tracks whether a CSS media query currently matches, updating live as the
 * viewport crosses the breakpoint (rotating a tablet, resizing a browser
 * window). Used where the DIFFERENCE between mobile/desktop is behavioral,
 * not just visual — e.g. "the sidebar is an overlay drawer on mobile vs. a
 * static column on desktop" needs JS to know which mode it's in, whereas
 * plain Tailwind responsive classes are enough for anything purely visual.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Below this width, the app switches to the mobile-adapted layout (overlay sidebar, bottom-sheet property panel, etc.) — see docs/roadmap.md "Fase 6". */
export const MOBILE_BREAKPOINT_QUERY = "(max-width: 767px)";

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_BREAKPOINT_QUERY);
}
