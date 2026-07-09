/**
 * Formatters Utility
 * Centralized formatting utilities for currency, numbers, percentages, and quantities
 * Eliminates 11+ duplicate formatCurrency implementations across components
 */

/**
 * Options for currency formatting
 */
export interface CurrencyFormatOptions {
    /** Number of decimal places (default: 2) */
    decimals?: number;
    /** Locale for formatting (default: 'en-IN') */
    locale?: string;
    /** Whether to show currency symbol (default: false) */
    showSymbol?: boolean;
    /** Currency symbol (default: '₹') */
    symbol?: string;
}

/**
 * Result of P&L formatting
 */
export interface PnLFormatResult {
    /** Formatted text with sign */
    text: string;
    /** CSS color variable for the value */
    color: string;
    /** CSS class name ('positive' or 'negative') */
    className: 'positive' | 'negative';
    /** Numeric value */
    value: number;
}

/**
 * Format currency value with locale-aware formatting
 * @param value - Value to format
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export const formatCurrency = (
    value: number | string | null | undefined,
    options: CurrencyFormatOptions = {}
): string => {
    const {
        decimals = 2,
        locale = 'en-IN',
        showSymbol = false,
        symbol = '₹'
    } = options;

    if (value === null || value === undefined) return '0.00';

    const num = parseFloat(String(value));
    if (!Number.isFinite(num)) return '0.00';

    const formatted = num.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });

    return showSymbol ? `${symbol}${formatted}` : formatted;
};

/**
 * Format P&L with color indication
 * @param value - P&L value
 * @param showSign - Show +/- sign
 * @returns Object with text, color, className, and value
 */
export const formatPnL = (
    value: number | string,
    showSign: boolean = true
): PnLFormatResult => {
    const num = parseFloat(String(value)) || 0;
    const formatted = formatCurrency(Math.abs(num));
    const sign = num >= 0 ? '+' : '-';

    return {
        text: showSign ? `${sign}${formatted}` : formatted,
        color: num >= 0 ? 'var(--tv-color-up)' : 'var(--tv-color-down)',
        className: num >= 0 ? 'positive' : 'negative',
        value: num
    };
};

/**
 * Format percentage value
 * @param value - Value to format
 * @param decimals - Number of decimal places
 * @param showSign - Whether to show +/- sign
 * @returns Formatted percentage string
 */
export const formatPercent = (
    value: number | string,
    decimals: number = 2,
    showSign: boolean = false
): string => {
    const num = parseFloat(String(value));
    if (!Number.isFinite(num)) return '0.00%';

    const sign = showSign && num > 0 ? '+' : '';
    return `${sign}${num.toFixed(decimals)}%`;
};

/**
 * Format quantity with lot size information
 * @param qty - Quantity
 * @param lotSize - Lot size (default: 1)
 * @returns Formatted string like "100 (2L)" for 2 lots
 */
export const formatQuantity = (
    qty: number | string,
    lotSize: number = 1
): string => {
    const quantity = parseInt(String(qty), 10) || 0;
    if (lotSize > 1) {
        const lots = Math.floor(quantity / lotSize);
        return `${quantity} (${lots}L)`;
    }
    return String(quantity);
};

/**
 * Format price with appropriate decimal places
 * @param price - Price to format
 * @param decimals - Decimal places (default: 2)
 * @returns Formatted price string
 */
export const formatPrice = (
    price: number | string,
    decimals: number = 2
): string => {
    const num = parseFloat(String(price));
    if (!Number.isFinite(num)) return '0.00';
    return num.toFixed(decimals);
};

/**
 * Format large numbers with K/L/Cr suffixes (Indian notation)
 * @param value - Value to format
 * @param decimals - Decimal places for suffix numbers
 * @returns Formatted string like "1.5L" or "2.3Cr"
 */
export const formatCompactNumber = (
    value: number | string,
    decimals: number = 2
): string => {
    const num = parseFloat(String(value));
    if (!Number.isFinite(num)) return '0';

    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';

    if (abs >= 10000000) {
        // Crores (1 Cr = 10,000,000)
        return `${sign}${(abs / 10000000).toFixed(decimals)}Cr`;
    } else if (abs >= 100000) {
        // Lakhs (1 L = 100,000)
        return `${sign}${(abs / 100000).toFixed(decimals)}L`;
    } else if (abs >= 1000) {
        // Thousands
        return `${sign}${(abs / 1000).toFixed(decimals)}K`;
    }

    return String(num);
};

/**
 * Format volume with compact notation
 * @param volume - Volume to format
 * @returns Formatted volume string
 */
export const formatVolume = (volume: number | string): string => {
    return formatCompactNumber(volume, 1);
};

export default {
    formatCurrency,
    formatPnL,
    formatPercent,
    formatQuantity,
    formatPrice,
    formatCompactNumber,
    formatVolume,
};
