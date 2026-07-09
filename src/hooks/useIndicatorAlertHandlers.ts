/**
 * Indicator Alert Handlers Hook
 * Manages indicator alert operations: save, update
 */

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { globalAlertMonitor } from '../services/globalAlertMonitor';

// ==================== TYPES ====================

/** Indicator alert configuration */
export interface IndicatorAlertConfig {
  id: string | number;
  name: string;
  symbol: string;
  exchange: string;
  indicator: string;
  condition: string;
  value: number;
  status: 'Active' | 'Paused' | 'Triggered';
  [key: string]: unknown;
}

/** Toast function type */
export type ShowToastFn = (
  message: string,
  type: 'success' | 'error' | 'warning' | 'info'
) => void;

/** Hook parameters */
export interface UseIndicatorAlertHandlersParams {
  setAlerts: Dispatch<SetStateAction<IndicatorAlertConfig[]>>;
  showToast: ShowToastFn;
  setIsIndicatorAlertOpen: Dispatch<SetStateAction<boolean>>;
  setIndicatorAlertToEdit: Dispatch<SetStateAction<IndicatorAlertConfig | null>>;
  indicatorAlertToEdit: IndicatorAlertConfig | null;
}

/** Hook return type */
export interface UseIndicatorAlertHandlersReturn {
  handleSaveIndicatorAlert: (alertConfig: IndicatorAlertConfig) => void;
}

// ==================== HOOK ====================

/**
 * Custom hook for indicator alert operations
 * @param params - Hook parameters
 * @returns Indicator alert handler functions
 */
export const useIndicatorAlertHandlers = ({
  setAlerts,
  showToast,
  setIsIndicatorAlertOpen,
  setIndicatorAlertToEdit,
  indicatorAlertToEdit,
}: UseIndicatorAlertHandlersParams): UseIndicatorAlertHandlersReturn => {
  // Save (Create or Update) an indicator alert
  const handleSaveIndicatorAlert = useCallback(
    (alertConfig: IndicatorAlertConfig) => {
      setAlerts((prev) => {
        const exists = prev.some((a) => a.id === alertConfig.id);
        if (exists) {
          return prev.map((a) => (a.id === alertConfig.id ? alertConfig : a));
        }
        return [...prev, alertConfig];
      });

      showToast(
        `Indicator alert ${indicatorAlertToEdit ? 'updated' : 'created'}: ${alertConfig.name}`,
        'success'
      );

      // Close dialog and reset edit state
      setIsIndicatorAlertOpen(false);
      setIndicatorAlertToEdit(null);

      // Refresh global alert monitor to pick up new/updated alert
      // Use setTimeout to ensure localStorage is updated first
      setTimeout(() => {
        globalAlertMonitor.refresh();
      }, 100);
    },
    [setAlerts, showToast, setIsIndicatorAlertOpen, setIndicatorAlertToEdit, indicatorAlertToEdit]
  );

  return {
    handleSaveIndicatorAlert,
  };
};

export default useIndicatorAlertHandlers;
