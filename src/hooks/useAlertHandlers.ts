/**
 * Alert Handlers Hook
 * Manages price alert operations: create, save, remove, restart, pause, sync, trigger
 */

import { useCallback, type MutableRefObject, type Dispatch, type SetStateAction } from 'react';
import { formatPrice } from '../utils/appUtils';

// ==================== TYPES ====================

/** Alert status values */
export type AlertStatus = 'Active' | 'Paused' | 'Triggered';

/** Alert condition - can be string (price alerts) or object (indicator alerts) */
export type AlertCondition =
  | string
  | {
      type?: string | undefined;
      label?: string | undefined;
    };

/** Alert data structure */
export interface Alert {
  id: string | number;
  symbol: string;
  exchange: string;
  price: string | number;
  condition: AlertCondition;
  status: AlertStatus;
  created_at: string;
  externalId?: string | undefined;
  _source?: 'lineTools' | undefined;
  chartId?: number | undefined;
  indicator?: string | undefined;
}

/** Alert log entry */
export interface AlertLogEntry {
  id: number;
  alertId: string | number;
  symbol: string;
  exchange: string;
  message: string;
  time: string;
}

/** Chart alert from LineTools */
export interface ChartAlert {
  id: string;
  price: number;
  condition?: string | undefined;
}

/** Alert triggered event data */
export interface AlertTriggeredEvent {
  price?: number | undefined;
  alertPrice?: number | undefined;
  timestamp?: number | string | undefined;
  externalId?: string | undefined;
  alertId?: string | undefined;
  condition?: string | undefined;
}

/** Alert data for saving */
export interface AlertSaveData {
  value: number;
}

/** Chart reference interface */
export interface ChartRef {
  getCurrentPrice: () => number | null;
  createAlert?: ((price: number) => void) | undefined;
  addPriceAlert?: ((alert: Alert) => void) | undefined;
  removePriceAlert?: ((externalId: string) => void) | undefined;
  restartPriceAlert?: ((price: string | number, condition: string) => void) | undefined;
}

/** Skip sync reference info */
export interface SkipSyncInfo {
  type: 'add' | 'pause' | 'resume';
  alertId?: string | number | undefined;
  chartId?: number | undefined;
}

