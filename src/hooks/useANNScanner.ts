/**
 * useANNScanner Hook
 * Manages ANN Scanner background scanning functionality
 */

import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import { scanStocks, type ScanResult, type StockInput } from '../services/annScannerService';

// ==================== TYPES ====================

/** ANN Scanner progress state */
export interface ANNScanProgress {
  current: number;
  total: number;
}

/** ANN Scanner state */
export interface ANNScannerState {
  isScanning: boolean;
  scanError: string | null;
  progress: ANNScanProgress;
  results: ScanResult[];
  previousResults: ScanResult[];
  lastScanTime: Date | null;
}

/** Signal change notification */
export interface SignalChange {
  symbol: string;
  from: string;
  to: string;
}

/** Toast function type */
export type ShowToastFn = (
  message: string,
  type: 'success' | 'error' | 'warning' | 'info'
) => void;

/** Hook return type */
export interface UseANNScannerReturn {
  startAnnScan: (
    stocksToScan: StockInput[],
    alertsEnabled?: boolean,
    showToastFn?: ShowToastFn | null
  ) => Promise<void>;
  cancelAnnScan: () => void;
}

/**
 * Hook to manage ANN Scanner state and operations
 * @param annScannerState - Current scanner state
 * @param setAnnScannerState - State setter function
 * @returns Scanner handlers: startAnnScan, cancelAnnScan
 */
export const useANNScanner = (
  annScannerState: ANNScannerState,
  setAnnScannerState: Dispatch<SetStateAction<ANNScannerState>>
): UseANNScannerReturn => {
  // AbortController ref for background ANN scan
  const annScanAbortRef = useRef<AbortController | null>(null);

  // Background scan function - runs even when ANNScanner tab is not visible
  const startAnnScan = useCallback(
    async (
      stocksToScan: StockInput[],
      alertsEnabled: boolean = true,
      showToastFn: ShowToastFn | null = null
    ) => {
      if (annScannerState.isScanning) return;

      // Cancel any existing scan
      if (annScanAbortRef.current) {
        annScanAbortRef.current.abort();
      }
      annScanAbortRef.current = new AbortController();

      // Save previous results, start scanning
      setAnnScannerState((prev) => ({
        ...prev,
        isScanning: true,
        scanError: null,
        progress: { current: 0, total: stocksToScan.length },
        previousResults: prev.results,
        results: [],
      }));

      try {
        const scanResults = await scanStocks(
          stocksToScan,
          { threshold: 0.0014, daysToFetch: 60, delayMs: 100 },
          (current: number, total: number, result: ScanResult) => {
            // Update progress and results incrementally
            setAnnScannerState((prev) => ({
              ...prev,
              progress: { current, total },
              results: [...prev.results, result],
            }));
          },
          annScanAbortRef.current.signal
        );

        // Scan completed - update state
        setAnnScannerState((prev) => {
          // Detect signal changes for alerts
          const oldMap = new Map(prev.previousResults.map((r) => [r.symbol, r]));
          const changes: SignalChange[] = [];
          scanResults.forEach((newItem) => {
            const oldItem = oldMap.get(newItem.symbol);
            if (oldItem && oldItem.direction !== newItem.direction) {
              if (oldItem.direction && newItem.direction) {
                changes.push({
                  symbol: newItem.symbol,
                  from: oldItem.direction,
                  to: newItem.direction,
                });
              }
            }
          });

          // Handle alerts if enabled
          if (changes.length > 0 && alertsEnabled) {
            // Play alert sound
            try {
              const audio = new Audio('/sounds/alert.mp3');
              audio.volume = 0.5;
              audio.play().catch(() => {
                // Ignore audio play errors
              });
            } catch {
              // Ignore audio errors
            }

            // Browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              changes.forEach((change) => {
                new Notification('ANN Signal Change', {
                  body: `${change.symbol}: ${change.from} → ${change.to}`,
                  icon: '/favicon.ico',
                });
              });
            }

            // Toast notification
            if (showToastFn) {
              const firstChange = changes[0];
              const msg =
                changes.length === 1 && firstChange
                  ? `${firstChange.symbol} flipped to ${firstChange.to}`
                  : `${changes.length} stocks changed signals`;
              showToastFn(msg, 'warning');
            }
          }

          return {
            ...prev,
            isScanning: false,
            lastScanTime: new Date(),
          };
        });
      } catch (err: unknown) {
        const error = err as Error;
        if (error.name !== 'AbortError') {
          setAnnScannerState((prev) => ({
            ...prev,
            isScanning: false,
            scanError: error.message || 'Scan failed',
          }));
        } else {
          // Scan was cancelled - just mark as not scanning
          setAnnScannerState((prev) => ({
            ...prev,
            isScanning: false,
          }));
        }
      }
    },
    [annScannerState.isScanning, setAnnScannerState]
  );

  // Cancel scan function
  const cancelAnnScan = useCallback(() => {
    if (annScanAbortRef.current) {
      annScanAbortRef.current.abort();
    }
    setAnnScannerState((prev) => ({
      ...prev,
      isScanning: false,
    }));
  }, [setAnnScannerState]);

  return {
    startAnnScan,
    cancelAnnScan,
  };
};

export default useANNScanner;
