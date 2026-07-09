/**
 * Keyboard Shortcuts Configuration
 * Single source of truth for all keyboard shortcuts in the application.
 */

import logger from '../utils/logger';
import { getJSON, setJSON } from '../services/storageService';

/**
 * Shortcut Categories
 */
export const SHORTCUT_CATEGORIES = {
    NAVIGATION: 'navigation',
    CHART: 'chart',
    DRAWING: 'drawing',
    ZOOM: 'zoom',
    ACTIONS: 'actions',
} as const;

export type ShortcutCategory = typeof SHORTCUT_CATEGORIES[keyof typeof SHORTCUT_CATEGORIES];

/**
 * Category display labels
 */
export const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
    [SHORTCUT_CATEGORIES.NAVIGATION]: 'Navigation',
    [SHORTCUT_CATEGORIES.CHART]: 'Chart Types',
    [SHORTCUT_CATEGORIES.DRAWING]: 'Drawing Tools',
    [SHORTCUT_CATEGORIES.ZOOM]: 'Zoom',
    [SHORTCUT_CATEGORIES.ACTIONS]: 'Actions',
};

export type Modifier = 'cmd' | 'shift' | 'alt';

export interface ShortcutDefinition {
    key: string;
    modifiers: Modifier[];
    category: ShortcutCategory;
    label: string;
    action: string;
    payload?: string;
    altKey?: string;
}

export interface FormattedShortcut extends ShortcutDefinition {
    id: string;
    formatted: string;
}

export interface CustomShortcut {
    key: string;
    modifiers: Modifier[];
}

export interface ConflictInfo {
    conflict: true;
    conflictWith: string;
    conflictLabel: string;
}

/**
 * All keyboard shortcuts
 */
export const SHORTCUTS: Record<string, ShortcutDefinition> = {
    // Navigation
    openCommandPalette: {
        key: 'k',
        modifiers: ['cmd'],
        category: SHORTCUT_CATEGORIES.NAVIGATION,
        label: 'Open Command Palette',
        action: 'openCommandPalette',
    },
    openShortcutsHelp: {
        key: '?',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.NAVIGATION,
        label: 'Keyboard Shortcuts',
        action: 'openShortcutsHelp',
    },
    openSymbolSearch: {
        key: 'p',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.NAVIGATION,
        label: 'Symbol Search',
        action: 'openSymbolSearch',
    },
    closeDialog: {
        key: 'Escape',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.NAVIGATION,
        label: 'Close / Cancel',
        action: 'closeDialog',
    },

    // Chart Types
    chartCandlestick: {
        key: '1',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.CHART,
        label: 'Candlestick Chart',
        action: 'setChartType',
        payload: 'Candlestick',
    },
    chartBar: {
        key: '2',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.CHART,
        label: 'Bar Chart',
        action: 'setChartType',
        payload: 'Bar',
    },
    chartHollowCandles: {
        key: '3',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.CHART,
        label: 'Hollow Candles',
        action: 'setChartType',
        payload: 'Hollow candles',
    },
    chartLine: {
        key: '4',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.CHART,
        label: 'Line Chart',
        action: 'setChartType',
        payload: 'Line',
    },
    chartArea: {
        key: '5',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.CHART,
        label: 'Area Chart',
        action: 'setChartType',
        payload: 'Area',
    },
    chartBaseline: {
        key: '6',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.CHART,
        label: 'Baseline Chart',
        action: 'setChartType',
        payload: 'Baseline',
    },
    chartHeikinAshi: {
        key: '7',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.CHART,
        label: 'Heikin Ashi',
        action: 'setChartType',
        payload: 'Heikin Ashi',
    },

    // Drawing Tools
    activateDrawMode: {
        key: 'd',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.DRAWING,
        label: 'Draw Mode',
        action: 'activateDrawMode',
    },
    activateCursorMode: {
        key: 'c',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.DRAWING,
        label: 'Cursor Mode',
        action: 'activateCursorMode',
    },

    // Zoom
    zoomIn: {
        key: '+',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.ZOOM,
        label: 'Zoom In',
        action: 'zoomIn',
        altKey: '=',
    },
    zoomOut: {
        key: '-',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.ZOOM,
        label: 'Zoom Out',
        action: 'zoomOut',
    },

    // Actions
    undo: {
        key: 'z',
        modifiers: ['cmd'],
        category: SHORTCUT_CATEGORIES.ACTIONS,
        label: 'Undo',
        action: 'undo',
    },
    redo: {
        key: 'y',
        modifiers: ['cmd'],
        category: SHORTCUT_CATEGORIES.ACTIONS,
        label: 'Redo',
        action: 'redo',
    },
    createAlert: {
        key: 'a',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.ACTIONS,
        label: 'Create Alert',
        action: 'createAlert',
    },
    toggleFullscreen: {
        key: 'F11',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.ACTIONS,
        label: 'Toggle Fullscreen',
        action: 'toggleFullscreen',
    },
    resetChartView: {
        key: 'r',
        modifiers: ['alt'],
        category: SHORTCUT_CATEGORIES.ACTIONS,
        label: 'Reset Chart View',
        action: 'resetChartView',
    },
    addAlertAtPrice: {
        key: 'a',
        modifiers: ['alt'],
        category: SHORTCUT_CATEGORIES.ACTIONS,
        label: 'Add Alert at Price',
        action: 'addAlertAtPrice',
    },
    sellLimitOrder: {
        key: 's',
        modifiers: ['alt', 'shift'],
        category: SHORTCUT_CATEGORIES.ACTIONS,
        label: 'Sell Limit Order',
        action: 'sellLimitOrder',
    },
    buyLimitOrder: {
        key: 'b',
        modifiers: ['alt', 'shift'],
        category: SHORTCUT_CATEGORIES.ACTIONS,
        label: 'Buy Limit Order',
        action: 'buyLimitOrder',
    },
    addOrder: {
        key: 't',
        modifiers: ['shift'],
        category: SHORTCUT_CATEGORIES.ACTIONS,
        label: 'Add Order',
        action: 'addOrder',
    },
    drawHorizontalLine: {
        key: 'h',
        modifiers: ['alt'],
        category: SHORTCUT_CATEGORIES.ACTIONS,
        label: 'Draw Horizontal Line',
        action: 'drawHorizontalLine',
    },
    takeScreenshot: {
        key: 's',
        modifiers: ['cmd', 'shift'],
        category: SHORTCUT_CATEGORIES.ACTIONS,
        label: 'Take Screenshot',
        action: 'takeScreenshot',
    },
};

