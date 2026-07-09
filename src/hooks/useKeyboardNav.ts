import { useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';

// ==================== TYPES ====================

/** Keyboard event handler */
export type KeyboardEventHandler = (event: KeyboardEvent) => void;

/** Keyboard navigation options */
export interface KeyboardNavOptions {
  /** Whether the hook is active (default: true) */
  enabled?: boolean | undefined;
  /** Callback for Escape key */
  onEscape?: KeyboardEventHandler | undefined;
  /** Callback for Enter key */
  onEnter?: KeyboardEventHandler | undefined;
  /** Callback for ArrowUp key */
  onArrowUp?: KeyboardEventHandler | undefined;
  /** Callback for ArrowDown key */
  onArrowDown?: KeyboardEventHandler | undefined;
  /** Callback for ArrowLeft key */
  onArrowLeft?: KeyboardEventHandler | undefined;
  /** Callback for ArrowRight key */
  onArrowRight?: KeyboardEventHandler | undefined;
}

/** List navigation orientation */
export type ListOrientation = 'vertical' | 'horizontal';

/** List navigation options */
export interface ListNavigationOptions {
  /** Whether the hook is active (default: true) */
  enabled?: boolean | undefined;
  /** Total number of items in the list */
  itemCount?: number | undefined;
  /** Currently active item index */
  activeIndex?: number | undefined;
  /** Callback to update active index */
  setActiveIndex?: Dispatch<SetStateAction<number>> | undefined;
  /** Callback when Enter is pressed on active item */
  onSelect?: ((index: number) => void) | undefined;
  /** Whether to loop around at boundaries (default: true) */
  loop?: boolean | undefined;
  /** Navigation orientation (default: 'vertical') */
  orientation?: ListOrientation | undefined;
}

/** List navigation return type */
export interface ListNavigationReturn {
  activeIndex: number;
  navigateUp: () => void;
  navigateDown: () => void;
  handleSelect: () => void;
}

/**
 * Hook for general keyboard navigation (Escape, Enter, etc.)
 * @param options - Configuration options
 */
export function useKeyboardNav(options: KeyboardNavOptions = {}): void {
  const {
    enabled = true,
    onEscape,
    onEnter,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't interfere with input elements unless it's Escape
      const target = event.target as HTMLElement;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

      switch (event.key) {
        case 'Escape':
          if (onEscape) {
            event.preventDefault();
            onEscape(event);
          }
          break;
        case 'Enter':
          if (onEnter && !isInput) {
            event.preventDefault();
            onEnter(event);
          }
          break;
        case 'ArrowUp':
          if (onArrowUp && !isInput) {
            event.preventDefault();
            onArrowUp(event);
          }
          break;
        case 'ArrowDown':
          if (onArrowDown && !isInput) {
            event.preventDefault();
            onArrowDown(event);
          }
          break;
        case 'ArrowLeft':
          if (onArrowLeft && !isInput) {
            event.preventDefault();
            onArrowLeft(event);
          }
          break;
        case 'ArrowRight':
          if (onArrowRight && !isInput) {
            event.preventDefault();
            onArrowRight(event);
          }
          break;
        default:
          break;
      }
    },
    [onEscape, onEnter, onArrowUp, onArrowDown, onArrowLeft, onArrowRight]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

/**
 * Hook for list/menu keyboard navigation with active index tracking
 * @param options - Configuration options
 * @returns Navigation state and handlers
 */
export function useListNavigation(options: ListNavigationOptions = {}): ListNavigationReturn {
  const {
    enabled = true,
    itemCount = 0,
    activeIndex = 0,
    setActiveIndex,
    onSelect,
    loop = true,
    orientation = 'vertical',
  } = options;

  const navigateUp = useCallback(() => {
    if (!setActiveIndex || itemCount === 0) return;

    setActiveIndex((prev) => {
      if (prev <= 0) {
        return loop ? itemCount - 1 : 0;
      }
      return prev - 1;
    });
  }, [setActiveIndex, itemCount, loop]);

  const navigateDown = useCallback(() => {
    if (!setActiveIndex || itemCount === 0) return;

    setActiveIndex((prev) => {
      if (prev >= itemCount - 1) {
        return loop ? 0 : itemCount - 1;
      }
      return prev + 1;
    });
  }, [setActiveIndex, itemCount, loop]);

  const handleSelect = useCallback(() => {
    if (onSelect && activeIndex >= 0 && activeIndex < itemCount) {
      onSelect(activeIndex);
    }
  }, [onSelect, activeIndex, itemCount]);

  // Determine which arrow keys do what based on orientation
  const arrowUpHandler = orientation === 'vertical' ? navigateUp : undefined;
  const arrowDownHandler = orientation === 'vertical' ? navigateDown : undefined;
  const arrowLeftHandler = orientation === 'horizontal' ? navigateUp : undefined;
  const arrowRightHandler = orientation === 'horizontal' ? navigateDown : undefined;

  useKeyboardNav({
    enabled,
    onArrowUp: arrowUpHandler,
    onArrowDown: arrowDownHandler,
    onArrowLeft: arrowLeftHandler,
    onArrowRight: arrowRightHandler,
    onEnter: handleSelect,
  });

  return {
    activeIndex,
    navigateUp,
    navigateDown,
    handleSelect,
  };
}

export default useKeyboardNav;
