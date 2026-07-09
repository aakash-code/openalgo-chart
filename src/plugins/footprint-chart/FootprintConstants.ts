/**
 * Footprint Chart Constants and Configuration
 * Colors, presets, and default settings for footprint visualization
 */

// Footprint preset type
export type FootprintPreset =
    | 'delta_profile'
    | 'bid_ask_profile'
    | 'volume_profile'
    | 'focus_footprint'
    | 'lopsided_footprint'
    | 'classic';

// Footprint display presets
export const FOOTPRINT_PRESETS: Record<string, FootprintPreset> = {
    DELTA_PROFILE: 'delta_profile',
    BID_ASK_PROFILE: 'bid_ask_profile',
    VOLUME_PROFILE: 'volume_profile',
    FOCUS_FOOTPRINT: 'focus_footprint',
    LOPSIDED_FOOTPRINT: 'lopsided_footprint',
    CLASSIC: 'classic',
} as const;

// Preset display names
export const PRESET_NAMES: Record<FootprintPreset, string> = {
    delta_profile: 'Delta Profile',
    bid_ask_profile: 'Bid-Ask Profile',
    volume_profile: 'Volume Profile',
    focus_footprint: 'Focus Footprint',
    lopsided_footprint: 'Lopsided Footprint',
    classic: 'Classic',
};

// Preset descriptions
export const PRESET_DESCRIPTIONS: Record<FootprintPreset, string> = {
    delta_profile: 'Shows delta (buy-sell) value in each cell with gradient colors',
    bid_ask_profile: 'Shows stacked buy/sell volume bars side by side',
    volume_profile: 'Shows total volume at each price level',
    focus_footprint: 'Highlights high volume levels, dims low activity',
    lopsided_footprint: 'Emphasizes imbalance direction with arrows',
    classic: 'Traditional bid x ask numeric display',
};

// Color interface
export interface FootprintColors {
    // Delta colors (gradient from sell to buy dominant)
    DELTA_STRONG_BUY: string;
    DELTA_BUY: string;
    DELTA_NEUTRAL: string;
    DELTA_SELL: string;
    DELTA_STRONG_SELL: string;

    // Volume bars
    BUY_BAR: string;
    SELL_BAR: string;
    BUY_BAR_LIGHT: string;
    SELL_BAR_LIGHT: string;

    // Imbalance highlighting
    IMBALANCE_BUY: string;
    IMBALANCE_SELL: string;
    IMBALANCE_STACKED: string;

    // POC and Value Area
    POC: string;
    VAH: string;
    VAL: string;
    VALUE_AREA_FILL: string;

    // High/Low Volume Nodes
    HVN: string;
    LVN: string;

    // Cell backgrounds
    CELL_BACKGROUND: string;
    CELL_BORDER: string;
    CELL_HOVER: string;

    // Text
    TEXT_PRIMARY: string;
    TEXT_SECONDARY: string;
    TEXT_LIGHT: string;

    // Candle body reference
    CANDLE_UP: string;
    CANDLE_DOWN: string;
}

// Color schemes
export const COLORS: FootprintColors = {
    // Delta colors (gradient from sell to buy dominant)
    DELTA_STRONG_BUY: '#00C853',     // Strong buy pressure (delta > +50%)
    DELTA_BUY: '#4CAF50',             // Buy dominant
    DELTA_NEUTRAL: '#9E9E9E',         // Balanced
    DELTA_SELL: '#F44336',            // Sell dominant
    DELTA_STRONG_SELL: '#D32F2F',     // Strong sell pressure (delta < -50%)

    // Volume bars
    BUY_BAR: '#26A69A',               // Green-teal for buy volume
    SELL_BAR: '#EF5350',              // Red for sell volume
    BUY_BAR_LIGHT: 'rgba(38, 166, 154, 0.6)',
    SELL_BAR_LIGHT: 'rgba(239, 83, 80, 0.6)',

    // Imbalance highlighting
    IMBALANCE_BUY: '#FFD54F',         // Yellow-gold for buy imbalance
    IMBALANCE_SELL: '#FFB74D',        // Orange for sell imbalance
    IMBALANCE_STACKED: '#FF5722',     // Deep orange for stacked imbalances

    // POC and Value Area
    POC: '#2196F3',                   // Blue for Point of Control
    VAH: '#9C27B0',                   // Purple for Value Area High
    VAL: '#9C27B0',                   // Purple for Value Area Low
    VALUE_AREA_FILL: 'rgba(156, 39, 176, 0.1)',

    // High/Low Volume Nodes
    HVN: '#7B1FA2',                   // High Volume Node - dark purple
    LVN: '#E1BEE7',                   // Low Volume Node - light purple

    // Cell backgrounds
    CELL_BACKGROUND: 'rgba(42, 46, 57, 0.8)',
    CELL_BORDER: 'rgba(255, 255, 255, 0.1)',
    CELL_HOVER: 'rgba(255, 255, 255, 0.15)',

    // Text
    TEXT_PRIMARY: '#D1D4DC',
    TEXT_SECONDARY: '#787B86',
    TEXT_LIGHT: '#FFFFFF',

    // Candle body reference
    CANDLE_UP: '#26A69A',
    CANDLE_DOWN: '#EF5350',
};

// Footprint settings interface
export interface FootprintSettings {
    preset: FootprintPreset;
    cellHeight: 'auto' | number;
    cellWidth: number;
    showImbalances: boolean;
    imbalanceRatio: number;
    showPOC: boolean;
    showValueArea: boolean;
    valueAreaPercent: number;
    showDeltaText: boolean;
    showVolumeText: boolean;
    fontSize: number;
    opacity: number;
    showOnlyOnHover: boolean;
    autoTickSize: boolean;
    customTickSize: number | null;
    highlightPOC: boolean;
    fadeOldBars: boolean;
    maxBarsToShow: number;
}