/**
 * Detect if running on macOS
 */
export const isMac = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
};

/**
 * Get the modifier key symbol for the current OS
 */
export const getModifierKey = (): string => {
    return isMac() ? '⌘' : 'Ctrl';
};

/**
 * Format a shortcut for display
 */
export const formatShortcut = (shortcutDef: ShortcutDefinition | null | undefined): string => {
    if (!shortcutDef) return '';

    const parts: string[] = [];
    const mac = isMac();

    if (shortcutDef.modifiers?.includes('cmd')) {
        parts.push(mac ? '⌘' : 'Ctrl');
    }
    if (shortcutDef.modifiers?.includes('shift')) {
        parts.push(mac ? '⇧' : 'Shift');
    }
    if (shortcutDef.modifiers?.includes('alt')) {
        parts.push(mac ? '⌥' : 'Alt');
    }

    let key = shortcutDef.key;
    if (key === 'Escape') key = 'Esc';
    else if (key === ' ') key = 'Space';
    else if (key.length === 1) key = key.toUpperCase();

    parts.push(key);
    return mac ? parts.join('') : parts.join('+');
};

/**
 * Get shortcuts grouped by category
 */
export const getGroupedShortcuts = (): Record<ShortcutCategory, FormattedShortcut[]> => {
    const grouped: Record<string, FormattedShortcut[]> = {};

    Object.values(SHORTCUT_CATEGORIES).forEach(category => {
        grouped[category] = [];
    });

    Object.entries(SHORTCUTS).forEach(([id, shortcut]) => {
        if (grouped[shortcut.category]) {
            grouped[shortcut.category].push({
                id,
                ...shortcut,
                formatted: formatShortcut(shortcut),
            });
        }
    });

    return grouped as Record<ShortcutCategory, FormattedShortcut[]>;
};

/**
 * Check if a keyboard event matches a shortcut
 */
export const matchesShortcut = (event: KeyboardEvent, shortcutDef: ShortcutDefinition | null | undefined): boolean => {
    if (!shortcutDef) return false;

    const mac = isMac();
    const pressedKey = event.key;

    const cmdPressed = mac ? event.metaKey : event.ctrlKey;
    const altPressed = event.altKey;

    const needsCmd = shortcutDef.modifiers?.includes('cmd') || false;
    const needsAlt = shortcutDef.modifiers?.includes('alt') || false;

    if (cmdPressed !== needsCmd) return false;
    if (altPressed !== needsAlt) return false;

    const shiftRequiredKeys = ['?', '+', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '{', '}', '|', ':', '"', '<', '>', '~'];
    const isShiftImplicit = shiftRequiredKeys.includes(shortcutDef.key);

    if (!isShiftImplicit) {
        const shiftPressed = event.shiftKey;
        const needsShift = shortcutDef.modifiers?.includes('shift') || false;
        if (shiftPressed !== needsShift) return false;
    }

    const targetKey = shortcutDef.key.toLowerCase();
    const eventKey = pressedKey.toLowerCase();

    if (eventKey === targetKey) return true;
    if (shortcutDef.altKey && eventKey === shortcutDef.altKey.toLowerCase()) {
        return true;
    }

    return false;
};

