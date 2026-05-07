/**
 * Watchlist related type definitions
 */

/** Watchlist symbol */
export interface WatchlistSymbol {
  symbol: string;
  exchange: string;
  flag?: string; // Optional color flag: 'red', 'green', 'blue', or null
}

/** Watchlist item - can be a symbol or a section marker */
export type WatchlistItem = WatchlistSymbol | string;

/** Watchlist definition */
export interface Watchlist {
  id: string;
  name: string;
  symbols: WatchlistItem[];
  isFavorite: boolean;
  favoriteEmoji?: string;
  collapsedSections: string[];
}

/** State for all watchlists */
export interface WatchlistsState {
  lists: Watchlist[];
  activeListId: string;
}

/** Real-time data for a watchlist item */
export interface WatchlistItemData {
  symbol: string;
  exchange: string;
  last: string | number;
  chg: string | number;
  chgP: string | number;
  up: boolean;
  flag?: string;
  globalIndex?: number;
  [key: string]: any; // Index signature for dynamic field access
}

/** Search mode types for symbol search */
export type SearchMode = 'switch' | 'compare' | 'add';
