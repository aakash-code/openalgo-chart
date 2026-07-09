/**
 * useMediaQuery Hook
 *
 * Reactive media query hook for responsive design
 */

import { useState, useEffect } from 'react';

/** Breakpoints in pixels */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Subscribe to a media query
 * @param query - The media query string
 * @returns Whether the query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Set initial value
    setMatches(mediaQueryList.matches);

    // Modern browsers
    mediaQueryList.addEventListener('change', listener);

    return () => {
      mediaQueryList.removeEventListener('change', listener);
    };
  }, [query]);

  return matches;
}

/**
 * Get responsive breakpoint states
 * @returns Object with breakpoint states
 */
export function useResponsive() {
  const isMobile = useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`);
  const isTablet = useMediaQuery(
    `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`
  );
  const isDesktop = useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);

  const isSm = useMediaQuery(`(min-width: ${BREAKPOINTS.sm}px)`);
  const isMd = useMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`);
  const isLg = useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
  const isXl = useMediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`);
  const is2Xl = useMediaQuery(`(min-width: ${BREAKPOINTS['2xl']}px)`);

  return {
    isMobile,
    isTablet,
    isDesktop,
    isSm,
    isMd,
    isLg,
    isXl,
    is2Xl,
  };
}

/**
 * Check if prefers reduced motion
 * @returns Whether user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * Check if prefers dark color scheme
 * @returns Whether user prefers dark mode
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

export default useMediaQuery;