/**
 * Check if the event target is an input field
 */
export const isInputField = (event: Event): boolean => {
    const target = event.target as HTMLElement | null;
    if (!target) return false;

    const tagName = target.tagName?.toLowerCase();
    const isEditable = (target as any).isContentEditable;
    const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';

    // Check if inside Monaco editor (Pine Script editor, code editors)
    const isMonacoEditor = target.closest('.monaco-editor') !== null;

    return isEditable || isInput || isMonacoEditor;
};

// ============================================
// SHORTCUT CUSTOMIZATION
// ============================================

const CUSTOM_SHORTCUTS_KEY = 'custom_keyboard_shortcuts';

/**
 * Load user's custom shortcut overrides from localStorage
 */
export const loadCustomShortcuts = (): Record<string, CustomShortcut> => {
    try {
        return getJSON(CUSTOM_SHORTCUTS_KEY, {}) as Record<string, CustomShortcut>;
    } catch (e) {
        logger.warn('Failed to load custom shortcuts:', e);
        return {};
    }
};

/**
 * Save user's custom shortcut overrides to localStorage
 */
export const saveCustomShortcuts = (customizations: Record<string, CustomShortcut>): void => {
    try {
        setJSON(CUSTOM_SHORTCUTS_KEY, customizations);
    } catch (e) {
        logger.warn('Failed to save custom shortcuts:', e);
    }
};

/**
 * Get effective shortcuts (defaults merged with user customizations)
 */
export const getEffectiveShortcuts = (): Record<string, ShortcutDefinition> => {
    const custom = loadCustomShortcuts();
    const effective: Record<string, ShortcutDefinition> = {};

    Object.entries(SHORTCUTS).forEach(([id, shortcut]) => {
        if (custom[id]) {
            effective[id] = {
                ...shortcut,
                key: custom[id].key,
                modifiers: custom[id].modifiers || [],
            };
        } else {
            effective[id] = { ...shortcut };
        }
    });

    return effective;
};

/**
 * Update a single shortcut binding
 */
export const updateShortcut = (shortcutId: string, key: string, modifiers: Modifier[] = []): ConflictInfo | null => {
    const custom = loadCustomShortcuts();
    const effective = getEffectiveShortcuts();

    const newBinding = { key: key.toLowerCase(), modifiers: [...modifiers].sort() };

    for (const [id, shortcut] of Object.entries(effective)) {
        if (id === shortcutId) continue;

        const existingBinding = {
            key: shortcut.key.toLowerCase(),
            modifiers: [...(shortcut.modifiers || [])].sort(),
        };

        if (
            existingBinding.key === newBinding.key &&
            JSON.stringify(existingBinding.modifiers) === JSON.stringify(newBinding.modifiers)
        ) {
            return {
                conflict: true,
                conflictWith: id,
                conflictLabel: shortcut.label,
            };
        }
    }

    custom[shortcutId] = { key, modifiers };
    saveCustomShortcuts(custom);
    return null;
};

/**
 * Reset a single shortcut to its default binding
 */
export const resetShortcut = (shortcutId: string): void => {
    const custom = loadCustomShortcuts();
    delete custom[shortcutId];
    saveCustomShortcuts(custom);
};

/**
 * Reset all shortcuts to their default bindings
 */
export const resetAllShortcuts = (): void => {
    saveCustomShortcuts({});
};

/**
 * Check if a shortcut has been customized
 */
export const isShortcutCustomized = (shortcutId: string): boolean => {
    const custom = loadCustomShortcuts();
    return !!custom[shortcutId];
};

/**
 * Parse a keyboard event into a shortcut definition
 */
export const parseKeyboardEvent = (event: KeyboardEvent): CustomShortcut | null => {
    if (['Control', 'Alt', 'Shift', 'Meta', 'CapsLock', 'Tab'].includes(event.key)) {
        return null;
    }

    const modifiers: Modifier[] = [];
    const mac = isMac();

    if (mac ? event.metaKey : event.ctrlKey) {
        modifiers.push('cmd');
    }
    if (event.altKey) {
        modifiers.push('alt');
    }
    if (event.shiftKey) {
        const isShiftSpecialChar = /^[!@#$%^&*()_+{}|:"<>?~]$/.test(event.key);
        if (!isShiftSpecialChar) {
            modifiers.push('shift');
        }
    }

    return {
        key: event.key,
        modifiers,
    };
};

/**
 * Get all shortcuts that have been customized
 */
export const getCustomizedShortcuts = (): Record<string, CustomShortcut> => {
    return loadCustomShortcuts();
};
