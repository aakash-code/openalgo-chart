import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Trophy, Download, RefreshCw } from 'lucide-react';
import styles from './StrategyTestPanel.module.css';
import { tradeJournal, type VariantStats } from '../../services/tradeJournal';
import { positionStore } from '../../services/positionStore';
import { STRATEGY_VARIANTS, setVariantEnabled } from '../../services/strategyRegistry';

type SortField = keyof Pick<
  VariantStats,
  'totalPnL' | 'winRate' | 'avgR' | 'trades' | 'profitFactor' | 'maxDrawdown'
>;

const formatCurrency = (n: number): string => {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_00_000) return `${n < 0 ? '-' : ''}₹${(abs / 1_00_000).toFixed(2)}L`;
  if (abs >= 1000) return `${n < 0 ? '-' : ''}₹${(abs / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
};

const formatPct = (n: number): string => `${(n * 100).toFixed(1)}%`;
const formatR = (n: number): string => `${n >= 0 ? '+' : ''}${n.toFixed(2)}R`;
const formatPF = (n: number): string => {
  if (!Number.isFinite(n)) return '∞';
  return n.toFixed(2);
};

const StrategyTestPanel: React.FC = () => {
  const [, forceTick] = useState(0);
  const [sortField, setSortField] = useState<SortField>('totalPnL');
  const [sortDesc, setSortDesc] = useState(true);

  const triggerRefresh = useCallback(() => forceTick((t) => t + 1), []);

  // Subscribe to journal + position store updates
  useEffect(() => {
    const unsub1 = tradeJournal.subscribe(triggerRefresh);
    const unsub2 = positionStore.subscribe(triggerRefresh);
    return () => { unsub1(); unsub2(); };
  }, [triggerRefresh]);

  // Compute stats for every variant
  const stats = useMemo(() => {
    const openCount = new Map<string, number>();
    for (const p of positionStore.getOpenPositions()) {
      openCount.set(p.variantId, (openCount.get(p.variantId) ?? 0) + 1);
    }
    return tradeJournal.getAllStats(openCount);
  }, []);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...stats];
    arr.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      const aNum = typeof av === 'number' ? av : 0;
      const bNum = typeof bv === 'number' ? bv : 0;
      return sortDesc ? bNum - aNum : aNum - bNum;
    });
    return arr;
  }, [stats, sortField, sortDesc]);

  const totalTrades = stats.reduce((s, v) => s + v.trades, 0);
  const totalPnL = stats.reduce((s, v) => s + v.totalPnL, 0);
  const totalOpen = stats.reduce((s, v) => s + v.openCount, 0);

  const handleSort = (field: SortField): void => {
    if (sortField === field) setSortDesc((d) => !d);
    else { setSortField(field); setSortDesc(true); }
  };

  const handleExport = (): void => {
    const csv = tradeJournal.toCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vcp-strategy-journal-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleToggleVariant = (variantId: string, enabled: boolean): void => {
    setVariantEnabled(variantId, enabled);
    triggerRefresh();
  };

  // Identify the leader for trophy icon (only when meaningful sample)
  const leaderId = useMemo(() => {
    const eligible = stats.filter((s) => s.trades >= 5);
    if (eligible.length === 0) return null;
    return eligible.reduce((best, cur) => (cur.totalPnL > best.totalPnL ? cur : best)).variantId;
  }, [stats]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>Strategy Test — VCP Variants</div>
        <div className={styles.summary}>
          <span>Trades: <strong>{totalTrades}</strong></span>
          <span>Open: <strong>{totalOpen}</strong></span>
          <span className={totalPnL >= 0 ? styles.gainText : styles.lossText}>
            P&amp;L: <strong>{formatCurrency(totalPnL)}</strong>
          </span>
          <button type="button" onClick={triggerRefresh} className={styles.iconBtn} title="Refresh">
            <RefreshCw size={13} />
          </button>
          <button type="button" onClick={handleExport} className={styles.iconBtn} title="Export CSV">
            <Download size={13} />
          </button>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.colEnabled}>On</th>
              <th className={styles.colVariant}>Variant</th>
              <th onClick={() => handleSort('trades')} className={styles.sortable}>Trades</th>
              <th onClick={() => handleSort('winRate')} className={styles.sortable}>Win %</th>
              <th onClick={() => handleSort('avgR')} className={styles.sortable}>Avg R</th>
              <th onClick={() => handleSort('totalPnL')} className={styles.sortable}>Total P&amp;L</th>
              <th onClick={() => handleSort('profitFactor')} className={styles.sortable}>PF</th>
              <th onClick={() => handleSort('maxDrawdown')} className={styles.sortable}>Max DD</th>
              <th className={styles.colOpen}>Open</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const variant = STRATEGY_VARIANTS.find((v) => v.id === row.variantId);
              const isLeader = leaderId === row.variantId;
              return (
                <tr key={row.variantId} className={isLeader ? styles.leaderRow : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      checked={variant?.enabled ?? false}
                      onChange={(e) => handleToggleVariant(row.variantId, e.target.checked)}
                      title={variant?.description}
                    />
                  </td>
                  <td className={styles.colVariant}>
                    {isLeader && <Trophy size={11} className={styles.trophy} />}
                    <span className={styles.variantLabel}>{row.variantLabel}</span>
                  </td>
                  <td>{row.trades}</td>
                  <td>{row.trades > 0 ? formatPct(row.winRate) : '—'}</td>
                  <td className={row.avgR >= 0 ? styles.gainText : styles.lossText}>
                    {row.trades > 0 ? formatR(row.avgR) : '—'}
                  </td>
                  <td className={row.totalPnL >= 0 ? styles.gainText : styles.lossText}>
                    {formatCurrency(row.totalPnL)}
                  </td>
                  <td>{row.trades > 0 ? formatPF(row.profitFactor) : '—'}</td>
                  <td className={styles.lossText}>
                    {row.maxDrawdown > 0 ? formatCurrency(-row.maxDrawdown) : '—'}
                  </td>
                  <td>{row.openCount > 0 ? <span className={styles.openBadge}>{row.openCount}</span> : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalTrades === 0 && (
        <div className={styles.empty}>
          No trades yet. Once VCP signals fire and the engine is running, this leaderboard will populate live.
        </div>
      )}
    </div>
  );
};

export default StrategyTestPanel;
