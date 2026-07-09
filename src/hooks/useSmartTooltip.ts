/**
 * Smart Tooltip Hook - TradingView-style delayed then instant tooltip
 *
 * Behavior:
 * - First hover: Wait 2 seconds before showing tooltip (prevents accidental popups)
 * - Subsequent hovers: Show tooltip instantly (50ms)
 * - After 30 seconds of no hover activity: Reset to 2-second delay
 */

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';

// ==================== CONSTANTS ====================

const INITIAL_DELAY = 2000; // 2 seconds for first tooltip
const SUBSEQUENT_DELAY = 50; // Nearly instant after activation
const RESET_TIMEOUT = 30000; // Reset after 30s of inactivity

// ==================== TYPES ====================

/** Tooltip position */
export interface TooltipPosition {
  x: number;
  y: number;
}

/** Hook return type */
export interface UseSmartTooltipReturn {
  isVisible: boolean;
  content: ReactNode | null;
  position: TooltipPosition;
  showTooltip: (
    tooltipContent: ReactNode,
    x: number,
    y: number,
    targetElement?: HTMLElement | null
  ) => void;
  hideTooltip: () => void;
  updatePosition: (x: number, y: number) => void;
  reset: () => void;
  hasActivated: boolean;
}

// ==================== HOOK ====================

/**
 * Smart tooltip hook with delayed then instant behavior
 * @returns Tooltip state and controls
 */
export function useSmartTooltip(): UseSmartTooltipReturn {
  const [isVisible, setIsVisible] = useState(false);
  const [hasActivated, setHasActivated] = useState(false);
  const [content, setContent] = useState<ReactNode | null>(null);
  const [position, setPosition] = useState<TooltipPosition>({ x: 0, y: 0 });

  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTargetRef = useRef<HTMLElement | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  const showTooltip = useCallback(
    (
      tooltipContent: ReactNode,
      x: number,
      y: number,
      targetElement: HTMLElement | null = null
    ) => {
      // Clear any pending reset
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }

      // Clear any pending show timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      currentTargetRef.current = targetElement;

      const delay = hasActivated ? SUBSEQUENT_DELAY : INITIAL_DELAY;

      hoverTimeoutRef.current = setTimeout(() => {
        setContent(tooltipContent);
        setPosition({ x, y });
        setIsVisible(true);
        setHasActivated(true);
      }, delay);
    },
    [hasActivated]
  );

  const hideTooltip = useCallback(() => {
    // Clear pending show timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    setIsVisible(false);
    currentTargetRef.current = null;

    // Start reset timer - after 30s of inactivity, reset to initial delay
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }

    resetTimeoutRef.current = setTimeout(() => {
      setHasActivated(false);
    }, RESET_TIMEOUT);
  }, []);

  const updatePosition = useCallback((x: number, y: number) => {
    setPosition({ x, y });
  }, []);

  // Reset the delay back to 2 seconds (called when leaving watchlist area)
  const reset = useCallback(() => {
    // Clear any pending timeouts
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }

    setIsVisible(false);
    setHasActivated(false);
    currentTargetRef.current = null;
  }, []);

  return {
    isVisible,
    content,
    position,
    showTooltip,
    hideTooltip,
    updatePosition,
    reset,
    hasActivated,
  };
}

export default useSmartTooltip;
