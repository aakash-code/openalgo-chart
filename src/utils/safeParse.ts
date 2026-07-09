/**
 * Safe Parsing Utilities
 *
 * Helper functions to safely parse numbers and other data types,
 * handling NaN, null, undefined, and errors gracefully.
 */

/**
 * Safely parses a float value.
 * @param value - The value to parse
 * @param fallback - The fallback value if parsing fails (default: 0)
 * @returns The parsed float or the fallback
 */
export const safeParseFloat = (value: unknown, fallback: number = 0): number => {
    if (value === null || value === undefined) return fallback;
    const parsed = parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Safely parses an integer value.
 * @param value - The value to parse
 * @param fallback - The fallback value if parsing fails (default: 0)
 * @param radix - A number (from 2 to 36) that represents the numeral system to be used (default: 10)
 * @returns The parsed integer or the fallback
 */
export const safeParseInt = (value: unknown, fallback: number = 0, radix: number = 10): number => {
    if (value === null || value === undefined) return fallback;
    const parsed = parseInt(String(value), radix);
    return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Safely parse a JSON string with a fallback value.
 * @param value - The JSON string to parse
 * @param fallback - The fallback value if parsing fails
 * @returns The parsed object/array or the fallback
 */
export const safeParseJSON = <T = unknown>(value: string | null | undefined, fallback: T | null = null): T | null => {
    if (!value || typeof value !== 'string') return fallback;
    try {
        return JSON.parse(value) as T;
    } catch (e) {
        console.warn('safeParseJSON failed:', e);
        return fallback;
    }
};

export default {
    safeParseFloat,
    safeParseInt,
    safeParseJSON
};
