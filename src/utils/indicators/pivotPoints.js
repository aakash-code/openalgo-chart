/**
 * Pivot Points Indicator
 * Calculates support and resistance levels based on previous session's OHLC
 * 
 * Types supported:
 * - Classic (Standard): Most common method
 * - Fibonacci: Uses Fibonacci ratios
 * - Woodie: Gives more weight to closing price
 * - Camarilla: Intraday trading levels
 *
 * @param {Array} data - Array of OHLC data points with {time, open, high, low, close}
 * @param {string} type - Pivot type: 'classic', 'fibonacci', 'woodie', 'camarilla'
 * @param {string} timeframe - Session timeframe: 'daily', 'weekly', 'monthly'
 * @returns {Object} { pivot: [], r1: [], r2: [], r3: [], s1: [], s2: [], s3: [] }
 */
export function calculatePivotPoints(data, type = 'classic', timeframe = 'daily') {
    if (!Array.isArray(data) || data.length < 2) {
        console.warn('[PivotPoints] Insufficient data:', data?.length);
        return { pivot: [], r1: [], r2: [], r3: [], s1: [], s2: [], s3: [] };
    }

    const result = {
        pivot: [],
        r1: [],
        r2: [],
        r3: [],
        s1: [],
        s2: [],
        s3: []
    };

    // Group data by session (day/week/month)
    const sessions = groupBySession(data, timeframe);

    if (sessions.length < 2) {
        console.warn('[PivotPoints] Need at least 2 sessions (days/weeks) to calculate pivots. Found:', sessions.length);
        return result;
    }


    // Calculate pivots for each session based on previous session's OHLC
    for (let i = 1; i < sessions.length; i++) {
        const prevSession = sessions[i - 1];
        const currentSession = sessions[i];

        // Get previous session OHLC
        const high = prevSession.high;
        const low = prevSession.low;
        const close = prevSession.close;
        const open = prevSession.open;
        // Get current session's open for Woodie formula
        const currOpen = currentSession.open;

        // Calculate pivot levels based on type
        const levels = calculateLevels(high, low, close, open, currOpen, type);

        // Add pivot levels for each bar in current session
        for (const bar of currentSession.bars) {
            result.pivot.push({ time: bar.time, value: levels.pivot });
            result.r1.push({ time: bar.time, value: levels.r1 });
            result.r2.push({ time: bar.time, value: levels.r2 });
            result.r3.push({ time: bar.time, value: levels.r3 });
            result.s1.push({ time: bar.time, value: levels.s1 });
            result.s2.push({ time: bar.time, value: levels.s2 });
            result.s3.push({ time: bar.time, value: levels.s3 });
        }
    }

    return result;
}

/**
 * Group OHLC data by session (day/week/month)
 */
function groupBySession(data, timeframe) {
    const sessions = [];
    let currentSession = null;

    for (const bar of data) {
        const sessionKey = getSessionKey(bar.time, timeframe);

        if (!currentSession || currentSession.key !== sessionKey) {
            // Start new session
            if (currentSession) {
                sessions.push(currentSession);
            }
            currentSession = {
                key: sessionKey,
                open: bar.open,
                high: bar.high,
                low: bar.low,
                close: bar.close,
                bars: [bar]
            };
        } else {
            // Update current session
            currentSession.high = Math.max(currentSession.high, bar.high);
            currentSession.low = Math.min(currentSession.low, bar.low);
            currentSession.close = bar.close;
            currentSession.bars.push(bar);
        }
    }

    // Don't forget the last session
    if (currentSession) {
        sessions.push(currentSession);
    }

    return sessions;
}

/**
 * Get session key based on timeframe
 */
