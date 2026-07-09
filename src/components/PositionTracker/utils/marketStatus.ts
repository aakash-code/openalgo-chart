/**
 * Market Status Utility
 * Re-exports from centralized market constants for backward compatibility
 */

// Re-export all market utilities from centralized module
import {
    getMarketStatus,
    isMarketOpen,
    getTimeUntilMarket,
} from '../../../constants/marketConstants';

export { getMarketStatus, isMarketOpen, getTimeUntilMarket };

export default {
    getMarketStatus,
    isMarketOpen,
    getTimeUntilMarket,
};
