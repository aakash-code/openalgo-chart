/**
 * Time unit character type
 */
export type TimeUnit = 'm' | 'h' | 'd' | 'w' | 'M';

/**
 * Mapping of time units to their second multipliers
 */
export interface TimeUnitMultiplierMap {
    m: number;
    h: number;
    d: number;
    w: number;
    M: number;
}

/**
 * Multiplier map for converting time units to seconds
 */
const multiplierMap: TimeUnitMultiplierMap = {
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
    M: 2592000, // Monthly timeframe approximated as 30 days
};

/**
 * Convert an interval string to seconds
 * @param interval - The interval string (e.g., '1m', '1h', '1d')
 * @returns The interval in seconds
 */
export const intervalToSeconds = (interval: string | null | undefined): number => {
    if (!interval || typeof interval !== 'string') {
        return 60;
    }

    const trimmed = interval.trim();
    const unit = trimmed.slice(-1) as TimeUnit;
    const value = parseFloat(trimmed.slice(0, -1));

    if (Number.isNaN(value) || value <= 0) {
        return 60;
    }

    const normalizedUnit: TimeUnit = (multiplierMap[unit] ? unit : unit.toLowerCase()) as TimeUnit;
    const multiplier = multiplierMap[normalizedUnit] ?? 60;

    return value * multiplier;
};
