/**
 * Centralized Storage Service
 * Provides safe localStorage operations with error handling and JSON support
 */

import { STORAGE_KEYS } from '../constants/storageKeys';
import logger from '../utils/logger';

/**
 * Safely parse JSON with fallback
 * @param value - The value to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed value or fallback
 */
export const safeParseJSON = <T>(value: string | null | undefined, fallback: T): T => {
  if (value === null || value === undefined) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

/**
 * Get a string value from localStorage
 * @param key - The storage key
 * @param fallback - Fallback value if key doesn't exist
 * @returns The stored value or fallback
 */
export const getString = (key: string, fallback: string = ''): string => {
  try {
    const value = localStorage.getItem(key);
    return value !== null ? value : fallback;
  } catch (error) {
    logger.warn(`[Storage] Failed to get '${key}':`, (error as Error).message);
    return fallback;
  }
};

/**
 * Get a value from localStorage
 * @param key - The storage key
 * @param fallback - Fallback value if key doesn't exist
 * @returns The stored value or fallback
 */
export const get = (key: string, fallback: string | null = null): string | null => {
  try {
    const value = localStorage.getItem(key);
    return value !== null ? value : fallback;
  } catch (error) {
    logger.warn(`[Storage] Failed to get '${key}':`, (error as Error).message);
    return fallback;
  }
};

/**
 * Set a value in localStorage
 * @param key - The storage key
 * @param value - The value to store
 * @returns Whether the operation succeeded
 */
export const set = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    logger.warn(`[Storage] Failed to set '${key}':`, (error as Error).message);
    return false;
  }
};

/**
 * Remove a value from localStorage
 * @param key - The storage key
 * @returns Whether the operation succeeded
 */
export const remove = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    logger.warn(`[Storage] Failed to remove '${key}':`, (error as Error).message);
    return false;
  }
};

/**
 * Get a JSON value from localStorage
 * @param key - The storage key
 * @param fallback - Fallback value if key doesn't exist or parsing fails
 * @returns The parsed value or fallback
 */
export const getJSON = <T>(key: string, fallback: T): T => {
  const value = get(key);
  return safeParseJSON(value, fallback);
};

/**
 * Set a JSON value in localStorage
 * @param key - The storage key
 * @param value - The value to store (will be JSON stringified)
 * @returns Whether the operation succeeded
 */
export const setJSON = <T>(key: string, value: T): boolean => {
  try {
    return set(key, JSON.stringify(value));
  } catch (error) {
    logger.warn(`[Storage] Failed to stringify for '${key}':`, (error as Error).message);
    return false;
  }
};

/**
 * Get a boolean value from localStorage
 * @param key - The storage key
 * @param fallback - Fallback value if key doesn't exist
 * @returns The boolean value
 */
export const getBoolean = (key: string, fallback: boolean = false): boolean => {
  const value = get(key);
  if (value === null) return fallback;
  return value === 'true';
};

/**
 * Set a boolean value in localStorage
 * @param key - The storage key
 * @param value - The boolean value to store
 * @returns Whether the operation succeeded
 */
export const setBoolean = (key: string, value: boolean): boolean => {
  return set(key, value ? 'true' : 'false');
};

/**
 * Get a number value from localStorage
 * @param key - The storage key
 * @param fallback - Fallback value if key doesn't exist or parsing fails
 * @returns The number value
 */
export const getNumber = (key: string, fallback: number = 0): number => {
  const value = get(key);
  if (value === null) return fallback;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
};

/**
 * Set a number value in localStorage
 * @param key - The storage key
 * @param value - The number value to store
 * @returns Whether the operation succeeded
 */
export const setNumber = (key: string, value: number): boolean => {
  return set(key, String(value));
};

/**
 * Check if a key exists in localStorage
 * @param key - The storage key
 * @returns Whether the key exists
 */
export const has = (key: string): boolean => {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
};

/**
 * Clear all app-related storage (keys starting with 'tv_' or 'oa_')
 * @returns Number of keys cleared
 */
export const clearAppStorage = (): number => {
  let cleared = 0;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('tv_') || key.startsWith('oa_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      cleared++;
    });
  } catch (error) {
    logger.warn('[Storage] Failed to clear app storage:', (error as Error).message);
  }
  return cleared;
};

/**
 * Export storage as JSON object
 * @returns All app storage as key-value pairs
 */
export const exportStorage = (): Record<string, string | null> => {
  const data: Record<string, string | null> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('tv_') || key.startsWith('oa_'))) {
        data[key] = localStorage.getItem(key);
      }
    }
  } catch (error) {
    logger.warn('[Storage] Failed to export storage:', (error as Error).message);
  }
  return data;
};

/**
 * Import storage from JSON object
 * @param data - Key-value pairs to import
 * @returns Number of keys imported
 */
export const importStorage = (data: Record<string, string>): number => {
  let imported = 0;
  try {
    Object.entries(data).forEach(([key, value]) => {
      if (key.startsWith('tv_') || key.startsWith('oa_')) {
        localStorage.setItem(key, value);
        imported++;
      }
    });
  } catch (error) {
    logger.warn('[Storage] Failed to import storage:', (error as Error).message);
  }
  return imported;
};

// Re-export STORAGE_KEYS for convenience
export { STORAGE_KEYS };

export default {
  get,
  getString,
  set,
  remove,
  getJSON,
  setJSON,
  getBoolean,
  setBoolean,
  getNumber,
  setNumber,
  has,
  safeParseJSON,
  clearAppStorage,
  exportStorage,
  importStorage,
  STORAGE_KEYS,
};
