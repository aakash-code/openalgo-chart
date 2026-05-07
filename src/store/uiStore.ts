/**
 * UI Store - Modal and dialog visibility state management (Zustand)
 *
 * Replaces UIContext to eliminate re-render cascades.
 * With React Context, changing ANY of 15+ boolean states re-renders ALL consumers.
 * With Zustand selectors, components only re-render when their specific slice changes.
 *
 * Usage:
 *   const isSearchOpen = useUIStore(s => s.isSearchOpen);
 *   const openSearch = useUIStore(s => s.openSearch);
 */

import { create } from 'zustand';

// ==================== TYPES ====================

/** Search mode */
export type SearchMode = 'switch' | 'add' | 'compare';

/** Main view mode */
export type MainViewMode = 'chart' | 'screener';

/** Right panel type */
export type RightPanelType = 'watchlist' | 'orders' | 'positions' | 'alerts' | 'ann_scanner' | 'tradefinder' | string;

/** UI Store State */
interface UIState {
  // Main View
  mainViewMode: MainViewMode;

  // Search
  isSearchOpen: boolean;
  searchMode: SearchMode;
  initialSearchValue: string;

  // Command palette
  isCommandPaletteOpen: boolean;

  // Dialogs
  isTemplateDialogOpen: boolean;
  isShortcutsDialogOpen: boolean;
  isChartTemplatesOpen: boolean;
  isSettingsOpen: boolean;

  // Options
  isStraddlePickerOpen: boolean;
  isOptionChainOpen: boolean;
  optionChainInitialSymbol: string | null;

  // Alert dialog
  isAlertOpen: boolean;

  // Sector heatmap
  isSectorHeatmapOpen: boolean;

  // Indicator settings
  isIndicatorSettingsOpen: boolean;

  // Right panel
  activeRightPanel: RightPanelType;
}

/** UI Store Actions */
interface UIActions {
  // Main View
  setMainViewMode: (mode: MainViewMode | ((prev: MainViewMode) => MainViewMode)) => void;

  // Search
  setIsSearchOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setSearchMode: (mode: SearchMode | ((prev: SearchMode) => SearchMode)) => void;
  setInitialSearchValue: (value: string | ((prev: string) => string)) => void;
  openSearch: (mode?: SearchMode, initialValue?: string) => void;

  // Command palette
  setIsCommandPaletteOpen: (open: boolean | ((prev: boolean) => boolean)) => void;

  // Dialogs
  setIsTemplateDialogOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setIsShortcutsDialogOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setIsChartTemplatesOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setIsSettingsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;

  // Options
  setIsStraddlePickerOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setIsOptionChainOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setOptionChainInitialSymbol: (symbol: string | null | ((prev: string | null) => string | null)) => void;
  openOptionChain: (symbol?: string | null) => void;

  // Alert
  setIsAlertOpen: (open: boolean | ((prev: boolean) => boolean)) => void;

  // Sector heatmap
  setIsSectorHeatmapOpen: (open: boolean | ((prev: boolean) => boolean)) => void;

  // Indicator settings
  setIsIndicatorSettingsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;

  // Right panel
  setActiveRightPanel: (panel: RightPanelType | ((prev: RightPanelType) => RightPanelType)) => void;

  // Helpers
  closeAllModals: () => void;
  closeTopmostModal: () => boolean;
}

type UIStore = UIState & UIActions;

// ==================== HELPERS ====================

/** Helper to resolve value-or-updater pattern (matches React's setState signature) */
function resolve<T>(valOrFn: T | ((prev: T) => T), prev: T): T {
  return typeof valOrFn === 'function' ? (valOrFn as (prev: T) => T)(prev) : valOrFn;
}

// ==================== STORE ====================

