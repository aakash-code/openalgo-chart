/**
 * Connection Status Service
 * Tracks WebSocket connection state and browser network status for UI feedback
 * Provides centralized network recovery events for data refresh
 */

import { useState, useEffect } from 'react';
import logger from '../utils/logger';

// Connection states (WebSocket)
export const ConnectionState = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  DISCONNECTED: 'disconnected',
} as const;

export type ConnectionStateType = (typeof ConnectionState)[keyof typeof ConnectionState];

type ConnectionStatusListener = (status: ConnectionStateType) => void;
type NetworkRecoveryListener = () => void;

// Store for current status and listeners
let currentStatus: ConnectionStateType = ConnectionState.DISCONNECTED;
const listeners = new Set<ConnectionStatusListener>();

// Network status tracking
let isNetworkOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
let wasOffline: boolean = false;
const networkRecoveryListeners = new Set<NetworkRecoveryListener>();

/**
 * Get current connection status
 */
export const getConnectionStatus = (): ConnectionStateType => currentStatus;

/**
 * Get current network online status
 */
export const getNetworkStatus = (): boolean => isNetworkOnline;

/**
 * Update connection status and notify listeners
 */
export const setConnectionStatus = (status: ConnectionStateType): void => {
  if (currentStatus !== status) {
    currentStatus = status;
    listeners.forEach((listener) => listener(status));
  }
};

/**
 * Subscribe to connection status changes
 * @param callback - Called with new status when it changes
 * @returns Unsubscribe function
 */
export const subscribeToConnectionStatus = (
  callback: ConnectionStatusListener
): (() => void) => {
  listeners.add(callback);
  // Immediately call with current status
  callback(currentStatus);

  return () => {
    listeners.delete(callback);
  };
};

/**
 * Subscribe to network recovery events
 * Callback is invoked when browser comes back online after being offline
 * Use this to refresh data after network reconnection
 * @param callback - Called when network recovers
 * @returns Unsubscribe function
 */
export const subscribeToNetworkRecovery = (
  callback: NetworkRecoveryListener
): (() => void) => {
  networkRecoveryListeners.add(callback);
  return () => {
    networkRecoveryListeners.delete(callback);
  };
};

/**
 * Trigger network recovery manually (e.g., from WebSocket reconnect)
 */
export const triggerNetworkRecovery = (): void => {
  logger.debug('[ConnectionStatus] Network recovery triggered, notifying', networkRecoveryListeners.size, 'listeners');
  networkRecoveryListeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      logger.error('[ConnectionStatus] Recovery listener error:', err);
    }
  });
};

/**
 * Handle browser online event
 */
const handleOnline = (): void => {
  logger.debug('[ConnectionStatus] Browser online event detected');
  isNetworkOnline = true;

  if (wasOffline) {
    wasOffline = false;
    // Small delay to allow network to stabilize
    setTimeout(() => {
      logger.debug('[ConnectionStatus] Triggering network recovery after coming online');
      triggerNetworkRecovery();
    }, 500);
  }
};

/**
 * Handle browser offline event
 */
const handleOffline = (): void => {
  logger.debug('[ConnectionStatus] Browser offline event detected');
  isNetworkOnline = false;
  wasOffline = true;
  setConnectionStatus(ConnectionState.DISCONNECTED);
};

// Initialize browser event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Check initial state
  isNetworkOnline = navigator.onLine;
  if (!isNetworkOnline) {
    wasOffline = true;
  }

  logger.debug('[ConnectionStatus] Initialized, network online:', isNetworkOnline);
}

/**
 * React hook for connection status
 * Usage: const status = useConnectionStatus();
 */
export const useConnectionStatus = (): ConnectionStateType => {
  const [status, setStatus] = useState<ConnectionStateType>(currentStatus);

  useEffect(() => {
    return subscribeToConnectionStatus(setStatus);
  }, []);

  return status;
};

/**
 * React hook for network online status
 * Usage: const isOnline = useNetworkStatus();
 */
export const useNetworkStatus = (): boolean => {
  const [online, setOnline] = useState<boolean>(isNetworkOnline);

  useEffect(() => {
    const handleOnlineChange = (): void => setOnline(true);
    const handleOfflineChange = (): void => setOnline(false);

    window.addEventListener('online', handleOnlineChange);
    window.addEventListener('offline', handleOfflineChange);

    return () => {
      window.removeEventListener('online', handleOnlineChange);
      window.removeEventListener('offline', handleOfflineChange);
    };
  }, []);

  return online;
};

/**
 * React hook for network recovery
 * Calls callback when network recovers after being offline
 * Usage: useNetworkRecovery(() => { refetchData(); });
 */
export const useNetworkRecovery = (callback: NetworkRecoveryListener): void => {
  useEffect(() => {
    return subscribeToNetworkRecovery(callback);
  }, [callback]);
};

export default {
  ConnectionState,
  getConnectionStatus,
  getNetworkStatus,
  setConnectionStatus,
  subscribeToConnectionStatus,
  subscribeToNetworkRecovery,
  triggerNetworkRecovery,
  useConnectionStatus,
  useNetworkStatus,
  useNetworkRecovery,
};
