/**
 * Account Panel Constants
 * Tab definitions and configuration
 */

export interface Tab {
    id: string;
    label: string;
}

// Tab definitions
export const TABS: Tab[] = [
    { id: 'positions', label: 'Positions' },
    { id: 'orders', label: 'Orders' },
    { id: 'holdings', label: 'Holdings' },
    { id: 'trades', label: 'Trades' },
];

// Auto-refresh interval in milliseconds
export const AUTO_REFRESH_INTERVAL_MS = 30000;

export default {
    TABS,
    AUTO_REFRESH_INTERVAL_MS,
};