function getSessionKey(timestamp, timeframe) {
    let date;

    // Handle Lightweight Charts business day object { year, month, day }
    if (typeof timestamp === 'object' && timestamp !== null && timestamp.year) {
        date = new Date(Date.UTC(timestamp.year, timestamp.month - 1, timestamp.day));
    }
    // Handle string date format YYYY-MM-DD
    else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
    }
    // Handle numeric timestamp (seconds or milliseconds)
    else if (typeof timestamp === 'number') {
        const ms = timestamp > 1e12 ? timestamp : timestamp * 1000;
        date = new Date(ms);
    } else {
        console.warn('[PivotPoints] Invalid timestamp format:', timestamp);
        return '';
    }

    if (isNaN(date.getTime())) {
        console.warn('[PivotPoints] Invalid date created from:', timestamp);
        return '';
    }

    switch (timeframe) {
        case 'weekly':
            // Get the Monday of the week
            const dayOfWeek = date.getUTCDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(date);
            monday.setUTCDate(date.getUTCDate() + mondayOffset);
            return `${monday.getUTCFullYear()}-W${getWeekNumber(monday)}`;

        case 'monthly':
            return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;

        case 'daily':
        default:
            return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
    }
}



/**
 * Get ISO week number
 */
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Calculate pivot levels based on type
 * @param {number} high - Previous session high
 * @param {number} low - Previous session low  
 * @param {number} close - Previous session close
 * @param {number} open - Previous session open
 * @param {number} currOpen - Current session open (for Woodie)
 * @param {string} type - Pivot type
 */
function calculateLevels(high, low, close, open, currOpen, type) {
    let pivot, r1, r2, r3, s1, s2, s3;
    const range = high - low;


    switch (type) {
        case 'fibonacci':
            // TradingView: P = (H + L + C) / 3
            pivot = (high + low + close) / 3;
            r1 = pivot + (0.382 * range);
            r2 = pivot + (0.618 * range);
            r3 = pivot + range;
            s1 = pivot - (0.382 * range);
            s2 = pivot - (0.618 * range);
            s3 = pivot - range;
            break;

        case 'woodie':
            // TradingView Woodie: P = (H + L + 2 * currOpen) / 4
            // Key difference: uses CURRENT session's open, not previous close
            pivot = (high + low + 2 * currOpen) / 4;
            r1 = (2 * pivot) - low;
            r2 = pivot + range;
            r3 = high + 2 * (pivot - low);
            s1 = (2 * pivot) - high;
            s2 = pivot - range;
            s3 = low - 2 * (high - pivot);
            break;

        case 'camarilla':
            // TradingView Camarilla: P = (H + L + C) / 3
            pivot = (high + low + close) / 3;
            r1 = close + (range * 1.1 / 12);
            r2 = close + (range * 1.1 / 6);
            r3 = close + (range * 1.1 / 4);
            s1 = close - (range * 1.1 / 12);
            s2 = close - (range * 1.1 / 6);
            s3 = close - (range * 1.1 / 4);
            break;

        case 'traditional':
            // TradingView Traditional: Different R3/S3 formulas
            pivot = (high + low + close) / 3;
            r1 = (2 * pivot) - low;
            s1 = (2 * pivot) - high;
            r2 = pivot + range;
            s2 = pivot - range;
            r3 = (2 * pivot) + (high - 2 * low);  // P*2 + (H - 2*L)
            s3 = (2 * pivot) - (2 * high - low);  // P*2 - (2*H - L)
            break;

        case 'dm':
            // TradingView DM (Demark): Conditional X calculation
            let x;
            if (open === close) {
                x = high + low + 2 * close;
            } else if (close > open) {
                x = 2 * high + low + close;
            } else {
                x = 2 * low + high + close;
            }
            pivot = x / 4;
            r1 = x / 2 - low;
            s1 = x / 2 - high;
            // DM only has R1/S1, set others equal to pivot
            r2 = pivot;
            r3 = pivot;
            s2 = pivot;
            s3 = pivot;
            break;

        case 'classic':
        default:
            // TradingView Classic: P = (H + L + C) / 3
            pivot = (high + low + close) / 3;
            r1 = (2 * pivot) - low;
            s1 = (2 * pivot) - high;
            r2 = pivot + range;
            s2 = pivot - range;
            r3 = pivot + 2 * range;
            s3 = pivot - 2 * range;
            break;
    }

    return { pivot, r1, r2, r3, s1, s2, s3 };
}

export default calculatePivotPoints;