// Default settings
export const DEFAULT_SETTINGS: FootprintSettings = {
    preset: FOOTPRINT_PRESETS.DELTA_PROFILE,
    cellHeight: 'auto',              // 'auto' or number in pixels
    cellWidth: 80,                   // Width of footprint column
    showImbalances: true,
    imbalanceRatio: 3,               // Minimum ratio for imbalance detection
    showPOC: true,
    showValueArea: false,
    valueAreaPercent: 70,
    showDeltaText: true,
    showVolumeText: true,
    fontSize: 10,
    opacity: 0.9,
    showOnlyOnHover: false,
    autoTickSize: true,
    customTickSize: null,
    highlightPOC: true,
    fadeOldBars: true,               // Fade footprints as they age
    maxBarsToShow: 50,               // Maximum number of footprint bars to render
};

// Cell size preset interface
export interface CellSizePreset {
    width: number;
    fontSize: number;
}

// Cell size presets
export const CELL_SIZE_PRESETS: Record<string, CellSizePreset> = {
    SMALL: { width: 60, fontSize: 8 },
    MEDIUM: { width: 80, fontSize: 10 },
    LARGE: { width: 100, fontSize: 12 },
    XLARGE: { width: 120, fontSize: 14 },
};

// Tick size tier interface
export interface TickSizeTier {
    maxPrice: number;
    tickSize: number;
}

// Tick size presets based on price
export const TICK_SIZE_BY_PRICE: TickSizeTier[] = [
    { maxPrice: 50, tickSize: 0.05 },
    { maxPrice: 250, tickSize: 0.05 },
    { maxPrice: 500, tickSize: 0.10 },
    { maxPrice: 1000, tickSize: 0.25 },
    { maxPrice: 5000, tickSize: 0.50 },
    { maxPrice: 10000, tickSize: 1.00 },
    { maxPrice: Infinity, tickSize: 5.00 },
];

/**
 * Get tick size for a given price
 * @param price - The price to get tick size for
 * @returns The tick size for the given price
 */
export const getTickSize = (price: number): number => {
    for (const tier of TICK_SIZE_BY_PRICE) {
        if (price <= tier.maxPrice) {
            return tier.tickSize;
        }
    }
    return 5.00;
};

/**
 * Get delta color based on delta percentage
 * @param deltaPercent - Delta as percentage of total volume
 * @returns Color hex code
 */
export const getDeltaColor = (deltaPercent: number): string => {
    if (deltaPercent >= 50) return COLORS.DELTA_STRONG_BUY;
    if (deltaPercent >= 20) return COLORS.DELTA_BUY;
    if (deltaPercent <= -50) return COLORS.DELTA_STRONG_SELL;
    if (deltaPercent <= -20) return COLORS.DELTA_SELL;
    return COLORS.DELTA_NEUTRAL;
};

/**
 * Get gradient color for delta visualization
 * @param deltaPercent - Delta as percentage (-100 to +100)
 * @returns RGBA color string
 */
export const getDeltaGradient = (deltaPercent: number): string => {
    // Clamp to -100 to +100
    const clamped = Math.max(-100, Math.min(100, deltaPercent));

    // Normalize to 0-1 range (0 = full sell, 0.5 = neutral, 1 = full buy)
    const normalized = (clamped + 100) / 200;

    // Interpolate between sell red and buy green
    const r = Math.round(255 * (1 - normalized));
    const g = Math.round(255 * normalized);
    const b = 50;
    const a = 0.7 + (Math.abs(clamped) / 100) * 0.3; // More opaque for stronger signals

    return `rgba(${r}, ${g}, ${b}, ${a})`;
};

// Imbalance type
export type ImbalanceType = 'buy' | 'sell';

/**
 * Get imbalance highlight color
 * @param type - 'buy' or 'sell'
 * @param strength - Imbalance strength (0-3)
 * @returns Color string with alpha
 */
export const getImbalanceColor = (type: ImbalanceType, strength: number = 1): string => {
    const baseColor = type === 'buy' ? COLORS.IMBALANCE_BUY : COLORS.IMBALANCE_SELL;
    const alpha = Math.min(0.3 + strength * 0.2, 0.9);
    return baseColor.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
};

/**
 * Format volume for display
 * @param volume - The volume to format
 * @returns Formatted volume string
 */
export const formatVolume = (volume: number): string => {
    if (volume >= 10000000) return `${(volume / 10000000).toFixed(1)}Cr`;
    if (volume >= 100000) return `${(volume / 100000).toFixed(1)}L`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
};

/**
 * Format delta for display
 * @param delta - The delta value to format
 * @returns Formatted delta string with sign
 */
export const formatDelta = (delta: number): string => {
    const prefix = delta > 0 ? '+' : '';
    if (Math.abs(delta) >= 10000000) return `${prefix}${(delta / 10000000).toFixed(1)}Cr`;
    if (Math.abs(delta) >= 100000) return `${prefix}${(delta / 100000).toFixed(1)}L`;
    if (Math.abs(delta) >= 1000) return `${prefix}${(delta / 1000).toFixed(1)}K`;
    return `${prefix}${delta}`;
};

export default {
    FOOTPRINT_PRESETS,
    PRESET_NAMES,
    PRESET_DESCRIPTIONS,
    COLORS,
    DEFAULT_SETTINGS,
    CELL_SIZE_PRESETS,
    TICK_SIZE_BY_PRICE,
    getTickSize,
    getDeltaColor,
    getDeltaGradient,
    getImbalanceColor,
    formatVolume,
    formatDelta,
};
