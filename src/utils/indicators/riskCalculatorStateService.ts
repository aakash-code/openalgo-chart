/**
 * Risk Calculator State Service
 * Handles per-symbol persistence for risk management settings.
 */

import { RiskCalculationParams } from './riskCalculator';

const STORAGE_PREFIX = 'openalgo_risk_calc_state_';
const GLOBAL_STORAGE_KEY = 'openalgo_risk_calc_global_settings';

export const riskCalculatorStateService = {
  /**
   * Save risk parameters for a specific symbol
   */
  saveState(symbol: string, params: Partial<RiskCalculationParams>): void {
    if (!symbol) return;
    try {
      const key = `${STORAGE_PREFIX}${symbol}`;
      // Merge with existing state if any
      const existing = this.loadState(symbol);
      const updated = { ...existing, ...params };
      localStorage.setItem(key, JSON.stringify(updated));

      // Also save global settings if they exist in the update
      const globals: any = {};
      if (params.capital !== undefined) globals.capital = params.capital;
      if (params.riskPercent !== undefined) globals.riskPercent = params.riskPercent;
      if (params.leverage !== undefined) globals.leverage = params.leverage;
      if (params.segment !== undefined) globals.segment = params.segment;
      if (params.exchange !== undefined) globals.exchange = params.exchange;

      if (Object.keys(globals).length > 0) {
        this.saveGlobalSettings(globals);
      }
    } catch (e) {
      console.error('Failed to save risk calculator state:', e);
    }
  },

  /**
   * Load risk parameters for a specific symbol
   */
  loadState(symbol: string): Partial<RiskCalculationParams> | null {
    if (!symbol) return this.loadGlobalSettings();
    try {
      const key = `${STORAGE_PREFIX}${symbol}`;
      const data = localStorage.getItem(key);
      const symbolData = data ? JSON.parse(data) : {};
      
      // Merge with global settings
      const globalData = this.loadGlobalSettings() || {};
      return { ...globalData, ...symbolData };
    } catch (e) {
      console.error('Failed to load risk calculator state:', e);
      return this.loadGlobalSettings();
    }
  },

  /**
   * Save global settings (Capital, Risk %, etc.)
   */
  saveGlobalSettings(settings: Partial<RiskCalculationParams>): void {
    try {
      const existing = this.loadGlobalSettings() || {};
      const updated = { ...existing, ...settings };
      localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save global risk settings:', e);
    }
  },

  /**
   * Load global settings
   */
  loadGlobalSettings(): Partial<RiskCalculationParams> | null {
    try {
      const data = localStorage.getItem(GLOBAL_STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  },

  /**
   * Clear risk parameters for a symbol
   */
  clearState(symbol: string): void {
    if (!symbol) return;
    localStorage.removeItem(`${STORAGE_PREFIX}${symbol}`);
  }
};

export default riskCalculatorStateService;
