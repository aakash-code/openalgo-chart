import React, { useState } from 'react';
import { Settings, X, RotateCcw } from 'lucide-react';
import styles from './ScannerConfig.module.css';
import type { ScannerConfig } from '../../types/scanner';
import { DEFAULT_SCANNER_CONFIG } from '../../services/breakoutScannerService';

interface Props {
  config: ScannerConfig;
  onChange: (cfg: ScannerConfig) => void;
  onClose: () => void;
}

const ScannerConfig: React.FC<Props> = ({ config, onChange, onClose }) => {
  const [local, setLocal] = useState<ScannerConfig>({ ...config });

  const set = <K extends keyof ScannerConfig>(key: K, val: ScannerConfig[K]) =>
    setLocal(prev => ({ ...prev, [key]: val }));

  const handleSave = () => { onChange(local); onClose(); };
  const handleReset = () => setLocal({ ...DEFAULT_SCANNER_CONFIG });

  // Live qty preview
  const sampleEntry = 1000;
  const sampleSl    = 990;
  const riskBudget  = local.balance * (local.maxLossPct / 100);
  const previewQty  = Math.min(
    Math.floor(riskBudget / (sampleEntry - sampleSl)),
    Math.floor(local.capitalPerTrade / sampleEntry)
  );

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}><Settings size={13} /> Config</span>
        <div className={styles.headerActions}>
          <button className={styles.resetBtn} onClick={handleReset} title="Reset to defaults">
            <RotateCcw size={12} />
          </button>
          <button className={styles.closeBtn} onClick={onClose}><X size={14} /></button>
        </div>
      </div>

      <div className={styles.body}>

        {/* ── Stock universe ── */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>Stock Universe</div>
          <div className={styles.radioGroup}>
            {(['tradefinder', 'watchlist', 'custom'] as const).map(s => (
              <label key={s} className={styles.radioLabel}>
                <input type="radio" name="source" value={s}
                  checked={local.source === s}
                  onChange={() => set('source', s)} />
                {s === 'tradefinder' ? 'TradeFinder' : s === 'watchlist' ? 'My Watchlist' : 'Custom'}
              </label>
            ))}
          </div>

          {local.source === 'tradefinder' && (
            <>
              <label className={styles.fieldLabel}>JWT Token (paste each morning)</label>
              <textarea
                className={styles.jwtInput}
                rows={3}
                placeholder="eyJhbGci..."
                value={local.tfJwt}
                onChange={e => set('tfJwt', e.target.value)}
              />
              <label className={styles.fieldLabel}>Top N stocks (0 = all)</label>
              <input type="number" className={styles.input} min={0} max={200}
                value={local.maxStocks}
                onChange={e => set('maxStocks', Number(e.target.value))} />
            </>
          )}

          {local.source === 'custom' && (
            <>
              <label className={styles.fieldLabel}>Symbols (comma-separated)</label>
              <textarea
                className={styles.jwtInput}
                rows={3}
                placeholder="HCLTECH,TCS,INFY,SBIN"
                value={local.customSymbols}
                onChange={e => set('customSymbols', e.target.value)}
              />
            </>
          )}
        </section>

        {/* ── Signal filters ── */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>Signal Filters</div>

          <div className={styles.toggleRow}>
            <span>Enable BUY (LONG)</span>
            <input type="checkbox" checked={local.enableBuy}
              onChange={e => set('enableBuy', e.target.checked)} />
          </div>
          <div className={styles.toggleRow}>
            <span>Enable SELL (SHORT)</span>
            <input type="checkbox" checked={local.enableSell}
              onChange={e => set('enableSell', e.target.checked)} />
          </div>
          <div className={styles.toggleRow}>
            <span>Double-candle breakout</span>
            <input type="checkbox" checked={local.enableDouble}
              onChange={e => set('enableDouble', e.target.checked)} />
          </div>
          <div className={styles.toggleRow}>
            <span>Single-candle breakout</span>
            <input type="checkbox" checked={local.enableSingle}
              onChange={e => set('enableSingle', e.target.checked)} />
          </div>
          <div className={styles.toggleRow}>
            <span>VWAP filter</span>
            <input type="checkbox" checked={local.useVwap}
              onChange={e => set('useVwap', e.target.checked)} />
          </div>
          <div className={styles.toggleRow}>
            <span>ADX filter</span>
            <input type="checkbox" checked={local.useAdx}
              onChange={e => set('useAdx', e.target.checked)} />
          </div>

          {local.useAdx && (
            <div className={styles.twoCol}>
              <div>
                <label className={styles.fieldLabel}>ADX Threshold</label>
                <input type="number" className={styles.input} min={10} max={60}
                  value={local.adxThreshold}
                  onChange={e => set('adxThreshold', Number(e.target.value))} />
              </div>
              <div>
                <label className={styles.fieldLabel}>ADX Period</label>
                <input type="number" className={styles.input} min={5} max={30}
                  value={local.adxPeriod}
                  onChange={e => set('adxPeriod', Number(e.target.value))} />
              </div>
            </div>
          )}

          <label className={styles.fieldLabel}>Min SL distance % (skip tiny SL)</label>
          <input type="number" className={styles.input} min={0} max={5} step={0.1}
            value={local.minSlDistPct}
            onChange={e => set('minSlDistPct', Number(e.target.value))} />
        </section>

        {/* ── Sizing ── */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>Sizing (Pine Risk Calculator)</div>

          <div className={styles.twoCol}>
            <div>
              <label className={styles.fieldLabel}>Balance (₹)</label>
              <input type="number" className={styles.input} min={10000}
                value={local.balance}
                onChange={e => set('balance', Number(e.target.value))} />
            </div>
            <div>
              <label className={styles.fieldLabel}>Risk % / trade</label>
              <input type="number" className={styles.input} min={0.1} max={5} step={0.1}
                value={local.maxLossPct}
                onChange={e => set('maxLossPct', Number(e.target.value))} />
            </div>
          </div>

          <div className={styles.twoCol}>
            <div>
              <label className={styles.fieldLabel}>Capital / trade (₹)</label>
              <input type="number" className={styles.input} min={5000}
                value={local.capitalPerTrade}
                onChange={e => set('capitalPerTrade', Number(e.target.value))} />
            </div>
            <div>
              <label className={styles.fieldLabel}>Target RR (0 = off)</label>
              <input type="number" className={styles.input} min={0} max={10} step={0.5}
                value={local.targetRR}
                onChange={e => set('targetRR', Number(e.target.value))} />
            </div>
          </div>

          <div className={styles.preview}>
            <span>Live preview</span>
            <span>@₹{sampleEntry} SL ₹{sampleSl} → <strong>{previewQty} qty</strong></span>
            <span className={styles.previewSub}>
              Risk ₹{(local.balance * local.maxLossPct / 100).toFixed(0)} | Cap ₹{local.capitalPerTrade.toLocaleString()}
            </span>
          </div>
        </section>

        {/* ── Refresh ── */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>Auto Refresh</div>
          <div className={styles.toggleRow}>
            <span>Auto-scan at every 5m bar close</span>
            <input type="checkbox" checked={local.autoRefresh}
              onChange={e => set('autoRefresh', e.target.checked)} />
          </div>
        </section>

      </div>

      <div className={styles.footer}>
        <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
        <button className={styles.saveBtn} onClick={handleSave}>Save & Apply</button>
      </div>
    </div>
  );
};

export default ScannerConfig;
