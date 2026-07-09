import React, { useEffect, useState, useCallback, useRef } from 'react';
import { FlaskConical, Zap, Loader2 } from 'lucide-react';
import { getAnalyzerStatus, setAnalyzerMode } from '../../services/openalgoAnalyzer';
import type { AnalyzerStatus } from '../../services/openalgoAnalyzer';
import { DangerDialog, ConfirmDialog } from '../shared/Dialog/BaseDialog';
import styles from './AnalyzerStatusBadge.module.css';

const POLL_INTERVAL_MS = 30_000;

export interface AnalyzerStatusBadgeProps {
  isAuthenticated: boolean;
  /** Toast helper from parent (optional) */
  showToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const AnalyzerStatusBadge: React.FC<AnalyzerStatusBadgeProps> = ({ isAuthenticated, showToast }) => {
  const [status, setStatus] = useState<AnalyzerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<'analyze' | 'live' | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ---- polling ----
  useEffect(() => {
    if (!isAuthenticated) {
      setStatus(null);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      const next = await getAnalyzerStatus();
      if (!cancelled && next) setStatus(next);
    };

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [isAuthenticated]);

  // ---- toggle handler (with confirmation) ----
  const handleClick = useCallback(() => {
    if (!status) return;
    setPendingTarget(status.mode === 'analyze' ? 'live' : 'analyze');
  }, [status]);

  const handleConfirm = useCallback(async () => {
    if (!pendingTarget) return;
    const enable = pendingTarget === 'analyze';
    setLoading(true);
    try {
      const next = await setAnalyzerMode(enable);
      if (next) {
        setStatus(next);
        showToast?.(
          `Mode switched to ${next.mode === 'analyze' ? 'ANALYZER (sandbox)' : 'LIVE'}`,
          enable ? 'info' : 'warning'
        );
      } else {
        showToast?.('Failed to switch mode — check OpenAlgo connection', 'error');
      }
    } finally {
      setLoading(false);
      setPendingTarget(null);
    }
  }, [pendingTarget, showToast]);

  const handleCancel = useCallback(() => setPendingTarget(null), []);

  if (!isAuthenticated || !status) return null;

  const isAnalyze = status.mode === 'analyze';
  const Icon = loading ? Loader2 : isAnalyze ? FlaskConical : Zap;

  return (
    <>
      <button
        type="button"
        className={isAnalyze ? styles.badgeAnalyze : styles.badgeLive}
        onClick={handleClick}
        disabled={loading}
        title={
          isAnalyze
            ? 'ANALYZER mode — orders are simulated. Click to switch to LIVE.'
            : 'LIVE mode — orders go to your real broker. Click to switch to ANALYZER.'
        }
      >
        <Icon size={12} className={loading ? styles.spinning : undefined} />
        <span>{isAnalyze ? 'ANALYZER' : 'LIVE'}</span>
        {isAnalyze && status.totalLogs > 0 && (
          <span className={styles.logCount}>{status.totalLogs}</span>
        )}
      </button>

      {pendingTarget === 'live' ? (
        <DangerDialog
          isOpen
          icon="danger"
          title="Switch to LIVE mode?"
          message={
            <>
              <p>You are about to leave the safety of analyzer mode.</p>
              <p>
                <strong>Every order placed from now on will use real money</strong> and
                hit your live broker account.
              </p>
              <p>Are you sure?</p>
            </>
          }
          confirmText="Yes, go LIVE"
          cancelText="Stay in analyzer"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          loading={loading}
        />
      ) : pendingTarget === 'analyze' ? (
        <ConfirmDialog
          isOpen
          icon="info"
          title="Switch to ANALYZER mode?"
          message="Orders will be simulated against OpenAlgo's sandbox (₹1 Cr virtual capital). No real trades will fire."
          confirmText="Switch to analyzer"
          cancelText="Cancel"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          loading={loading}
        />
      ) : null}
    </>
  );
};

export default AnalyzerStatusBadge;
