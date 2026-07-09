import React, { useState, useCallback, useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import BaseModal from '../shared/Modal/BaseModal';
import {
  loadAutoTradeConfig,
  saveAutoTradeConfig,
  applyPreset,
  TESTING_PRESET,
  LIVE_PRESET,
  type AutoTradeConfig,
  type AutoTradeMode,
} from '../../services/autoTradeConfig';
import { STRATEGY_VARIANTS, setVariantEnabled } from '../../services/strategyRegistry';
import { multiVariantEngine } from '../../services/multiVariantEngine';
import styles from './AutoTradeSettings.module.css';

export interface AutoTradeSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  /** Toast helper for save confirmation */
  showToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const MODE_LABELS: Record<AutoTradeMode, string> = {
  off: 'OFF — engine paused, no orders fire',
  testing: 'TESTING — fires across all enabled variants',
  live: 'LIVE — single-variant live execution (post-promotion)',
};

const AutoTradeSettings: React.FC<AutoTradeSettingsProps> = ({ isOpen, onClose, showToast }) => {
  const [draft, setDraft] = useState<AutoTradeConfig>(() => loadAutoTradeConfig());
  const [, forceTick] = useState(0);
  const triggerRefresh = useCallback(() => forceTick((t) => t + 1), []);

  // Re-load config every time dialog opens, in case it changed elsewhere
  useEffect(() => {
    if (isOpen) setDraft(loadAutoTradeConfig());
  }, [isOpen]);

  const set = <K extends keyof AutoTradeConfig>(key: K, value: AutoTradeConfig[K]): void => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (): void => {
    saveAutoTradeConfig(draft);
    multiVariantEngine.reloadConfig();
    showToast?.('Auto-trade settings saved', 'success');
    onClose();
  };

  const handleApplyPreset = (preset: 'testing' | 'live'): void => {
    const next = preset === 'testing' ? TESTING_PRESET : LIVE_PRESET;
    setDraft({ ...next });
    // Save + apply immediately so a one-click preset actually starts the engine.
    // Previously this only updated the draft, leaving users to remember to hit
    // Save — which is how today's "engine off all day" situation happened.
    saveAutoTradeConfig(next);
    multiVariantEngine.reloadConfig();
    showToast?.(
      `${preset === 'testing' ? 'Testing' : 'Live'} preset applied & saved`,
      'success'
    );
  };

  const handleReset = (): void => {
    applyPreset('testing');
    setDraft(loadAutoTradeConfig());
  };

  const handleVariantToggle = (id: string, enabled: boolean): void => {
    setVariantEnabled(id, enabled);
    triggerRefresh();
  };

  const enabledCount = STRATEGY_VARIANTS.filter((v) => v.enabled).length;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Auto-Trade Settings"
      size="medium"
      footer={
        <div className={styles.footer}>
          <button type="button" onClick={handleReset} className={styles.btnGhost}>
            <RotateCcw size={12} /> Reset to testing defaults
          </button>
          <div className={styles.footerRight}>
            <button type="button" onClick={onClose} className={styles.btnSecondary}>Cancel</button>
            <button type="button" onClick={handleSave} className={styles.btnPrimary}>Save</button>
          </div>
        </div>
      }
    >
      <div className={styles.body}>
        {/* Mode selector */}
        <section className={styles.section}>
          <label className={styles.label}>Mode</label>
          <div className={styles.modeRow}>
            {(['off', 'testing', 'live'] as AutoTradeMode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={draft.mode === m ? styles[`modeBtn_${m}_active`] : styles[`modeBtn_${m}`]}
                onClick={() => set('mode', m)}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
          <div className={styles.help}>{MODE_LABELS[draft.mode]}</div>
          {draft.mode === 'live' && (
            <div className={styles.warning}>
              <AlertTriangle size={14} /> Live mode places real-money orders. Ensure analyzer mode is OFF and you've already validated a winner in testing.
            </div>
          )}
        </section>

        {/* Presets */}
        <section className={styles.section}>
          <label className={styles.label}>Quick presets</label>
          <div className={styles.presetRow}>
            <button type="button" className={styles.btnGhost} onClick={() => handleApplyPreset('testing')}>
              Testing (0.5% / 12.5% cap)
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => handleApplyPreset('live')}>
              Live (0.75% / 40% cap)
            </button>
          </div>
        </section>

        {/* Sizing */}
        <section className={styles.section}>
          <div className={styles.grid2}>
            <div>
              <label className={styles.label}>Risk per trade (%)</label>
              <input
                type="number"
                min="0.1"
                max="5"
                step="0.05"
                value={draft.riskPct}
                onChange={(e) => set('riskPct', Number(e.target.value))}
                className={styles.input}
              />
            </div>
            <div>
              <label className={styles.label}>Notional cap (% of capital)</label>
              <input
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={draft.notionalCapPct}
                onChange={(e) => set('notionalCapPct', Number(e.target.value))}
                className={styles.input}
              />
            </div>
            <div>
              <label className={styles.label}>Max concurrent positions</label>
              <input
                type="number"
                min="1"
                max="20"
                step="1"
                value={draft.maxConcurrent}
                onChange={(e) => set('maxConcurrent', Number(e.target.value))}
                className={styles.input}
              />
            </div>
            <div>
              <label className={styles.label}>Max trades per day</label>
              <input
                type="number"
                min="1"
                max="200"
                step="1"
                value={draft.maxTradesPerDay}
                onChange={(e) => set('maxTradesPerDay', Number(e.target.value))}
                className={styles.input}
              />
            </div>
            <div>
              <label className={styles.label}>Daily loss cutoff (%)</label>
              <input
                type="number"
                min="0.5"
                max="10"
                step="0.5"
                value={draft.dailyLossCutoffPct}
                onChange={(e) => set('dailyLossCutoffPct', Number(e.target.value))}
                className={styles.input}
              />
            </div>
            <div>
              <label className={styles.label}>Square-off time (HH:MM IST)</label>
              <input
                type="text"
                placeholder="15:15"
                pattern="[0-9]{2}:[0-9]{2}"
                value={draft.squareOffTime}
                onChange={(e) => set('squareOffTime', e.target.value)}
                className={styles.input}
              />
            </div>
          </div>
        </section>

        {/* Quality filters (just liquidity for now — others have UI-less defaults) */}
        <section className={styles.section}>
          <label className={styles.label}>Quality filters</label>
          <div className={styles.grid2}>
            <div>
              <label className={styles.subLabel}>Min liquidity (₹ Cr / day)</label>
              <input
                type="number"
                min="0"
                max="10000"
                step="10"
                value={draft.qualityFilters.minLiquidityCr}
                onChange={(e) => set('qualityFilters', {
                  ...draft.qualityFilters,
                  minLiquidityCr: Number(e.target.value),
                })}
                className={styles.input}
              />
            </div>
          </div>
          <div className={styles.checkRow}>
            <label>
              <input
                type="checkbox"
                checked={draft.qualityFilters.blockRevengeTrade}
                onChange={(e) => set('qualityFilters', {
                  ...draft.qualityFilters,
                  blockRevengeTrade: e.target.checked,
                })}
              />
              Block re-entry on a symbol that already lost today
            </label>
          </div>
        </section>

        {/* Per-variant toggles */}
        <section className={styles.section}>
          <label className={styles.label}>
            Strategy variants ({enabledCount}/{STRATEGY_VARIANTS.length} enabled)
          </label>
          <div className={styles.variantList}>
            {STRATEGY_VARIANTS.map((v) => (
              <label key={v.id} className={styles.variantRow} title={v.description}>
                <input
                  type="checkbox"
                  checked={v.enabled}
                  onChange={(e) => handleVariantToggle(v.id, e.target.checked)}
                />
                <span className={styles.variantLabel}>{v.label}</span>
                <span className={styles.variantDesc}>{v.description}</span>
              </label>
            ))}
          </div>
        </section>
      </div>
    </BaseModal>
  );
};

export default AutoTradeSettings;