/** Toast notification function type */
export type ShowToastFn = (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;

/** Hook parameters */
export interface UseAlertHandlersParams {
  chartRefs: MutableRefObject<Record<number, ChartRef | null>>;
  activeChartId: number;
  setAlertPrice: Dispatch<SetStateAction<number | null>>;
  setIsAlertOpen: Dispatch<SetStateAction<boolean>>;
  showToast: ShowToastFn;
  currentSymbol: string;
  currentExchange: string;
  alerts: Alert[];
  setAlerts: Dispatch<SetStateAction<Alert[]>>;
  skipNextSyncRef: MutableRefObject<SkipSyncInfo | null>;
  setAlertLogs: Dispatch<SetStateAction<AlertLogEntry[]>>;
  setUnreadAlertCount: Dispatch<SetStateAction<number>>;
}

/** Hook return type */
export interface UseAlertHandlersReturn {
  handleAlertClick: () => void;
  handleSaveAlert: (alertData: AlertSaveData) => void;
  handleRemoveAlert: (id: string | number) => void;
  handleRestartAlert: (id: string | number) => void;
  handlePauseAlert: (id: string | number) => void;
  handleChartAlertsSync: (
    chartId: number,
    symbol: string,
    exchange: string,
    chartAlerts: ChartAlert[] | null
  ) => void;
  handleChartAlertTriggered: (
    chartId: number,
    symbol: string,
    exchange: string,
    evt: AlertTriggeredEvent
  ) => void;
}

/**
 * Custom hook for alert operations
 * @param params - Hook parameters
 * @returns Alert handler functions
 */
export const useAlertHandlers = ({
  chartRefs,
  activeChartId,
  setAlertPrice,
  setIsAlertOpen,
  showToast,
  currentSymbol,
  currentExchange,
  alerts,
  setAlerts,
  skipNextSyncRef,
  setAlertLogs,
  setUnreadAlertCount,
}: UseAlertHandlersParams): UseAlertHandlersReturn => {
  // Handle alert button click - create new alert at current price
  const handleAlertClick = useCallback(() => {
    const activeRef = chartRefs.current[activeChartId];
    if (activeRef) {
      const price = activeRef.getCurrentPrice();
      if (price !== null) {
        if (typeof activeRef.createAlert === 'function') {
          activeRef.createAlert(price);
        } else {
          setAlertPrice(price);
          setIsAlertOpen(true);
        }
      } else {
        showToast('No price data available', 'error');
      }
    }
  }, [chartRefs, activeChartId, setAlertPrice, setIsAlertOpen, showToast]);

  // Save a new alert
  const handleSaveAlert = useCallback(
    (alertData: AlertSaveData) => {
      const priceDisplay = formatPrice(alertData.value);

      const newAlert: Alert = {
        id: Date.now(),
        symbol: currentSymbol,
        exchange: currentExchange,
        price: priceDisplay,
        condition: `Crossing ${priceDisplay}`,
        status: 'Active',
        created_at: new Date().toISOString(),
      };

      setAlerts((prev) => [...prev, newAlert]);
      skipNextSyncRef.current = { type: 'add', alertId: newAlert.id, chartId: activeChartId };

      const activeRef = chartRefs.current[activeChartId];
      if (activeRef && typeof activeRef.addPriceAlert === 'function') {
        activeRef.addPriceAlert(newAlert);
      }
    },
    [currentSymbol, currentExchange, setAlerts, skipNextSyncRef, activeChartId, chartRefs]
  );

  // Remove an alert
  const handleRemoveAlert = useCallback(
    (id: string | number) => {
      setAlerts((prev) => {
        const target = prev.find((a) => a.id === id);

        if (
          target &&
          target._source === 'lineTools' &&
          target.chartId != null &&
          target.externalId
        ) {
          const chartRef = chartRefs.current[target.chartId];
          if (chartRef && typeof chartRef.removePriceAlert === 'function') {
            chartRef.removePriceAlert(target.externalId);
          }
        }

        return prev.filter((a) => a.id !== id);
      });
    },
    [setAlerts, chartRefs]
  );

  // Restart a paused/triggered alert
  const handleRestartAlert = useCallback(
    (id: string | number) => {
      const target = alerts.find((a) => a.id === id);
      if (!target) return;

      let originalCondition = 'crossing';
      if (target.condition) {
        // Handle both string conditions (price alerts) and object conditions (indicator alerts)
        const condStr =
          typeof target.condition === 'object'
            ? target.condition.type || target.condition.label || ''
            : target.condition;
        const condLower = condStr.toLowerCase();
        if (condLower.includes('crossing_down') || condLower.includes('crossing down')) {
          originalCondition = 'crossing_down';
        } else if (condLower.includes('crossing_up') || condLower.includes('crossing up')) {
          originalCondition = 'crossing_up';
        }
      }

      skipNextSyncRef.current = { type: 'resume', alertId: id, chartId: target.chartId };

      if (target._source === 'lineTools' && target.chartId != null) {
        const chartRef = chartRefs.current[target.chartId];
        if (chartRef && typeof chartRef.restartPriceAlert === 'function') {
          chartRef.restartPriceAlert(target.price, originalCondition);
        }
      }

      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'Active' as const } : a)));
    },
    [alerts, skipNextSyncRef, chartRefs, setAlerts]
  );

  // Pause an active alert
  const handlePauseAlert = useCallback(
    (id: string | number) => {
      const target = alerts.find((a) => a.id === id);
      if (!target) return;

      skipNextSyncRef.current = { type: 'pause' };

      if (target._source === 'lineTools' && target.chartId != null && target.externalId) {
        const chartRef = chartRefs.current[target.chartId];
        if (chartRef && typeof chartRef.removePriceAlert === 'function') {
          chartRef.removePriceAlert(target.externalId);
        }
      }

      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'Paused' as const } : a)));
    },
    [alerts, skipNextSyncRef, chartRefs, setAlerts]
  );

  // Sync alerts from chart to state
  const handleChartAlertsSync = useCallback(
    (chartId: number, symbol: string, exchange: string, chartAlerts: ChartAlert[] | null) => {
      const syncInfo = skipNextSyncRef.current;

      if (syncInfo && syncInfo.type === 'pause') {
        skipNextSyncRef.current = null;
        return;
      }

      if (syncInfo && syncInfo.type === 'add' && syncInfo.chartId === chartId) {
        skipNextSyncRef.current = null;
        const existingForChart = alerts.filter(
          (a) => a._source === 'lineTools' && a.chartId === chartId && a.status === 'Active'
        );
        const existingExternalIds = new Set(existingForChart.map((a) => a.externalId));
        const newChartAlert = (chartAlerts || []).find((a) => !existingExternalIds.has(a.id));

        if (newChartAlert) {
          setAlerts((prev) =>
            prev.map((a) =>
              a.id === syncInfo.alertId
                ? { ...a, externalId: newChartAlert.id, _source: 'lineTools' as const, chartId }
                : a
            )
          );
        }
        return;
      }

      if (syncInfo && syncInfo.type === 'resume' && syncInfo.chartId === chartId) {
        skipNextSyncRef.current = null;
        const existingForChart = alerts.filter(
          (a) => a._source === 'lineTools' && a.chartId === chartId && a.status === 'Active'
        );
        const existingExternalIds = new Set(existingForChart.map((a) => a.externalId));
        const newChartAlert = (chartAlerts || []).find((a) => !existingExternalIds.has(a.id));

        if (newChartAlert) {
          setAlerts((prev) =>
            prev.map((a) =>
              a.id === syncInfo.alertId
                ? { ...a, externalId: newChartAlert.id, status: 'Active' as const }
                : a
            )
          );
        }
        return;
      }

      setAlerts((prev) => {
        const chartAlertMap = new Map((chartAlerts || []).map((a) => [a.id, a]));
        const chartAlertIds = new Set((chartAlerts || []).map((a) => a.id));
        const existingForChart = prev.filter(
          (a) => a._source === 'lineTools' && a.chartId === chartId
        );
        const existingExternalIds = new Set(existingForChart.map((a) => a.externalId));

        const remaining = prev
          .filter((a) => {
            if (a._source !== 'lineTools' || a.chartId !== chartId) return true;
            if (a.status === 'Triggered' || a.status === 'Paused') return true;
            return chartAlertIds.has(a.externalId || '');
          })
          .map((a) => {
            if (a._source === 'lineTools' && a.chartId === chartId && a.status === 'Active') {
              const chartAlert = chartAlertMap.get(a.externalId || '');
              if (chartAlert) {
                const priceDisplay = formatPrice(chartAlert.price);
                let conditionDisplay = `Crossing ${priceDisplay}`;
                if (chartAlert.condition === 'crossing_up') {
                  conditionDisplay = `Crossing Up ${priceDisplay}`;
                } else if (chartAlert.condition === 'crossing_down') {
                  conditionDisplay = `Crossing Down ${priceDisplay}`;
                } else if (chartAlert.condition && chartAlert.condition !== 'crossing') {
                  conditionDisplay = chartAlert.condition;
                }
                return { ...a, price: priceDisplay, condition: conditionDisplay };
              }
            }
            return a;
          });

        const newChartAlerts = (chartAlerts || []).filter((a) => !existingExternalIds.has(a.id));
        const newMapped: Alert[] = newChartAlerts.map((a) => {
          const priceDisplay = formatPrice(a.price);
          let conditionDisplay = `Crossing ${priceDisplay}`;
          if (a.condition === 'crossing_up') {
            conditionDisplay = `Crossing Up ${priceDisplay}`;
          } else if (a.condition === 'crossing_down') {
            conditionDisplay = `Crossing Down ${priceDisplay}`;
          } else if (a.condition && a.condition !== 'crossing') {
            conditionDisplay = a.condition;
          }

          return {
            id: `lt-${chartId}-${a.id}`,
            externalId: a.id,
            symbol,
            exchange,
            price: priceDisplay,
            condition: conditionDisplay,
            status: 'Active' as const,
            created_at: new Date().toISOString(),
            _source: 'lineTools' as const,
            chartId,
          };
        });

        return [...remaining, ...newMapped];
      });
    },
    [alerts, skipNextSyncRef, setAlerts]
  );

  // Handle alert triggered event
  const handleChartAlertTriggered = useCallback(
    (chartId: number, symbol: string, exchange: string, evt: AlertTriggeredEvent) => {
      const displayPrice = formatPrice(evt.price ?? evt.alertPrice ?? 0);
      const timestamp = evt.timestamp
        ? new Date(evt.timestamp).toISOString()
        : new Date().toISOString();

      const logEntry: AlertLogEntry = {
        id: Date.now(),
        alertId: evt.externalId || evt.alertId || '',
        symbol,
        exchange,
        message: `Alert triggered: ${symbol}:${exchange} crossed ${displayPrice}`,
        time: timestamp,
      };
      setAlertLogs((prev) => [logEntry, ...prev]);
      setUnreadAlertCount((prev) => prev + 1);

      setAlerts((prev) => {
        let updated = false;
        const next = prev.map((a) => {
          if (
            a._source === 'lineTools' &&
            a.chartId === chartId &&
            a.externalId === (evt.externalId || evt.alertId)
          ) {
            updated = true;
            return { ...a, status: 'Triggered' as const };
          }
          return a;
        });

        if (!updated) {
          next.unshift({
            id: `lt-${chartId}-${evt.externalId || evt.alertId}-triggered-${Date.now()}`,
            externalId: evt.externalId || evt.alertId,
            symbol,
            exchange,
            price: displayPrice,
            condition: evt.condition || `Crossing ${displayPrice}`,
            status: 'Triggered' as const,
            created_at: timestamp,
            _source: 'lineTools' as const,
            chartId,
          });
        }

        return next;
      });
    },
    [setAlertLogs, setUnreadAlertCount, setAlerts]
  );

  return {
    handleAlertClick,
    handleSaveAlert,
    handleRemoveAlert,
    handleRestartAlert,
    handlePauseAlert,
    handleChartAlertsSync,
    handleChartAlertTriggered,
  };
};

export default useAlertHandlers;
