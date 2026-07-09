/**
 * useDebounce Hook
 *
 * Delays updating a value until a specified delay has passed since the last change.
 * Useful for search inputs, resize observers, etc.
 */

import { useState, useEffect } from 'react';

/**
 * Debounce a value
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounce a value with pending state
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns Object with debounced value and pending state
 */
export function useDebounceWithPending<T>(
  value: T,
  delay: number
): { debouncedValue: T; isPending: boolean } {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setIsPending(true);

    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setIsPending(false);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return { debouncedValue, isPending };
}

export default useDebounce;
