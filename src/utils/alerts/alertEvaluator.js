/**
 * Alert Evaluator
 * Evaluates indicator alert conditions and determines if alerts should trigger
 */

import { ALERT_CONDITION_TYPES } from './alertConditions.js';
import logger from '../logger.js';

export class AlertEvaluator {
    constructor() {
        /**
         * Track previous values for stateful evaluation
         * Map<alertId, previousValue>
         */
        this.previousValues = new Map();
    }

    /**
     * Evaluate an indicator alert condition
     * @param {Object} condition - Alert condition configuration
     * @param {Object} currentData - Current bar data with indicator values
     * @param {Object} previousData - Previous bar data (for crossing detection)
     * @param {number} currentPrice - Current price (for price-based comparisons)
     * @param {number} previousPrice - Previous price
     * @returns {boolean} - Whether alert should trigger
     */
    evaluate(condition, currentData, previousData, currentPrice = null, previousPrice = null) {
        const { type, indicator, series, value, series1, series2, zone, comparison, requiresPrice } = condition;

        try {
            // Get current and previous indicator values
            const currentIndicator = currentData[indicator];
            const previousIndicator = previousData[indicator];

            // Validate data availability
            if (!currentIndicator) {
                logger.debug(`[AlertEvaluator] Missing current data for indicator: ${indicator}`);
                return false;
            }

            switch (type) {
                case ALERT_CONDITION_TYPES.CROSSES_ABOVE:
                    if (requiresPrice && comparison) {
                        // Price crosses above indicator value (e.g., price crosses VWAP)
                        const threshold = currentIndicator[comparison];
                        return this.checkCrossAbove(currentPrice, previousPrice, threshold);
                    } else if (comparison) {
                        // One indicator series crosses above another (e.g., price crosses upper band)
                        const currentValue = currentIndicator[series];
                        const previousValue = previousIndicator?.[series];
                        const threshold = currentIndicator[comparison];
                        return this.checkCrossAbove(currentValue, previousValue, threshold);
                    } else {
                        // Indicator crosses above a fixed value (e.g., RSI > 70)
                        const currentValue = currentIndicator[series];
                        const previousValue = previousIndicator?.[series];
                        return this.checkCrossAbove(currentValue, previousValue, value);
                    }

                case ALERT_CONDITION_TYPES.CROSSES_BELOW:
                    if (requiresPrice && comparison) {
                        const threshold = currentIndicator[comparison];
                        return this.checkCrossBelow(currentPrice, previousPrice, threshold);
                    } else if (comparison) {
                        const currentValue = currentIndicator[series];
                        const previousValue = previousIndicator?.[series];
                        const threshold = currentIndicator[comparison];
                        return this.checkCrossBelow(currentValue, previousValue, threshold);
                    } else {
                        const currentValue = currentIndicator[series];
                        const previousValue = previousIndicator?.[series];
                        return this.checkCrossBelow(currentValue, previousValue, value);
                    }

                case ALERT_CONDITION_TYPES.GREATER_THAN:
                    return this.checkGreaterThan(currentIndicator[series], value);

                case ALERT_CONDITION_TYPES.LESS_THAN:
                    return this.checkLessThan(currentIndicator[series], value);

                case ALERT_CONDITION_TYPES.EQUALS:
                    return this.checkEquals(currentIndicator[series], previousIndicator?.[series], value);

                case ALERT_CONDITION_TYPES.LINE_CROSSES_ABOVE:
                    // One line crosses above another (e.g., MACD crosses signal)
                    return this.checkLineCrossAbove(
                        currentIndicator[series1],
                        previousIndicator?.[series1],
                        currentIndicator[series2],
                        previousIndicator?.[series2]
                    );

                case ALERT_CONDITION_TYPES.LINE_CROSSES_BELOW:
                    return this.checkLineCrossBelow(
                        currentIndicator[series1],
                        previousIndicator?.[series1],
                        currentIndicator[series2],
                        previousIndicator?.[series2]
                    );

                case ALERT_CONDITION_TYPES.ENTERS_ZONE:
                    return this.checkEntersZone(
                        currentIndicator[series],
                        previousIndicator?.[series],
                        zone
                    );

                case ALERT_CONDITION_TYPES.EXITS_ZONE:
                    return this.checkExitsZone(
                        currentIndicator[series],
                        previousIndicator?.[series],
                        zone
                    );

                case ALERT_CONDITION_TYPES.WITHIN_ZONE:
                    return this.checkWithinZone(currentIndicator[series], zone);

                case ALERT_CONDITION_TYPES.OUTSIDE_ZONE:
                    return this.checkOutsideZone(currentIndicator[series], zone);

                case ALERT_CONDITION_TYPES.INCREASES_BY:
                    return this.checkIncreasesBy(
                        currentIndicator[series],
                        previousIndicator?.[series],
                        value
                    );

                case ALERT_CONDITION_TYPES.DECREASES_BY:
                    return this.checkDecreasesBy(
                        currentIndicator[series],
                        previousIndicator?.[series],
                        value
                    );

                case ALERT_CONDITION_TYPES.CHANGES_BY:
                    return this.checkChangesBy(
                        currentIndicator[series],
                        previousIndicator?.[series],
                        value
                    );

                default:
                    logger.warn(`[AlertEvaluator] Unknown condition type: ${type}`);
                    return false;
            }
        } catch (error) {
            logger.error('[AlertEvaluator] Error evaluating condition:', error);
            return false;
        }
    }

