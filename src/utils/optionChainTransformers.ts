/**
 * Option Chain Data Transformers
 * Utility functions for transforming and combining option chain data
 */

import logger from './logger';

// Month codes for option symbols (NSE format)
const MONTH_CODES: Record<number, string> = {
    1: 'JAN', 2: 'FEB', 3: 'MAR', 4: 'APR', 5: 'MAY', 6: 'JUN',
    7: 'JUL', 8: 'AUG', 9: 'SEP', 10: 'OCT', 11: 'NOV', 12: 'DEC'
};

// Reverse month codes
const MONTH_TO_NUM: Record<string, number> = Object.fromEntries(
    Object.entries(MONTH_CODES).map(([k, v]) => [v, parseInt(k)])
);

// Interfaces
export interface OptionLegData {
    symbol?: string;
    ltp?: number | string;
    prev_close?: number | string;
    open?: number | string;
    high?: number | string;
    low?: number | string;
    bid?: number | string;
    ask?: number | string;
    oi?: number | string;
    volume?: number | string;
    label?: string;
    lotsize?: number | string;
    lot_size?: number | string;
}

export interface ApiChainRow {
    strike: number | string;
    ce?: OptionLegData | null;
    pe?: OptionLegData | null;
}

export interface TransformedOptionData {
    symbol?: string;
    ltp: number;
    prevClose: number;
    open: number;
    high: number;
    low: number;
    bid: number;
    ask: number;
    oi: number;
    volume: number;
    label?: string;
    lotSize: number;
}

export interface TransformedChainRow {
    strike: number;
    ce: TransformedOptionData | null;
    pe: TransformedOptionData | null;
    straddlePremium: string;
}

export interface ExpiryTabInfo {
    display: string;
    dte: number;
    label: string;
}

export interface OHLCCandle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

export interface LegConfig {
    direction: 'buy' | 'sell';
    quantity?: number;
}

export interface StraddleConfig {
    underlying?: string;
    ceStrike?: number;
    peStrike?: number;
    expiry?: string | Date;
    ceSymbol?: string;
    peSymbol?: string;
}

/**
 * Parse expiry date string in DDMMMYY format to Date object
 * @param expiryStr - Expiry string like "30DEC25"
 * @returns Date object or null if invalid
 */
export const parseExpiryDate = (expiryStr: string): Date | null => {
    if (!expiryStr || expiryStr.length < 7) return null;

    const match = expiryStr.match(/^(\d{2})([A-Z]{3})(\d{2})$/);
    if (!match) return null;

    const [, dayStr, monthStr, yearStr] = match;
    const day = parseInt(dayStr, 10);
    const month = MONTH_TO_NUM[monthStr];
    const year = 2000 + parseInt(yearStr, 10);

    if (!month || isNaN(day) || isNaN(year)) return null;

    return new Date(year, month - 1, day);
};

/**
 * Format Date to DDMMMYY format for API
 * @param date - Date object
 * @returns Formatted string like "30DEC25"
 */
export const formatExpiryDate = (date: Date | null): string => {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = MONTH_CODES[date.getMonth() + 1];
    const year = String(date.getFullYear()).slice(-2);
    return `${day}${month}${year}`;
};

/**
 * Calculate days to expiry from expiry date string
 * @param expiryStr - Expiry string like "30DEC25"
 * @returns Days to expiry
 */
export const getDaysToExpiry = (expiryStr: string): number => {
    const expiryDate = parseExpiryDate(expiryStr);
    if (!expiryDate) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);

    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
};

/**
 * Get expiry label type (CW, NW, CM, etc.)
 * @param expiryStr - Expiry string
 * @param index - Index in expiry list
 * @returns Label like "CW", "NW", "CM", "NM"
 */
export const getExpiryLabel = (expiryStr: string, index: number): string => {
    const dte = getDaysToExpiry(expiryStr);
    if (index === 0) return 'CW'; // Current Week
    if (index === 1) return 'NW'; // Next Week
    if (dte <= 7) return 'W' + (index + 1);
    if (dte <= 35) return 'CM'; // Current Month
    return 'NM'; // Next Month
};

/**
 * Format expiry for TradingView-style tab display
 * @param expiryStr - Expiry string like "18DEC25"
 * @param index - Index in expiry list
 * @returns { display: "18 DEC '25", dte: 0, label: "CW" }
 */
export const formatExpiryTab = (expiryStr: string, index: number): ExpiryTabInfo => {
    const date = parseExpiryDate(expiryStr);
    if (!date) return { display: expiryStr, dte: 0, label: '' };

    const day = date.getDate();
    const month = date.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
    const year = date.getFullYear().toString().slice(-2);
    const dte = getDaysToExpiry(expiryStr);
    const label = getExpiryLabel(expiryStr, index);

    return { display: `${day} ${month} '${year}`, dte, label };
};

/**
 * Transform API option chain row to internal format
 * @param row - API row data
 * @returns Transformed row
 */