export const useUIStore = create<UIStore>()((set, get) => ({
  // ---------- Initial State ----------
  mainViewMode: 'chart' as MainViewMode,
  isSearchOpen: false,
  searchMode: 'switch' as SearchMode,
  initialSearchValue: '',
  isCommandPaletteOpen: false,
  isTemplateDialogOpen: false,
  isShortcutsDialogOpen: false,
  isChartTemplatesOpen: false,
  isSettingsOpen: false,
  isStraddlePickerOpen: false,
  isOptionChainOpen: false,
  optionChainInitialSymbol: null,
  isAlertOpen: false,
  isSectorHeatmapOpen: false,
  isIndicatorSettingsOpen: false,
  activeRightPanel: 'watchlist' as RightPanelType,

  // ---------- Setters (support value | updater function) ----------
  setMainViewMode: (v) => set((s) => ({ mainViewMode: resolve(v, s.mainViewMode) })),
  setIsSearchOpen: (v) => set((s) => ({ isSearchOpen: resolve(v, s.isSearchOpen) })),
  setSearchMode: (v) => set((s) => ({ searchMode: resolve(v, s.searchMode) })),
  setInitialSearchValue: (v) => set((s) => ({ initialSearchValue: resolve(v, s.initialSearchValue) })),
  setIsCommandPaletteOpen: (v) => set((s) => ({ isCommandPaletteOpen: resolve(v, s.isCommandPaletteOpen) })),
  setIsTemplateDialogOpen: (v) => set((s) => ({ isTemplateDialogOpen: resolve(v, s.isTemplateDialogOpen) })),
  setIsShortcutsDialogOpen: (v) => set((s) => ({ isShortcutsDialogOpen: resolve(v, s.isShortcutsDialogOpen) })),
  setIsChartTemplatesOpen: (v) => set((s) => ({ isChartTemplatesOpen: resolve(v, s.isChartTemplatesOpen) })),
  setIsSettingsOpen: (v) => set((s) => ({ isSettingsOpen: resolve(v, s.isSettingsOpen) })),
  setIsStraddlePickerOpen: (v) => set((s) => ({ isStraddlePickerOpen: resolve(v, s.isStraddlePickerOpen) })),
  setIsOptionChainOpen: (v) => set((s) => ({ isOptionChainOpen: resolve(v, s.isOptionChainOpen) })),
  setOptionChainInitialSymbol: (v) => set((s) => ({ optionChainInitialSymbol: resolve(v, s.optionChainInitialSymbol) })),
  setIsAlertOpen: (v) => set((s) => ({ isAlertOpen: resolve(v, s.isAlertOpen) })),
  setIsSectorHeatmapOpen: (v) => set((s) => ({ isSectorHeatmapOpen: resolve(v, s.isSectorHeatmapOpen) })),
  setIsIndicatorSettingsOpen: (v) => set((s) => ({ isIndicatorSettingsOpen: resolve(v, s.isIndicatorSettingsOpen) })),
  setActiveRightPanel: (v) => set((s) => ({ activeRightPanel: resolve(v, s.activeRightPanel) })),

  // ---------- Compound Actions ----------

  openSearch: (mode = 'switch', initialValue = '') => {
    set({ searchMode: mode, initialSearchValue: initialValue, isSearchOpen: true });
  },

  openOptionChain: (symbol = null) => {
    set({ optionChainInitialSymbol: symbol, isOptionChainOpen: true });
  },

  closeAllModals: () => {
    set({
      isSearchOpen: false,
      isCommandPaletteOpen: false,
      isTemplateDialogOpen: false,
      isShortcutsDialogOpen: false,
      isChartTemplatesOpen: false,
      isSettingsOpen: false,
      isStraddlePickerOpen: false,
      isOptionChainOpen: false,
      isAlertOpen: false,
      isSectorHeatmapOpen: false,
      isIndicatorSettingsOpen: false,
    });
  },

  closeTopmostModal: () => {
    const s = get();
    // Priority order (most recent/topmost first)
    if (s.isShortcutsDialogOpen) { set({ isShortcutsDialogOpen: false }); return true; }
    if (s.isCommandPaletteOpen) { set({ isCommandPaletteOpen: false }); return true; }
    if (s.isSearchOpen) { set({ isSearchOpen: false }); return true; }
    if (s.isAlertOpen) { set({ isAlertOpen: false }); return true; }
    if (s.isSettingsOpen) { set({ isSettingsOpen: false }); return true; }
    if (s.isTemplateDialogOpen) { set({ isTemplateDialogOpen: false }); return true; }
    if (s.isChartTemplatesOpen) { set({ isChartTemplatesOpen: false }); return true; }
    if (s.isStraddlePickerOpen) { set({ isStraddlePickerOpen: false }); return true; }
    if (s.isOptionChainOpen) { set({ isOptionChainOpen: false }); return true; }
    if (s.isSectorHeatmapOpen) { set({ isSectorHeatmapOpen: false }); return true; }
    if (s.isIndicatorSettingsOpen) { set({ isIndicatorSettingsOpen: false }); return true; }
    return false; // No modal was open
  },
}));

// ==================== SELECTORS ====================

/** Check if any modal is open (derived, computed on read) */
export const selectHasOpenModal = (s: UIState) =>
  s.isSearchOpen ||
  s.isCommandPaletteOpen ||
  s.isTemplateDialogOpen ||
  s.isShortcutsDialogOpen ||
  s.isChartTemplatesOpen ||
  s.isSettingsOpen ||
  s.isStraddlePickerOpen ||
  s.isOptionChainOpen ||
  s.isAlertOpen ||
  s.isSectorHeatmapOpen ||
  s.isIndicatorSettingsOpen;

// ==================== BACKWARD COMPAT ====================

/**
 * Drop-in replacement for useUI() during migration.
 * Uses individual Zustand selectors under the hood.
 * Components can gradually move to direct useUIStore(s => s.xxx) selectors.
 */
export function useUI() {
  const store = useUIStore();
  return {
    ...store,
    hasOpenModal: selectHasOpenModal(store),
  };
}

export default useUIStore;
