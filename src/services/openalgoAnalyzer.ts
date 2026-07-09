/**
 * OpenAlgo Analyzer Mode Client
 *
 * Wraps the /analyzertoggle and /analyzerstatus endpoints so the rest of the
 * app can flip between LIVE and ANALYZER (sandbox) trading without caring
 * about the HTTP details.
 *
 * Docs:
 *   - https://github.com/marketcalls/openalgo/blob/main/docs/api/analyzer-services/analyzertoggle.md
 *   - https://github.com/marketcalls/openalgo/blob/main/docs/api/analyzer-services/analyzerstatus.md
 *
 * Notes:
 *  - When analyzer mode is ON, every order placed via /placeorder etc. is
 *    simulated against OpenAlgo's sandbox.db with ₹1 Cr virtual capital.
 *  - The user's real broker account is fully isolated.
 *  - Mode is keyed off the API key, so toggling affects every request from
 *    this app (and any other client using the same key).
 */

import { makeApiRequest } from './api/client';
import { ANALYZER_ENDPOINTS } from './api/endpoints';
import logger from '../utils/logger';

// ==================== TYPES ====================

export type AnalyzerMode = 'analyze' | 'live';

export interface AnalyzerStatus {
  mode: AnalyzerMode;
  analyzeMode: boolean;   // mirrors the API's analyze_mode flag
  totalLogs: number;       // simulated orders count when in analyze mode
}

interface RawAnalyzerData {
  analyze_mode: boolean;
  mode: 'analyze' | 'live';
  message?: string;
  total_logs: number;
}

interface RawAnalyzerResponse {
  status?: 'success' | 'error';
  data?: RawAnalyzerData;
  message?: string;
}

// ==================== HELPERS ====================

const normalize = (raw: RawAnalyzerData): AnalyzerStatus => ({
  mode: raw.mode,
  analyzeMode: raw.analyze_mode,
  totalLogs: raw.total_logs,
});

// ==================== API ====================

/**
 * Read the current analyzer (sandbox) mode from OpenAlgo.
 * Returns null if the endpoint is unreachable or auth fails.
 */
export const getAnalyzerStatus = async (
  signal?: AbortSignal
): Promise<AnalyzerStatus | null> => {
  try {
    const response = await makeApiRequest<RawAnalyzerResponse>(
      ANALYZER_ENDPOINTS.STATUS,
      {},
      { context: 'AnalyzerStatus', signal, rawResponse: true }
    );
    if (!response || response.status !== 'success' || !response.data) {
      logger.warn('[AnalyzerStatus] Unexpected response shape', response);
      return null;
    }
    return normalize(response.data);
  } catch (err) {
    logger.error('[AnalyzerStatus] Failed:', err);
    return null;
  }
};

/**
 * Switch analyzer mode on or off.
 * `enable=true`  → /analyzertoggle with mode=true  → analyze (sandbox)
 * `enable=false` → /analyzertoggle with mode=false → live (real broker)
 *
 * Returns the post-toggle status, or null if the call failed.
 */
export const setAnalyzerMode = async (
  enable: boolean,
  signal?: AbortSignal
): Promise<AnalyzerStatus | null> => {
  try {
    const response = await makeApiRequest<RawAnalyzerResponse>(
      ANALYZER_ENDPOINTS.TOGGLE,
      { mode: enable },
      { context: 'AnalyzerToggle', signal, rawResponse: true }
    );
    if (!response || response.status !== 'success' || !response.data) {
      logger.warn('[AnalyzerToggle] Unexpected response shape', response);
      return null;
    }
    const next = normalize(response.data);
    logger.info(`[AnalyzerToggle] Mode → ${next.mode}`);
    return next;
  } catch (err) {
    logger.error('[AnalyzerToggle] Failed:', err);
    return null;
  }
};

export default { getAnalyzerStatus, setAnalyzerMode };
