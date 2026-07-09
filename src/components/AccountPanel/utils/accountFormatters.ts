/**
 * Account Panel Formatters
 * Utility functions for formatting and order status handling
 *
 * NOTE: formatCurrency and formatPnL are re-exported from shared formatters
 * to eliminate duplication across the codebase
 */

// Re-export common formatters from centralized module
import { formatCurrency, formatPnL, formatPercent, formatQuantity } from '../../../utils/shared/formatters';
import { normalizeStatus } from '../../../utils/shared/orderUtils';
export { formatCurrency, formatPnL, formatPercent, formatQuantity, normalizeStatus };

export interface SortConfig {
    key: string;
    direction: 'asc' | 'desc';
}

export interface OrderStats {
    open: number;
    completed: number;
    rejected: number;
}

export interface Order {
    status?: string;
    order_status?: string;
    [key: string]: any;
}

/**
 * Check if order status is open/pending (cancellable)
 */
export const isOpenOrderStatus = (status: string): boolean => {
    const s = normalizeStatus(status);

    // Expanded list of cancellable statuses across different brokers
    const cancellableStatuses = [
        'OPEN',
        'PENDING',
        'TRIGGER_PENDING',
        'AMO_REQ_RECEIVED',
        'VALIDATION_PENDING',
        'NOT_TRIGGERED',        // For stop loss orders not yet triggered
        'AFTER_MARKET_ORDER',   // AMO variant used by some brokers
        'PENDING_APPROVAL',     // Some brokers require approval
        'QUEUED'                // Order in queue waiting to be processed
    ];

    return cancellableStatuses.includes(s);
};

/**
 * Calculate order statistics from order list
 */
export const calculateOrderStats = (orders: Order[]): OrderStats => {
    return (orders || []).reduce((acc: OrderStats, o) => {
        const status = o.status || o.order_status || '';
        // Use isOpenOrderStatus to check if order is open/pending
        if (isOpenOrderStatus(status)) acc.open++;
        else if (['COMPLETE', 'COMPLETED'].includes(status.toUpperCase().replace(/\s+/g, '_'))) acc.completed++;
        else if (['REJECTED', 'CANCELLED', 'CANCELED'].includes(status.toUpperCase().replace(/\s+/g, '_'))) acc.rejected++;
        return acc;
    }, { open: 0, completed: 0, rejected: 0 });
};

/**
 * Sort data array by a specific key
 */
export const sortData = <T extends Record<string, any>>(data: T[], sortConfig: SortConfig | null): T[] => {
    if (!sortConfig || !sortConfig.key) return data;

    return [...data].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        // Handle null/undefined values
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        // Numeric comparison
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // Try to parse as numbers if strings contain numeric values
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }

        // String comparison
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();

        if (sortConfig.direction === 'asc') {
            return aStr.localeCompare(bStr);
        } else {
            return bStr.localeCompare(aStr);
        }
    });
};

/**
 * Format timestamp to human-readable time for closed positions
 */
export const formatClosedTime = (timestamp: string | null | undefined): string => {
    if (!timestamp) return '-';

    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const timeString = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    return isToday ? timeString : `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ${timeString}`;
};

export default {
    formatCurrency,
    formatPnL,
    isOpenOrderStatus,
    calculateOrderStats,
    sortData,
    formatClosedTime,
};
