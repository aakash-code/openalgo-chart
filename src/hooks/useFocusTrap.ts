import { useRef, useEffect, useCallback, type RefObject } from 'react';

// ==================== TYPES ====================

/** Focus trap options */
export interface FocusTrapOptions {
  /** Auto-focus first element on activation (default: true) */
  autoFocus?: boolean | undefined;
  /** Restore focus on deactivation (default: true) */
  restoreFocus?: boolean | undefined;
}

/** Focusable HTML element type */
type FocusableElement = HTMLElement & { focus: () => void };

/**
 * Selector for all focusable elements
 */
const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Hook to trap focus within a container (for modals/dialogs)
 * @param isActive - Whether the focus trap is active
 * @param options - Configuration options
 * @returns Ref to attach to the container element
 */
export function useFocusTrap(
  isActive: boolean,
  options: FocusTrapOptions = {}
): RefObject<HTMLDivElement | null> {
  const { autoFocus = true, restoreFocus = true } = options;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElement = useRef<FocusableElement | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback((): FocusableElement[] => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    ).filter((el): el is FocusableElement => {
      // Ensure element is visible
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, []);

  // Handle tab key to trap focus
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !containerRef.current) return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) return;

      // Shift+Tab on first element -> go to last
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
      // Tab on last element -> go to first
      else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    },
    [getFocusableElements]
  );

  useEffect(() => {
    if (!isActive) return;

    // Store currently focused element
    if (restoreFocus) {
      previousActiveElement.current = document.activeElement as FocusableElement | null;
    }

    // Auto-focus first focusable element
    if (autoFocus) {
      // Small delay to ensure modal content is rendered
      const timeoutId = setTimeout(() => {
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0 && focusableElements[0]) {
          focusableElements[0].focus();
        } else if (containerRef.current) {
          // If no focusable elements, focus the container itself
          containerRef.current.setAttribute('tabindex', '-1');
          containerRef.current.focus();
        }
      }, 10);

      return () => clearTimeout(timeoutId);
    }

    return undefined;
  }, [isActive, autoFocus, restoreFocus, getFocusableElements]);

  // Add/remove keydown listener
  useEffect(() => {
    if (!isActive) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleKeyDown]);

  // Restore focus on deactivation
  useEffect(() => {
    return () => {
      if (restoreFocus && previousActiveElement.current) {
        // Small delay to ensure state updates complete
        setTimeout(() => {
          if (
            previousActiveElement.current &&
            typeof previousActiveElement.current.focus === 'function'
          ) {
            previousActiveElement.current.focus();
          }
        }, 10);
      }
    };
  }, [restoreFocus]);

  return containerRef;
}

export default useFocusTrap;
