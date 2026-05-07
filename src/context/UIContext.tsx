/**
 * UIContext - REFACTORED: Now a thin wrapper around Zustand uiStore
 *
 * The UIProvider still wraps the app (for backward compatibility) but is now
 * a pass-through — all state lives in the Zustand store.
 *
 * WHY: React Context re-renders ALL consumers when ANY value changes.
 * With 15+ boolean modal states, this caused the entire App tree to re-render
 * whenever any modal opened/closed. Zustand selectors re-render only the
 * component that subscribes to the specific value that changed.
 *
 * Migration path:
 *   OLD: const { isSearchOpen, setIsSearchOpen } = useUI();
 *   NEW: const isSearchOpen = useUIStore(s => s.isSearchOpen);
 *        const setIsSearchOpen = useUIStore(s => s.setIsSearchOpen);
 */

import { type ReactNode } from 'react';

// Re-export everything from the Zustand store for backward compatibility
export { useUI, useUIStore, selectHasOpenModal } from '../store/uiStore';
export type { SearchMode, RightPanelType } from '../store/uiStore';

// ==================== TYPES ====================

/** UI context value type — kept for backward compatibility with imports */
export interface UIContextValue {
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  searchMode: 'switch' | 'add' | 'compare';
  setSearchMode: (mode: ('switch' | 'add' | 'compare') | ((prev: 'switch' | 'add' | 'compare') => 'switch' | 'add' | 'compare')) => void;
  initialSearchValue: string;
  setInitialSearchValue: (value: string | ((prev: string) => string)) => void;
  openSearch: (mode?: 'switch' | 'add' | 'compare', initialValue?: string) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isTemplateDialogOpen: boolean;
  setIsTemplateDialogOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isShortcutsDialogOpen: boolean;
  setIsShortcutsDialogOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isChartTemplatesOpen: boolean;
  setIsChartTemplatesOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isStraddlePickerOpen: boolean;
  setIsStraddlePickerOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isOptionChainOpen: boolean;
  setIsOptionChainOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  optionChainInitialSymbol: string | null;
  setOptionChainInitialSymbol: (symbol: string | null | ((prev: string | null) => string | null)) => void;
  openOptionChain: (symbol?: string | null) => void;
  isAlertOpen: boolean;
  setIsAlertOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isSectorHeatmapOpen: boolean;
  setIsSectorHeatmapOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isIndicatorSettingsOpen: boolean;
  setIsIndicatorSettingsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  activeRightPanel: string;
  setActiveRightPanel: (panel: string | ((prev: string) => string)) => void;
  closeAllModals: () => void;
  closeTopmostModal: () => boolean;
  hasOpenModal: boolean;
}

// ==================== PROVIDER (pass-through) ====================

export interface UIProviderProps {
  children: ReactNode;
}

/**
 * UIProvider - Now a pass-through wrapper.
 * State lives in the Zustand uiStore — no React Context needed.
 * Kept for backward compatibility with main.tsx and tests.
 */
export function UIProvider({ children }: UIProviderProps) {
  return <>{children}</>;
}

export default null;
