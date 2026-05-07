/**
 * AlertContext - Centralized alert state management
 * Manages alerts, logs, and popup notifications
 */

import {
  createContext,
  useState,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
  type MutableRefObject,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { getJSON, setJSON, STORAGE_KEYS } from '../services/storageService';
import logger from '../utils/logger';

// ==================== TYPES ====================

/** Alert data structure */
export interface Alert {
  id: string;
  symbol: string;
  price?: number;
  condition?: string;
  status?: 'Active' | 'Paused' | 'Triggered';
  triggered?: boolean;
  triggeredAt?: number;
  createdAt?: number;
  message?: string;
  [key: string]: unknown;
}

/** Alert log entry */
export interface AlertLog {
  id?: string;
  alertId?: string;
  symbol?: string;
  message?: string;
  timestamp?: number;
  type?: 'trigger' | 'create' | 'delete' | 'update';
  [key: string]: unknown;
}

/** Global alert popup */
export interface GlobalAlertPopup {
  id: number;
  symbol?: string;
  message?: string;
  price?: number;
  [key: string]: unknown;
}

/** Alert context value */
export interface AlertContextValue {
  // Alert price
  alertPrice: number | null;
  setAlertPrice: Dispatch<SetStateAction<number | null>>;

  // Alerts
  alerts: Alert[];
  setAlerts: Dispatch<SetStateAction<Alert[]>>;
  alertsRef: MutableRefObject<Alert[]>;
  addAlert: (alert: Omit<Alert, 'createdAt'>) => void;
  removeAlert: (alertId: string) => void;
  updateAlert: (alertId: string, updates: Partial<Alert>) => void;
  triggerAlert: (alertId: string) => void;
  getActiveAlerts: () => Alert[];
  getTriggeredAlerts: () => Alert[];
  getAlertsForSymbol: (symbol: string) => Alert[];

  // Alert logs
  alertLogs: AlertLog[];
  setAlertLogs: Dispatch<SetStateAction<AlertLog[]>>;
  addAlertLog: (log: Omit<AlertLog, 'timestamp'>) => void;
  clearAlertLogs: () => void;

  // Unread count
  unreadAlertCount: number;
  setUnreadAlertCount: Dispatch<SetStateAction<number>>;
  markAllAlertsRead: () => void;
  incrementUnreadCount: () => void;

  // Global popups
  globalAlertPopups: GlobalAlertPopup[];
  setGlobalAlertPopups: Dispatch<SetStateAction<GlobalAlertPopup[]>>;
  addGlobalPopup: (popup: Omit<GlobalAlertPopup, 'id'>) => number;
  removeGlobalPopup: (popupId: number) => void;
  clearGlobalPopups: () => void;

  // Price tracking ref (for crossing detection)
  alertPricesRef: MutableRefObject<Map<string, number>>;

  // Constants
  ALERT_RETENTION_MS: number;
}

// ==================== CONTEXT ====================

const AlertContext = createContext<AlertContextValue | null>(null);

/** Alert retention period (48 hours) */
const ALERT_RETENTION_MS = 48 * 60 * 60 * 1000;

export interface AlertProviderProps {
  children: ReactNode;
}

/**
 * AlertProvider - Manages all alert-related state
 * Centralizes alert data, logs, and popup management
 */
export function AlertProvider({ children }: AlertProviderProps) {
  // Alert price for creating new alerts
  const [alertPrice, setAlertPrice] = useState<number | null>(null);

  // Active alerts with 24h retention
  const [alerts, setAlerts] = useState<Alert[]>(() => {
    const saved = getJSON<Alert[]>(STORAGE_KEYS.ALERTS, []);
    // Filter out expired alerts (older than 24 hours)
    const cutoff = Date.now() - ALERT_RETENTION_MS;
    return saved.filter((a) => !a.triggeredAt || a.triggeredAt > cutoff);
  });

  // Ref to avoid race condition in WebSocket callback
  const alertsRef = useRef<Alert[]>(alerts);
  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);

  // Alert logs with 24h retention
  const [alertLogs, setAlertLogs] = useState<AlertLog[]>(() => {
    const saved = getJSON<AlertLog[]>(STORAGE_KEYS.ALERT_LOGS, []);
    const cutoff = Date.now() - ALERT_RETENTION_MS;
    return saved.filter((l) => !l.timestamp || l.timestamp > cutoff);
  });

  // Unread alert count for badge display
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  // Global alert popups for background alerts
  const [globalAlertPopups, setGlobalAlertPopups] = useState<GlobalAlertPopup[]>([]);

  // Ref for tracking previous prices (for crossing detection)
  const alertPricesRef = useRef<Map<string, number>>(new Map());

  // Persist alerts to localStorage with 24h retention
  useEffect(() => {
    const cutoff = Date.now() - ALERT_RETENTION_MS;
    const filtered = alerts.filter((a) => {
      if (!a.triggeredAt) return true;
      return a.triggeredAt > cutoff;
    });
    if (filtered.length !== alerts.length) {
      setAlerts(filtered);
    }
    try {
      setJSON(STORAGE_KEYS.ALERTS, filtered);
    } catch (error) {
      logger.error('Failed to persist alerts:', error);
    }
  }, [alerts]);

  // Persist alert logs to localStorage with 24h retention
  useEffect(() => {
    const cutoff = Date.now() - ALERT_RETENTION_MS;
    const filtered = alertLogs.filter((l) => {
      if (!l.timestamp) return true;
      return l.timestamp > cutoff;
    });
    if (filtered.length !== alertLogs.length) {
      setAlertLogs(filtered);
    }
    try {
      setJSON(STORAGE_KEYS.ALERT_LOGS, filtered);
    } catch (error) {
      logger.error('Failed to persist alert logs:', error);
    }
  }, [alertLogs]);

  // Add a new alert
  const addAlert = useCallback((alert: Omit<Alert, 'createdAt'>) => {
    setAlerts((prev) => [...prev, { ...alert, createdAt: Date.now() } as Alert]);
  }, []);

  // Remove an alert by id
  const removeAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  // Update an alert
  const updateAlert = useCallback((alertId: string, updates: Partial<Alert>) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, ...updates } : a)));
  }, []);

  // Mark alert as triggered
  const triggerAlert = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, triggered: true, triggeredAt: Date.now(), status: 'Triggered' } : a))
    );
  }, []);

  // Add log entry
  const addAlertLog = useCallback((log: Omit<AlertLog, 'timestamp'>) => {
    setAlertLogs((prev) => [...prev, { ...log, timestamp: Date.now() }]);
  }, []);

  // Clear all logs
  const clearAlertLogs = useCallback(() => {
    setAlertLogs([]);
  }, []);

  // Add a global popup alert
  const addGlobalPopup = useCallback((popup: Omit<GlobalAlertPopup, 'id'>): number => {
    const id = Date.now() + Math.random();
    setGlobalAlertPopups((prev) => [...prev, { ...popup, id }]);
    return id;
  }, []);

  // Remove a global popup alert
  const removeGlobalPopup = useCallback((popupId: number) => {
    setGlobalAlertPopups((prev) => prev.filter((p) => p.id !== popupId));
  }, []);

  // Clear all global popups
  const clearGlobalPopups = useCallback(() => {
    setGlobalAlertPopups([]);
  }, []);

  // Mark all alerts as read
  const markAllAlertsRead = useCallback(() => {
    setUnreadAlertCount(0);
  }, []);

  // Increment unread count
  const incrementUnreadCount = useCallback(() => {
    setUnreadAlertCount((prev) => prev + 1);
  }, []);

  // Get active alerts (not triggered)
  const getActiveAlerts = useCallback(() => {
    return alerts.filter((a) => !a.triggered && a.status === 'Active');
  }, [alerts]);

  // Get triggered alerts
  const getTriggeredAlerts = useCallback(() => {
    return alerts.filter((a) => a.triggered || a.status === 'Triggered');
  }, [alerts]);

  // Get alerts for a specific symbol
  const getAlertsForSymbol = useCallback(
    (symbol: string) => {
      return alerts.filter((a) => a.symbol === symbol);
    },
    [alerts]
  );

  const value: AlertContextValue = useMemo(() => ({
    // Alert price
    alertPrice,
    setAlertPrice,

    // Alerts
    alerts,
    setAlerts,
    alertsRef,
    addAlert,
    removeAlert,
    updateAlert,
    triggerAlert,
    getActiveAlerts,
    getTriggeredAlerts,
    getAlertsForSymbol,

    // Alert logs
    alertLogs,
    setAlertLogs,
    addAlertLog,
    clearAlertLogs,

    // Unread count
    unreadAlertCount,
    setUnreadAlertCount,
    markAllAlertsRead,
    incrementUnreadCount,

    // Global popups
    globalAlertPopups,
    setGlobalAlertPopups,
    addGlobalPopup,
    removeGlobalPopup,
    clearGlobalPopups,

    // Price tracking ref (for crossing detection)
    alertPricesRef,

    // Constants
    ALERT_RETENTION_MS,
  }), [
    alertPrice,
    alerts,
    alertLogs,
    unreadAlertCount,
    globalAlertPopups,
    addAlert,
    removeAlert,
    updateAlert,
    triggerAlert,
    getActiveAlerts,
    getTriggeredAlerts,
    getAlertsForSymbol,
    addAlertLog,
    clearAlertLogs,
    markAllAlertsRead,
    incrementUnreadCount,
    addGlobalPopup,
    removeGlobalPopup,
    clearGlobalPopups
  ]);

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
}


/**
 * Hook to access alert context
 */
export function useAlert(): AlertContextValue {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

export default AlertContext;