    /**
     * Check if a value crosses above a threshold
     * @param {number} currentValue - Current value
     * @param {number} previousValue - Previous value
     * @param {number} threshold - Threshold to cross
     * @returns {boolean}
     */
    checkCrossAbove(currentValue, previousValue, threshold) {
        if (currentValue === undefined || previousValue === undefined || threshold === undefined) {
            return false;
        }
        return previousValue <= threshold && currentValue > threshold;
    }

    /**
     * Check if a value crosses below a threshold
     * @param {number} currentValue - Current value
     * @param {number} previousValue - Previous value
     * @param {number} threshold - Threshold to cross
     * @returns {boolean}
     */
    checkCrossBelow(currentValue, previousValue, threshold) {
        if (currentValue === undefined || previousValue === undefined || threshold === undefined) {
            return false;
        }
        return previousValue >= threshold && currentValue < threshold;
    }

    /**
     * Check if one line crosses above another
     * @param {number} currentLine1 - Current value of line 1
     * @param {number} previousLine1 - Previous value of line 1
     * @param {number} currentLine2 - Current value of line 2
     * @param {number} previousLine2 - Previous value of line 2
     * @returns {boolean}
     */
    checkLineCrossAbove(currentLine1, previousLine1, currentLine2, previousLine2) {
        if (
            currentLine1 === undefined || previousLine1 === undefined ||
            currentLine2 === undefined || previousLine2 === undefined
        ) {
            return false;
        }
        return previousLine1 <= previousLine2 && currentLine1 > currentLine2;
    }

    /**
     * Check if one line crosses below another
     * @param {number} currentLine1 - Current value of line 1
     * @param {number} previousLine1 - Previous value of line 1
     * @param {number} currentLine2 - Current value of line 2
     * @param {number} previousLine2 - Previous value of line 2
     * @returns {boolean}
     */
    checkLineCrossBelow(currentLine1, previousLine1, currentLine2, previousLine2) {
        if (
            currentLine1 === undefined || previousLine1 === undefined ||
            currentLine2 === undefined || previousLine2 === undefined
        ) {
            return false;
        }
        return previousLine1 >= previousLine2 && currentLine1 < currentLine2;
    }

    /**
     * Check if value enters a zone
     * @param {number} currentValue - Current value
     * @param {number} previousValue - Previous value
     * @param {Array<number>} zone - [min, max] zone boundaries
     * @returns {boolean}
     */
    checkEntersZone(currentValue, previousValue, zone) {
        if (currentValue === undefined || previousValue === undefined || !Array.isArray(zone)) {
            return false;
        }
        const [min, max] = zone;
        const wasInZone = previousValue >= min && previousValue <= max;
        const isInZone = currentValue >= min && currentValue <= max;
        return !wasInZone && isInZone;
    }

