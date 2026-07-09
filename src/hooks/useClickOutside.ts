/**
 * useClickOutside Hook
 *
 * Triggers a callback when a click occurs outside the referenced element.
 * Useful for closing modals, dropdowns, menus, etc.
 */

import { useEffect, RefObject } from 'react';

/**
 * Detect clicks outside an element
 * @param ref - The ref of the element to detect clicks outside of
 * @param handler - The callback function to execute on click outside
 * @param enabled - Whether the listener is active (default: true)
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, enabled]);
}

/**
 * Detect clicks outside multiple elements
 * @param refs - Array of refs to detect clicks outside of
 * @param handler - The callback function to execute on click outside
 * @param enabled - Whether the listener is active (default: true)
 */
export function useClickOutsideMultiple<T extends HTMLElement>(
  refs: RefObject<T | null>[],
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      // Check if click is inside any of the refs
      const isInsideAny = refs.some(
        (ref) => ref.current && ref.current.contains(target)
      );

      if (!isInsideAny) {
        handler(event);
      }
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [refs, handler, enabled]);
}

export default useClickOutside;
