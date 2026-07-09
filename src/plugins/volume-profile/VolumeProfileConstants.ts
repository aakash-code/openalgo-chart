/**
 * Volume Profile Constants
 * Colors and settings for enhanced Volume Profile visualization
 */

// Profile types
export const PROFILE_TYPES = {
    SESSION: 'session',           // One profile per trading session
    FIXED_RANGE: 'fixed_range',   // User-defined price range
    COMPOSITE_LEFT: 'composite_left',   // Full range on left side
    COMPOSITE_RIGHT: 'composite_right', // Full range on right side
    VISIBLE_RANGE: 'visible_range',     // Current visible chart range
} as const;

export type ProfileType = typeof PROFILE_TYPES[keyof typeof PROFILE_TYPES];

// Profile type display names
export const PROFILE_TYPE_NAMES: Record<ProfileType, string> = {
    [PROFILE_TYPES.SESSION]: 'Session Profile',
    [PROFILE_TYPES.FIXED_RANGE]: 'Fixed Range',
    [PROFILE_TYPES.COMPOSITE_LEFT]: 'Composite (Left)',
    [PROFILE_TYPES.COMPOSITE_RIGHT]: 'Composite (Right)',
    [PROFILE_TYPES.VISIBLE_RANGE]: 'Visible Range',
};

// Display modes
export const DISPLAY_MODES = {
    TOTAL_VOLUME: 'total',        // Single color bars
    BID_ASK: 'bid_ask',           // Stacked buy/sell bars
    DELTA: 'delta',               // Delta-colored bars
} as const;

export type DisplayMode = typeof DISPLAY_MODES[keyof typeof DISPLAY_MODES];

export interface Colors {
    // Volume bars
    VOLUME_BAR: string;
    VOLUME_BAR_LIGHT: string;
    BUY_VOLUME: string;
    SELL_VOLUME: string;

    // POC (Point of Control)
    POC: string;
    POC_LINE: string;
    POC_FILL: string;

    // Value Area
    VAH: string;
    VAL: string;
    VALUE_AREA_FILL: string;
    VALUE_AREA_BORDER: string;

    // High/Low Volume Nodes
    HVN: string;
    HVN_FILL: string;
    LVN: string;
    LVN_FILL: string;

    // Text
    TEXT_PRIMARY: string;
    TEXT_SECONDARY: string;
    TEXT_LABEL: string;

    // Background
    PROFILE_BACKGROUND: string;
    PROFILE_BORDER: string;
}

export const COLORS: Colors = {
    // Volume bars
    VOLUME_BAR: '#5C6BC0',            // Indigo for total volume
    VOLUME_BAR_LIGHT: 'rgba(92, 107, 192, 0.6)',
    BUY_VOLUME: '#26A69A',            // Green-teal for buy
    SELL_VOLUME: '#EF5350',           // Red for sell

    // POC (Point of Control)
    POC: '#FF9800',                   // Orange
    POC_LINE: '#FF9800',
    POC_FILL: 'rgba(255, 152, 0, 0.2)',

    // Value Area
    VAH: '#9C27B0',                   // Purple
    VAL: '#9C27B0',
    VALUE_AREA_FILL: 'rgba(156, 39, 176, 0.1)',
    VALUE_AREA_BORDER: 'rgba(156, 39, 176, 0.3)',

    // High/Low Volume Nodes
    HVN: '#7B1FA2',                   // Dark purple
    HVN_FILL: 'rgba(123, 31, 162, 0.3)',
    LVN: '#E1BEE7',                   // Light purple
    LVN_FILL: 'rgba(225, 190, 231, 0.2)',

    // Text
    TEXT_PRIMARY: '#D1D4DC',
    TEXT_SECONDARY: '#787B86',
    TEXT_LABEL: '#FFFFFF',

    // Background
    PROFILE_BACKGROUND: 'rgba(42, 46, 57, 0.3)',
    PROFILE_BORDER: 'rgba(255, 255, 255, 0.1)',
};

export type ProfilePosition = 'left' | 'right' | 'overlay';

export interface VolumeProfileSettings {
    // Profile type
    profileType: ProfileType;
    displayMode: DisplayMode;

    // Position and sizing
    position: ProfilePosition;
    width: number;
    opacity: number;
    rowHeight: 'auto' | number;

    // Components to show
    showPOC: boolean;
    showValueArea: boolean;
    showVAH: boolean;
    showVAL: boolean;
    showHVN: boolean;
    showLVN: boolean;
    extendPOC: boolean;

    // Value area settings
    valueAreaPercent: number;

    // Labels
    showVolumeLabels: boolean;
    showPriceLabels: boolean;
    fontSize: number;

    // Colors (can be overridden)
    volumeColor: string;
    pocColor: string;
    vahColor: string;
    valColor: string;
}

export const DEFAULT_SETTINGS: VolumeProfileSettings = {
    // Profile type
    profileType: PROFILE_TYPES.SESSION,
    displayMode: DISPLAY_MODES.TOTAL_VOLUME,

    // Position and sizing
    position: 'left',
    width: 150,
    opacity: 0.8,
    rowHeight: 'auto',

    // Components to show
    showPOC: true,
    showValueArea: true,
    showVAH: true,
    showVAL: true,
    showHVN: false,
    showLVN: false,
    extendPOC: true,

    // Value area settings
    valueAreaPercent: 70,

    // Labels
    showVolumeLabels: true,
    showPriceLabels: true,
    fontSize: 9,

    // Colors (can be overridden)
    volumeColor: COLORS.VOLUME_BAR,
    pocColor: COLORS.POC,
    vahColor: COLORS.VAH,
    valColor: COLORS.VAL,
};

/**
 * Format volume for display
 * @param volume - The volume number to format
 * @returns Formatted volume string
 */
export const formatVolume = (volume: number): string => {
    if (volume >= 10000000) return `${(volume / 10000000).toFixed(1)}Cr`;
    if (volume >= 100000) return `${(volume / 100000).toFixed(1)}L`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
};

/**
 * Get volume bar color based on delta
 * @param buyVolume - The buy volume
 * @param sellVolume - The sell volume
 * @param mode - The display mode
 * @returns Color string for the volume bar
 */
export const getVolumeBarColor = (
    buyVolume: number,
    sellVolume: number,
    mode: DisplayMode = DISPLAY_MODES.TOTAL_VOLUME
): string => {
    if (mode === DISPLAY_MODES.TOTAL_VOLUME) {
        return COLORS.VOLUME_BAR;
    }

    const delta = buyVolume - sellVolume;
    const total = buyVolume + sellVolume;
    const deltaPercent = total > 0 ? (delta / total) * 100 : 0;

    if (deltaPercent > 20) return COLORS.BUY_VOLUME;
    if (deltaPercent < -20) return COLORS.SELL_VOLUME;
    return COLORS.VOLUME_BAR;
};

export default {
    PROFILE_TYPES,
    PROFILE_TYPE_NAMES,
    DISPLAY_MODES,
    COLORS,
    DEFAULT_SETTINGS,
    formatVolume,
    getVolumeBarColor,
};
