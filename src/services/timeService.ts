/**
 * Time Service - Provides accurate IST time synced from NPL India
 * NPL (National Physical Laboratory) India is the official timekeeping authority
 * Used for candle creation and time-critical operations
 */

import { logger } from '../utils/logger';

/** NPL API response structure */
interface NPLTimeResponse {
  id: string;
  it: number;
  ncrt: number;
  nctt: number;
  nsrt: number;
  nstt: number; // NTP server transmit time (Unix epoch in UTC seconds)
}

/**
 * Get NPL Time API URL
 *
 * Configurable via VITE_NPL_TIME_URL environment variable:
 * - '/npl-time' (default): Uses local proxy (Vite dev proxy or nginx production proxy)
 * - 'disabled': Disables time sync, uses local browser time
 * - 'https://www.nplindia.in/cgi-bin/ntp_client': Direct URL (requires CORS headers)
 * - Custom URL: Your own NTP service endpoint
 */
const getNPLTimeUrl = (): string | null => {
  const clientTimestamp = Date.now() / 1000; // Current time in seconds
  const baseUrl = import.meta.env.VITE_NPL_TIME_URL || '/npl-time';

  // Return null if disabled
  if (baseUrl === 'disabled') {
    return null;
  }

  return `${baseUrl}?${clientTimestamp.toFixed(3)}`;
};

const SYNC_INTERVAL_MS = 60 * 1000; // Resync every 1 minute for better accuracy
const IST_OFFSET_SECONDS = 19800; // 5 hours 30 minutes in seconds

// Store the offset between network time and local time
let timeOffset = 0;
let lastSyncTime = 0;
let isSyncing = false;
let isSynced = false; // Track if we've successfully synced at least once
let syncIntervalId: ReturnType<typeof setInterval> | null = null; // Track interval for cleanup

/**
 * Fetch accurate time from NPL India's official NTP server and calculate offset
 * Response format: { id, it, ncrt, nctt, nsrt, nstt }
 * - nstt: NTP server transmit time (Unix epoch in UTC seconds)
 */
export const syncTimeWithAPI = async (): Promise<boolean> => {
  // Skip sync if disabled
  const url = getNPLTimeUrl();
  if (url === null) {
    logger.debug('[TimeService] Time sync disabled, using local browser time');
    isSynced = true; // Mark as "synced" so app doesn't wait
    return true;
  }

  if (isSyncing) return isSynced;
  isSyncing = true;

  try {
    const requestStartTime = Date.now();
    const response = await fetch(url, {
      headers: {
        accept: 'application/json, text/javascript, */*; q=0.01',
        'x-requested-with': 'XMLHttpRequest',
      },
    });
    const requestEndTime = Date.now();

    if (response.ok) {
      const data = (await response.json()) as NPLTimeResponse;
      // nstt is NTP server transmit time - Unix epoch timestamp in UTC seconds
      const nplTimestampUTC = data.nstt;

      if (nplTimestampUTC && Number.isFinite(nplTimestampUTC)) {
        // Account for network round-trip time (RTT/2)
        const networkLatency = (requestEndTime - requestStartTime) / 2000; // Convert to seconds
        const adjustedNplTime = nplTimestampUTC + networkLatency;

        // Compare against local UTC time (Date.now() is UTC milliseconds)
        const localTimestampUTC = Date.now() / 1000;

        // Offset = NPL time - local time (how much our clock is off from true UTC)
        const newOffset = adjustedNplTime - localTimestampUTC;

        // Only log if offset changes significantly (> 100ms) or first sync
        if (Math.abs(newOffset - timeOffset) > 0.1 || !isSynced) {
          logger.debug(
            '[TimeService] Synced with NPL India. Offset:',
            newOffset.toFixed(3),
            'seconds, Latency:',
            (networkLatency * 1000).toFixed(0),
            'ms'
          );
        }

        timeOffset = newOffset;
        lastSyncTime = Date.now();
        isSynced = true;
        return true;
      }
    }
  } catch (error) {
    logger.warn('[TimeService] Failed to sync with NPL India:', (error as Error).message);
  } finally {
    isSyncing = false;
  }
  return false;
};

/**
 * Check if time is synced
 */
export const getIsSynced = (): boolean => isSynced;

/**
 * Get current accurate UTC timestamp in seconds
 * Uses the NPL-synced offset to correct local clock
 */
export const getAccurateUTCTimestamp = (): number => {
  // Local time in UTC + offset correction from NPL sync
  const localTimestampUTC = Date.now() / 1000;
  return localTimestampUTC + timeOffset;
};

/**
 * Get current accurate IST timestamp in seconds
 * Uses the NPL India synced offset for accuracy
 * This is the primary function for candle creation timing
 */
export const getAccurateISTTimestamp = (): number => {
  // Get accurate UTC first, then add IST offset (5h 30m)
  return getAccurateUTCTimestamp() + IST_OFFSET_SECONDS;
};

/**
 * Check if resync is needed (1 minute since last sync)
 */
export const shouldResync = (): boolean => {
  return Date.now() - lastSyncTime >= SYNC_INTERVAL_MS;
};

/**
 * Get time offset (for debugging)
 */
export const getTimeOffset = (): number => timeOffset;

/**
 * Initialize time service - call this on app startup
 */
export const initTimeService = async (): Promise<void> => {
  // Prevent duplicate intervals
  if (syncIntervalId !== null) {
    return;
  }

  await syncTimeWithAPI().catch((err) =>
    logger.debug('[TimeService] Initial sync error:', err)
  );

  // Set up periodic resync
  syncIntervalId = setInterval(() => {
    syncTimeWithAPI().catch((err) =>
      logger.debug('[TimeService] Interval sync error:', err)
    );
  }, SYNC_INTERVAL_MS);

  logger.info(
    '[TimeService] Initialized with NPL India. Offset:',
    timeOffset.toFixed(3),
    'seconds'
  );
};

/**
 * Cleanup time service - call this on app shutdown
 */
export const destroyTimeService = (): void => {
  if (syncIntervalId !== null) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
};

export default {
  syncTimeWithAPI,
  getAccurateUTCTimestamp,
  getAccurateISTTimestamp,
  shouldResync,
  getTimeOffset,
  getIsSynced,
  initTimeService,
  destroyTimeService,
};