    /**
     * Check if value exits a zone
     * @param {number} currentValue - Current value
     * @param {number} previousValue - Previous value
     * @param {Array<number>} zone - [min, max] zone boundaries
     * @returns {boolean}
     */
    checkExitsZone(currentValue, previousValue, zone) {
        if (currentValue === undefined || previousValue === undefined || !Array.isArray(zone)) {
            return false;
        }
        const [min, max] = zone;
        const wasInZone = previousValue >= min && previousValue <= max;
        const isInZone = currentValue >= min && currentValue <= max;
        return wasInZone && !isInZone;
    }

    /**
     * Check if value is within a zone
     * @param {number} currentValue - Current value
     * @param {Array<number>} zone - [min, max] zone boundaries
     * @returns {boolean}
     */
    checkWithinZone(currentValue, zone) {
        if (currentValue === undefined || !Array.isArray(zone)) {
            return false;
        }
        const [min, max] = zone;
        return currentValue >= min && currentValue <= max;
    }

    /**
     * Check if value is outside a zone
     * @param {number} currentValue - Current value
     * @param {Array<number>} zone - [min, max] zone boundaries
     * @returns {boolean}
     */
    checkOutsideZone(currentValue, zone) {
        if (currentValue === undefined || !Array.isArray(zone)) {
            return false;
        }
        const [min, max] = zone;
        return currentValue < min || currentValue > max;
    }

    /**
     * Check if value is greater than threshold
     * @param {number} currentValue - Current value
     * @param {number} threshold - Threshold value
     * @returns {boolean}
     */
    checkGreaterThan(currentValue, threshold) {
        if (currentValue === undefined || threshold === undefined) {
            return false;
        }
        return currentValue > threshold;
    }

    /**
     * Check if value is less than threshold
     * @param {number} currentValue - Current value
     * @param {number} threshold - Threshold value
     * @returns {boolean}
     */
    checkLessThan(currentValue, threshold) {
        if (currentValue === undefined || threshold === undefined) {
            return false;
        }
        return currentValue < threshold;
    }

    /**
     * Check if value equals a specific value (with state change detection)
     * @param {number} currentValue - Current value
     * @param {number} previousValue - Previous value
     * @param {number} target - Target value
     * @returns {boolean}
     */
    checkEquals(currentValue, previousValue, target) {
        if (currentValue === undefined || previousValue === undefined || target === undefined) {
            return false;
        }
        // Only trigger when value changes TO the target (not continuously while equal)
        return previousValue !== target && currentValue === target;
    }

    /**
     * Check if value increases by a specific amount
     * @param {number} currentValue - Current value
     * @param {number} previousValue - Previous value
     * @param {number} amount - Amount of increase
     * @returns {boolean}
     */
    checkIncreasesBy(currentValue, previousValue, amount) {
        if (currentValue === undefined || previousValue === undefined || amount === undefined) {
            return false;
        }
        return (currentValue - previousValue) >= amount;
    }

    /**
     * Check if value decreases by a specific amount
     * @param {number} currentValue - Current value
     * @param {number} previousValue - Previous value
     * @param {number} amount - Amount of decrease
     * @returns {boolean}
     */
    checkDecreasesBy(currentValue, previousValue, amount) {
        if (currentValue === undefined || previousValue === undefined || amount === undefined) {
            return false;
        }
        return (previousValue - currentValue) >= amount;
    }

    /**
     * Check if value changes by a specific amount (absolute)
     * @param {number} currentValue - Current value
     * @param {number} previousValue - Previous value
     * @param {number} amount - Amount of change
     * @returns {boolean}
     */
    checkChangesBy(currentValue, previousValue, amount) {
        if (currentValue === undefined || previousValue === undefined || amount === undefined) {
            return false;
        }
        return Math.abs(currentValue - previousValue) >= amount;
    }

    /**
     * Clear cached previous values
     */
    clear() {
        this.previousValues.clear();
    }

    /**
     * Remove cached value for a specific alert
     * @param {string} alertId - Alert identifier
     */
    removeAlert(alertId) {
        this.previousValues.delete(alertId);
    }
}

/**
 * Singleton instance for global use
 */
export const alertEvaluator = new AlertEvaluator();

export default AlertEvaluator;
