import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Bot, Settings as SettingsIcon, AlertTriangle } from 'lucide-react';
import { loadAutoTradeConfig, type AutoTradeMode } from '../../services/autoTradeConfig';
import { positionStore } from '../../services/positionStore';
import { tradeJournal } from '../../services/tradeJournal';
import { STRATEGY_VARIANTS } from '../../services/strategyRegistry';
import { multiVariantEngine } from '../../services/multiVariantEngine';
import logger from '../../utils/logger';
import AutoTradeSettings from './AutoTradeSettings';
import styles from './AutoTradeStatusBadge.module.css';

export interface AutoTradeStatusBadgeProps {
  showToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const MODE_LABEL: Record<AutoTradeMode, string> = {
  off: 'AUTO: OFF',
  testing: 'AUTO: TEST',
  live: 'AUTO: LIVE',
};

const AutoTradeStatusBadge: React.FC<AutoTradeStatusBadgeProps> = ({ showToast }) => {
  const [, forceTick] = useState(0);
  const triggerRefresh = useCallback(() => forceTick((t) => t + 1), []);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Subscribe to journal + position store for live counts
  useEffect(() => {
    const unsub1 = tradeJournal.subscribe(triggerRefresh);
    const unsub2 = positionStore.subscribe(triggerRefresh);
    return () => { unsub1(); unsub2(); };
  }, [triggerRefresh]);

  // Re-poll config every 5s in case it was changed elsewhere (e.g., another tab),
  // and self-heal: if saved mode is testing/live but the engine isn't running,
  // start it. This is what survives a page reload — the saved mode stays put,
  // the engine boots automatically when this badge mounts.
  const lastAutoStartRef = useRef<number>(0);
  useEffect(() => {
    const tick = () => {
      const cfg = loadAutoTradeConfig();
      const running = multiVariantEngine.isRunning();
      if (cfg.mode !== 'off' && !running) {
        // Throttle: don't spam start() if it keeps failing
        const now = Date.now();
        if (now - lastAutoStartRef.current > 10_000) {
          lastAutoStartRef.current = now;
          logger.info(`[AutoTradeBadge] Auto-restarting engine (saved mode=${cfg.mode}, was off)`);
          multiVariantEngine.start();
          showToast?.('Auto-trade engine restarted', 'info');
        }
      }
      triggerRefresh();
    };
    tick();
    const id = setInterval(tick, 5_000);
    return () => clearInterval(id);
  }, [triggerRefresh, showToast]);

  const { mode, openCount, todayCount, mismatch } = useMemo(() => {
    const cfg = loadAutoTradeConfig();
    const opens = positionStore.getOpenPositions().length;
    const enabledIds = STRATEGY_VARIANTS.filter((v) => v.enabled).map((v) => v.id);
    const today = enabledIds.reduce(
      (sum, id) => sum + positionStore.getTradesTodayForVariant(id),
      0
    );
    // Mismatch = config says we should be running but engine isn't.
    // Visual flash makes this impossible to miss.
    const running = multiVariantEngine.isRunning();
    const inMismatch = cfg.mode !== 'off' && !running;
    return { mode: cfg.mode, openCount: opens, todayCount: today, mismatch: inMismatch };
  }, []);

  const handleClick = useCallback(() => setIsSettingsOpen(true), []);
  const handleClose = useCallback(() => {
    setIsSettingsOpen(false);
    triggerRefresh();
  }, [triggerRefresh]);

  const className = mismatch
    ? styles.badgeMismatch
    : mode === 'live' ? styles.badgeLive
    : mode === 'testing' ? styles.badgeTesting
    : styles.badgeOff;

  const titleText = mismatch
    ? 'Engine is OFF but mode is set to ' + mode + '. Click to fix.'
    : 'Auto-Trade settings';

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={handleClick}
        title={titleText}
      >
        {mismatch ? <AlertTriangle size={12} /> : <Bot size={12} />}
        <span>{mismatch ? 'AUTO: STOPPED' : MODE_LABEL[mode]}</span>
        {!mismatch && mode !== 'off' && (
          <span className={styles.counts}>
            {openCount}/{todayCount}
          </span>
        )}
        <SettingsIcon size={11} className={styles.settingsIcon} />
      </button>

      <AutoTradeSettings
        isOpen={isSettingsOpen}
        onClose={handleClose}
        showToast={showToast}
      />
    </>
  );
};

export default AutoTradeStatusBadge;
