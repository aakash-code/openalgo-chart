/**
 * Power Trades Constants
 * Colors and settings for Power Trades Scanner visualization
 */

// ==================== TYPES ====================

export interface PowerTradesColors {
    BUY_BUBBLE: string;
    BUY_BUBBLE_FILL: string;
    SELL_BUBBLE: string;
    SELL_BUBBLE_FILL: string;
    NEUTRAL: string;
    NEUTRAL_FILL: string;
    TEXT_PRIMARY: string;
    TEXT_SECONDARY: string;
    ALERT_HIGH: string;
    ALERT_HIGH_FILL: string;
}

export interface PowerTradesSettings {
    // Detection settings
    enabled: boolean;
    volumeThreshold: number;
    timeWindowMs: number;

    // Size thresholds for bubble sizing
    minBubbleRadius: number;
    maxBubbleRadius: number;

    // Alert thresholds
    alertVolumeMultiplier: number;

    // Display options
    showBubbles: boolean;
    showLabels: boolean;
    showLines: boolean;
    showHistory: boolean;
    maxHistoryCount: number;

    // Animation
    animateBubbles: boolean;
    pulseOnNew: boolean;

    // Styling
    opacity: number;
    fontSize: number;

    // Filtering
    showBuyOnly: boolean;
    showSellOnly: boolean;
}

export type TradeSide = 'buy' | 'sell' | 'neutral';

export interface BubbleColors {
    stroke: string;
    fill: string;
}

// ==================== CONSTANTS ====================

export const COLORS: PowerTradesColors = {
    // Trade markers
    BUY_BUBBLE: '#26A69A',           // Green-teal for buy trades
    BUY_BUBBLE_FILL: 'rgba(38, 166, 154, 0.3)',
    SELL_BUBBLE: '#EF5350',          // Red for sell trades
    SELL_BUBBLE_FILL: 'rgba(239, 83, 80, 0.3)',

    // Neutral
    NEUTRAL: '#5C6BC0',              // Indigo for neutral
    NEUTRAL_FILL: 'rgba(92, 107, 192, 0.3)',

    // Text
    TEXT_PRIMARY: '#FFFFFF',
    TEXT_SECONDARY: '#D1D4DC',

    // Alert
    ALERT_HIGH: '#FF9800',           // Orange for very large trades
    ALERT_HIGH_FILL: 'rgba(255, 152, 0, 0.4)',
};

export const DEFAULT_SETTINGS: PowerTradesSettings = {
    // Detection settings
    enabled: true,
    volumeThreshold: 100,            // Minimum volume for power trade
    timeWindowMs: 5000,              // 5 second aggregation window

    // Size thresholds for bubble sizing
    minBubbleRadius: 8,
    maxBubbleRadius: 30,

    // Alert thresholds
    alertVolumeMultiplier: 3,        // 3x threshold = high alert

    // Display options
    showBubbles: true,
    showLabels: true,
    showLines: false,                // Lines connecting to price
    showHistory: true,               // Show historical power trades
    maxHistoryCount: 50,             // Max power trades to display

    // Animation
    animateBubbles: true,
    pulseOnNew: true,

    // Styling
    opacity: 0.8,
    fontSize: 9,

    // Filtering
    showBuyOnly: false,
    showSellOnly: false,
};

/**
 * Format volume for display
 */
export const formatVolume = (volume: number): string => {
    if (volume >= 10000000) return `${(volume / 10000000).toFixed(1)}Cr`;
    if (volume >= 100000) return `${(volume / 100000).toFixed(1)}L`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
};

/**
 * Get bubble color based on trade direction
 */
export const getBubbleColor = (side: TradeSide, isHighAlert: boolean = false): BubbleColors => {
    if (isHighAlert) {
        return {
            stroke: COLORS.ALERT_HIGH,
            fill: COLORS.ALERT_HIGH_FILL,
        };
    }

    if (side === 'buy') {
        return {
            stroke: COLORS.BUY_BUBBLE,
            fill: COLORS.BUY_BUBBLE_FILL,
        };
    } else if (side === 'sell') {
        return {
            stroke: COLORS.SELL_BUBBLE,
            fill: COLORS.SELL_BUBBLE_FILL,
        };
    }

    return {
        stroke: COLORS.NEUTRAL,
        fill: COLORS.NEUTRAL_FILL,
    };
};

/**
 * Calculate bubble radius based on volume
 */
export const calculateBubbleRadius = (
    volume: number,
    minVolume: number,
    maxVolume: number,
    minRadius: number,
    maxRadius: number
): number => {
    if (maxVolume === minVolume) return (minRadius + maxRadius) / 2;

    const normalized = (volume - minVolume) / (maxVolume - minVolume);
    return minRadius + normalized * (maxRadius - minRadius);
};

export default {
    COLORS,
    DEFAULT_SETTINGS,
    formatVolume,
    getBubbleColor,
    calculateBubbleRadius,
};
