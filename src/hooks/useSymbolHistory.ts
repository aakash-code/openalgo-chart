/**
 * Symbol History Hook
 * Manages symbol favorites and recent history with localStorage persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { getJSON, setJSON, STORAGE_KEYS } from '../services/storageService';

// ==================== CONSTANTS ====================

const MAX_RECENT = 10;

// ==================== TYPES ====================

/** Symbol data structure */
export interface SymbolData {
  symbol: string;
  exchange: string;
  name?: string | undefined;
  instrumenttype?: string | undefined;
  tradingsymbol?: string | undefined;
  description?: string | undefined;
}

/** Symbol input - can be string or object */
export type SymbolInput = string | Partial<SymbolData>;

/** Hook return type */
export interface UseSymbolHistoryReturn {
  // State
  favorites: SymbolData[];
  recentSymbols: SymbolData[];

  // Checkers
  isFavorite: (sym: SymbolInput) => boolean;

  // Actions
  toggleFavorite: (sym: SymbolInput) => void;
  addToRecent: (sym: SymbolInput) => void;
  removeFromRecent: (sym: SymbolInput) => void;
  clearRecent: () => void;
  clearFavorites: () => void;

  // Derived
  getRecentExcludingFavorites: () => SymbolData[];

  // Utilities
  normalizeSymbol: (sym: SymbolInput | null | undefined) => SymbolData | null;
  isSameSymbol: (a: SymbolInput | null | undefined, b: SymbolInput | null | undefined) => boolean;
}

// ==================== UTILITIES ====================

/**
 * Normalize symbol data to consistent format
 */
const normalizeSymbol = (sym: SymbolInput | null | undefined): SymbolData | null => {
  if (!sym) return null;

  if (typeof sym === 'string') {
    return { symbol: sym, exchange: 'NSE' };
  }

  return {
    symbol: sym.symbol || sym.tradingsymbol || '',
    exchange: sym.exchange || 'NSE',
    name: sym.name || sym.description || sym.symbol || '',
    instrumenttype: sym.instrumenttype || 'EQ',
  };
};

/**
 * Check if two symbols are the same
 */
const isSameSymbol = (
  a: SymbolInput | null | undefined,
  b: SymbolInput | null | undefined
): boolean => {
  const normA = normalizeSymbol(a);
  const normB = normalizeSymbol(b);

  if (!normA || !normB) return false;

  return normA.symbol === normB.symbol && normA.exchange === normB.exchange;
};

// ==================== HOOK ====================

/**
 * Hook for managing symbol favorites and recent history
 * @returns Symbol history state and handlers
 */
export const useSymbolHistory = (): UseSymbolHistoryReturn => {
  // Favorites state
  const [favorites, setFavorites] = useState<SymbolData[]>(() => {
    const saved = getJSON<SymbolData[]>(STORAGE_KEYS.SYMBOL_FAVORITES, []);
    return Array.isArray(saved) ? saved : [];
  });

  // Recent symbols state
  const [recentSymbols, setRecentSymbols] = useState<SymbolData[]>(() => {
    const saved = getJSON<SymbolData[]>(STORAGE_KEYS.RECENT_SYMBOLS, []);
    return Array.isArray(saved) ? saved : [];
  });

  // Persist favorites to localStorage
  useEffect(() => {
    setJSON(STORAGE_KEYS.SYMBOL_FAVORITES, favorites);
  }, [favorites]);

  // Persist recent symbols to localStorage
  useEffect(() => {
    setJSON(STORAGE_KEYS.RECENT_SYMBOLS, recentSymbols);
  }, [recentSymbols]);

  /**
   * Check if a symbol is favorited
   */
  const isFavorite = useCallback(
    (sym: SymbolInput): boolean => {
      return favorites.some((fav) => isSameSymbol(fav, sym));
    },
    [favorites]
  );

  /**
   * Toggle favorite status for a symbol
   */
  const toggleFavorite = useCallback((sym: SymbolInput) => {
    const normalized = normalizeSymbol(sym);
    if (!normalized || !normalized.symbol) return;

    setFavorites((prev) => {
      const exists = prev.some((fav) => isSameSymbol(fav, normalized));

      if (exists) {
        // Remove from favorites
        return prev.filter((fav) => !isSameSymbol(fav, normalized));
      } else {
        // Add to favorites
        return [normalized, ...prev];
      }
    });
  }, []);

  /**
   * Add a symbol to recent history
   */
  const addToRecent = useCallback((sym: SymbolInput) => {
    const normalized = normalizeSymbol(sym);
    if (!normalized || !normalized.symbol) return;

    setRecentSymbols((prev) => {
      // Remove if already exists (will re-add at top)
      const filtered = prev.filter((recent) => !isSameSymbol(recent, normalized));

      // Add to beginning and limit to MAX_RECENT
      return [normalized, ...filtered].slice(0, MAX_RECENT);
    });
  }, []);

  /**
   * Remove a symbol from recent history
   */
  const removeFromRecent = useCallback((sym: SymbolInput) => {
    setRecentSymbols((prev) => prev.filter((recent) => !isSameSymbol(recent, sym)));
  }, []);

  /**
   * Clear all recent history
   */
  const clearRecent = useCallback(() => {
    setRecentSymbols([]);
  }, []);

  /**
   * Clear all favorites
   */
  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  /**
   * Get recent symbols excluding favorites (to avoid duplication in UI)
   */
  const getRecentExcludingFavorites = useCallback((): SymbolData[] => {
    return recentSymbols.filter((recent) => !isFavorite(recent));
  }, [recentSymbols, isFavorite]);

  return {
    // State
    favorites,
    recentSymbols,

    // Checkers
    isFavorite,

    // Actions
    toggleFavorite,
    addToRecent,
    removeFromRecent,
    clearRecent,
    clearFavorites,

    // Derived
    getRecentExcludingFavorites,

    // Utilities
    normalizeSymbol,
    isSameSymbol,
  };
};

export default useSymbolHistory;