export const transformChainRow = (row: ApiChainRow): TransformedChainRow => ({
    strike: parseFloat(String(row.strike)),
    ce: row.ce ? {
        symbol: row.ce.symbol,
        ltp: parseFloat(String(row.ce.ltp || 0)),
        prevClose: parseFloat(String(row.ce.prev_close || 0)),
        open: parseFloat(String(row.ce.open || 0)),
        high: parseFloat(String(row.ce.high || 0)),
        low: parseFloat(String(row.ce.low || 0)),
        bid: parseFloat(String(row.ce.bid || 0)),
        ask: parseFloat(String(row.ce.ask || 0)),
        oi: parseInt(String(row.ce.oi || 0)),
        volume: parseInt(String(row.ce.volume || 0)),
        label: row.ce.label,
        lotSize: parseInt(String(row.ce.lotsize || row.ce.lot_size || 0))
    } : null,
    pe: row.pe ? {
        symbol: row.pe.symbol,
        ltp: parseFloat(String(row.pe.ltp || 0)),
        prevClose: parseFloat(String(row.pe.prev_close || 0)),
        open: parseFloat(String(row.pe.open || 0)),
        high: parseFloat(String(row.pe.high || 0)),
        low: parseFloat(String(row.pe.low || 0)),
        bid: parseFloat(String(row.pe.bid || 0)),
        ask: parseFloat(String(row.pe.ask || 0)),
        oi: parseInt(String(row.pe.oi || 0)),
        volume: parseInt(String(row.pe.volume || 0)),
        label: row.pe.label,
        lotSize: parseInt(String(row.pe.lotsize || row.pe.lot_size || 0))
    } : null,
    straddlePremium: (parseFloat(String(row.ce?.ltp || 0)) + parseFloat(String(row.pe?.ltp || 0))).toFixed(2)
});

/**
 * Combine CE and PE OHLC data into straddle/strangle premium
 * @param ceData - CE candle data
 * @param peData - PE candle data
 * @returns Combined OHLC data
 */
export const combinePremiumOHLC = (ceData: OHLCCandle[], peData: OHLCCandle[]): OHLCCandle[] => {
    if (!ceData?.length || !peData?.length) return [];

    const peMap = new Map<number, OHLCCandle>(peData.map(d => [d.time, d]));

    const combined: OHLCCandle[] = [];
    for (const ce of ceData) {
        const pe = peMap.get(ce.time);
        if (pe) {
            combined.push({
                time: ce.time,
                open: ce.open + pe.open,
                high: ce.high + pe.high,
                low: ce.low + pe.low,
                close: ce.close + pe.close,
                volume: (ce.volume || 0) + (pe.volume || 0)
            });
        }
    }

    return combined;
};

/**
 * Combine multiple leg OHLC data into strategy premium
 * Handles buy/sell direction for each leg
 * @param legDataArrays - Array of OHLC arrays for each leg
 * @param legConfigs - Leg configurations with direction and quantity
 * @returns Combined OHLC data
 */
export const combineMultiLegOHLC = (legDataArrays: OHLCCandle[][], legConfigs: LegConfig[]): OHLCCandle[] => {
    if (!legDataArrays?.length || !legConfigs?.length) return [];
    if (legDataArrays.length !== legConfigs.length) {
        logger.warn('[combineMultiLegOHLC] Mismatch between data arrays and configs');
        return [];
    }

    const legMaps = legDataArrays.map(data =>
        new Map<number, OHLCCandle>((data || []).map(candle => [candle.time, candle]))
    );

    const allTimes = new Set<number>();
    legDataArrays.forEach(data => {
        if (data) data.forEach(d => allTimes.add(d.time));
    });

    const combined: OHLCCandle[] = [];
    const sortedTimes = Array.from(allTimes).sort((a, b) => a - b);

    for (const time of sortedTimes) {
        const hasAllLegs = legMaps.every(map => map.has(time));
        if (!hasAllLegs) continue;

        let open = 0, high = 0, low = 0, close = 0, volume = 0;

        legConfigs.forEach((leg, i) => {
            const candle = legMaps[i].get(time)!;
            const multiplier = leg.direction === 'buy' ? 1 : -1;
            const qty = leg.quantity || 1;

            open += multiplier * qty * candle.open;
            high += multiplier * qty * candle.high;
            low += multiplier * qty * candle.low;
            close += multiplier * qty * candle.close;
            volume += candle.volume || 0;
        });

        const allPrices = [open, high, low, close];
        const trueHigh = Math.max(...allPrices);
        const trueLow = Math.min(...allPrices);

        combined.push({
            time,
            open,
            high: trueHigh,
            low: trueLow,
            close,
            volume
        });
    }

    return combined;
};

/**
 * Format straddle display name
 * @param config - Straddle config with ceSymbol, peSymbol, etc.
 * @returns Display name
 */
export const formatStraddleName = (config: StraddleConfig | null): string => {
    if (!config) return '';

    const { underlying, ceStrike, peStrike, expiry } = config;

    let expiryStr: string;
    if (typeof expiry === 'string') {
        expiryStr = expiry;
    } else if (expiry instanceof Date) {
        expiryStr = formatExpiryDate(expiry);
    } else {
        expiryStr = '';
    }

    const day = expiryStr.slice(0, 2);
    const month = expiryStr.slice(2, 5);

    if (ceStrike === peStrike) {
        return `${underlying} ${ceStrike} Straddle (${day} ${month})`;
    } else {
        return `${underlying} ${ceStrike}/${peStrike} Strangle (${day} ${month})`;
    }
};

export default {
    parseExpiryDate,
    formatExpiryDate,
    getDaysToExpiry,
    getExpiryLabel,
    formatExpiryTab,
    transformChainRow,
    combinePremiumOHLC,
    combineMultiLegOHLC,
    formatStraddleName,
};
