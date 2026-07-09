/**
 * useIndicatorWorker Hook
 * Provides interface to offload heavy indicator calculations to a Web Worker
 *
 * Usage:
 *   const { calculateTPO, calculateVolumeProfile, isReady } = useIndicatorWorker();
 *   const result = await calculateTPO(data, options);
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import logger from '../utils/logger';

// ==================== TYPES ====================

/** TPO options */
export interface TPOOptions {
  tickSize?: number | undefined;
  blockSize?: string | undefined;
  timezone?: string | undefined;
  timeout?: number | undefined;
  [key: string]: unknown;
}

/** Volume profile options */
export interface VolumeProfileOptions {
  rowCount?: number | undefined;
  timeout?: number | undefined;
  [key: string]: unknown;
}

/** TPO session result */
export interface TPOSession {
  date: string;
  letters: Record<string, number[]>;
  poc: number;
  vah: number;
  val: number;
  open: number;
  high: number;
  low: number;
  close: number;
  [key: string]: unknown;
}

/** TPO calculation result */
export interface TPOResult {
  sessions: TPOSession[];
  error?: string | undefined;
}

/** Volume profile row */
export interface VolumeProfileRow {
  price: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
}

/** Volume profile result */
export interface VolumeProfileResult {
  profile: VolumeProfileRow[];
  poc: number;
  vah: number;
  val: number;
  error?: string | undefined;
}

/** Candle data for calculations */
export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | undefined;
}

/** Pending request with resolve/reject */
interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

/** Worker message types */
type WorkerMessageType = 'ready' | 'tpo' | 'volumeProfile';

/** Worker response data */
interface WorkerResponse {
  type: WorkerMessageType;
  id?: string | undefined;
  success?: boolean | undefined;
  result?: unknown;
  error?: string | undefined;
}

/** Hook return type */
export interface UseIndicatorWorkerReturn {
  isReady: boolean;
  calculateTPO: (data: CandleData[], options?: TPOOptions) => Promise<TPOResult>;
  calculateVolumeProfile: (data: CandleData[], options?: VolumeProfileOptions) => Promise<VolumeProfileResult>;
  terminate: () => void;
}

// ==================== UTILITIES ====================

/**
 * Create a unique ID for each calculation request
 */
const createRequestId = (): string =>
  `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ==================== HOOK ====================

/**
 * Hook for using the indicator worker
 * @returns Worker interface with calculation functions
 */
export const useIndicatorWorker = (): UseIndicatorWorkerReturn => {
  const workerRef = useRef<Worker | null>(null);
  const pendingRequests = useRef<Map<string, PendingRequest>>(new Map());
  const [isReady, setIsReady] = useState(false);

  // Initialize worker
  useEffect(() => {
    try {
      // Create worker using Vite's module worker syntax
      workerRef.current = new Worker(
        new URL('../workers/indicatorWorker.js', import.meta.url),
        { type: 'module' }
      );

      // Handle messages from worker
      workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { type, id, success, result, error } = event.data;

        // Worker ready signal
        if (type === 'ready') {
          setIsReady(true);
          logger.debug('[IndicatorWorker] Worker ready');
          return;
        }

        // Handle calculation response
        if (id) {
          const pending = pendingRequests.current.get(id);
          if (pending) {
            pendingRequests.current.delete(id);

            if (success) {
              pending.resolve(result);
            } else {
              pending.reject(new Error(error || 'Unknown error'));
            }
          }
        }
      };

      // Handle worker errors
      workerRef.current.onerror = (error: ErrorEvent) => {
        logger.error('[IndicatorWorker] Worker error:', error);
        // Reject all pending requests
        for (const [, pending] of pendingRequests.current) {
          pending.reject(new Error('Worker error'));
        }
        pendingRequests.current.clear();
      };

      logger.debug('[IndicatorWorker] Worker initialized');
    } catch (error) {
      logger.error('[IndicatorWorker] Failed to create worker:', error);
    }

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      pendingRequests.current.clear();
    };
  }, []);

  /**
   * Send calculation request to worker
   */
  const sendRequest = useCallback(
    <T>(
      type: WorkerMessageType,
      data: CandleData[],
      options: { timeout?: number | undefined; [key: string]: unknown } = {}
    ): Promise<T | null> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          // Fallback: resolve with empty result if worker not available
          logger.warn('[IndicatorWorker] Worker not available, skipping calculation');
          resolve(null);
          return;
        }

        const id = createRequestId();

        // Store pending request
        pendingRequests.current.set(id, {
          resolve: resolve as (value: unknown) => void,
          reject,
        });

        // Set timeout for request
        const timeout = options.timeout || 30000;
        const timeoutId = setTimeout(() => {
          if (pendingRequests.current.has(id)) {
            pendingRequests.current.delete(id);
            reject(new Error(`Calculation timeout after ${timeout}ms`));
          }
        }, timeout);

        // Update pending to include timeout cleanup
        const pending = pendingRequests.current.get(id);
        if (pending) {
          pendingRequests.current.set(id, {
            resolve: (result: unknown) => {
              clearTimeout(timeoutId);
              pending.resolve(result);
            },
            reject: (error: Error) => {
              clearTimeout(timeoutId);
              pending.reject(error);
            },
          });
        }

        // Send to worker
        workerRef.current.postMessage({ type, id, data, options });
      });
    },
    []
  );

  /**
   * Calculate TPO Profile
   */
  const calculateTPO = useCallback(
    async (data: CandleData[], options: TPOOptions = {}): Promise<TPOResult> => {
      try {
        const result = await sendRequest<TPOResult>('tpo', data, options);
        return result || { sessions: [], error: 'No result' };
      } catch (error) {
        logger.error('[IndicatorWorker] TPO calculation failed:', error);
        return { sessions: [], error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    [sendRequest]
  );

  /**
   * Calculate Volume Profile
   */
  const calculateVolumeProfile = useCallback(
    async (data: CandleData[], options: VolumeProfileOptions = {}): Promise<VolumeProfileResult> => {
      try {
        const result = await sendRequest<VolumeProfileResult>('volumeProfile', data, options);
        return result || { profile: [], poc: 0, vah: 0, val: 0, error: 'No result' };
      } catch (error) {
        logger.error('[IndicatorWorker] Volume Profile calculation failed:', error);
        return {
          profile: [],
          poc: 0,
          vah: 0,
          val: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [sendRequest]
  );

  /**
   * Terminate worker manually (for cleanup)
   */
  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsReady(false);
    }
  }, []);

  return {
    isReady,
    calculateTPO,
    calculateVolumeProfile,
    terminate,
  };
};

export default useIndicatorWorker;
