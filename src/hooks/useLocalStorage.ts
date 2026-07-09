/**
 * useLocalStorage Hook
 *
 * Custom hook for syncing state with localStorage
 * Features:
 * - Try-catch for edge cases (private browsing, quota exceeded)
 * - Debounced writes to prevent rapid localStorage updates
 * - Type-safe serialization/deserialization
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import logger from '@/utils/logger';

interface UseLocalStorageOptions {
  debounceMs?: number;
  serialize?: boolean;
}

type SetValue<T> = T | ((prev: T) => T);

/**
 * Sync state with localStorage
 * @param key - The localStorage key
 * @param defaultValue - The default value if key doesn't exist
 * @param options - Configuration options
 * @returns Tuple of [value, setValue]
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options: UseLocalStorageOptions = {}
): [T, (value: SetValue<T>) => void] {
  const {
    debounceMs = 300,
    serialize = typeof defaultValue === 'object',
  } = options;

  const isInitialMount = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) {
        return defaultValue;
      }

      // Handle boolean strings specially
      if (stored === 'true') return true as unknown as T;
      if (stored === 'false') return false as unknown as T;

      // Try to parse JSON for objects/arrays
      if (serialize) {
        try {
          return JSON.parse(stored) as T;
        } catch {
          return stored as unknown as T;
        }
      }

      return stored as unknown as T;
    } catch (error) {
      logger.warn(
        `[useLocalStorage] Failed to read '${key}':`,
        (error as Error).message
      );
      return defaultValue;
    }
  });

  // Debounced write to localStorage
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        if (serialize && typeof value === 'object') {
          localStorage.setItem(key, JSON.stringify(value));
        } else {
          localStorage.setItem(key, String(value));
        }
      } catch (error) {
        logger.warn(
          `[useLocalStorage] Failed to write '${key}':`,
          (error as Error).message
        );
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, value, serialize, debounceMs]);

  const setStoredValue = useCallback((newValue: SetValue<T>) => {
    setValue((prev) => {
      const valueToStore =
        typeof newValue === 'function'
          ? (newValue as (prev: T) => T)(prev)
          : newValue;
      return valueToStore;
    });
  }, []);

  return [value, setStoredValue];
}

/**
 * Simplified hook for boolean localStorage values
 * Uses immediate writes (no debounce) since toggles are infrequent
 */
export function useLocalStorageBoolean(
  key: string,
  defaultValue = false
): [boolean, (value: SetValue<boolean>) => void] {
  return useLocalStorage(key, defaultValue, {
    debounceMs: 0,
    serialize: false,
  });
}

/**
 * Hook for number localStorage values
 */
export function useLocalStorageNumber(
  key: string,
  defaultValue = 0
): [number, (value: SetValue<number>) => void] {
  return useLocalStorage(key, defaultValue, {
    debounceMs: 0,
    serialize: false,
  });
}

export default useLocalStorage;
