/**
 * Chart Alerts Hook
 * Handles restoring alerts for the chart on symbol change
 */

import { useEffect, useRef } from 'react';
import { loadAlertsForSymbol } from '../services/alertService';
import logger from '../utils/logger';

// ==================== TYPES ====================

/** Alert data structure */
export interface AlertData {
  id: string | number;
  price: number;
  condition?: string | undefined;
}

/** User price alerts manager interface */
export interface UserPriceAlerts {
  importAlerts: (alerts: AlertData[]) => void;
}

/** LineToolManager interface */
export interface LineToolManager {
  _userPriceAlerts?: UserPriceAlerts | undefined;
}

// ==================== HOOK ====================

/**
 * Hook to handle restoring alerts for the chart.
 * @param manager - LineToolManager instance
 * @param symbol - Current symbol
 * @param exchange - Current exchange
 */
export const useChartAlerts = (
  manager: LineToolManager | null,
  symbol: string,
  exchange: string
): void => {
  const managerRef = useRef<LineToolManager | null>(null);

  useEffect(() => {
    if (!manager || !symbol) return;
    managerRef.current = manager;

    const restoreAlerts = () => {
      // === Alert Persistence: Restore alerts for new symbol ===
      try {
        const userAlerts = manager._userPriceAlerts;
        logger.debug('[Alerts] Checking restore for', symbol, '- userAlerts exists:', !!userAlerts);
        if (userAlerts && typeof userAlerts.importAlerts === 'function') {
          const savedAlerts = loadAlertsForSymbol(symbol, exchange);
          logger.debug('[Alerts] Found saved alerts:', savedAlerts);
          if (savedAlerts && savedAlerts.length > 0) {
            userAlerts.importAlerts(savedAlerts);
            logger.debug('[Alerts] Restored', savedAlerts.length, 'alerts for', symbol);
          } else {
            logger.debug('[Alerts] No saved alerts for', symbol);
          }
        } else {
          logger.debug('[Alerts] importAlerts not available on userAlerts');
        }
      } catch (err) {
        logger.warn('[Alerts] Failed to restore alerts:', err);
      }
    };

    restoreAlerts();
  }, [manager, symbol, exchange]);
};

export default useChartAlerts;
