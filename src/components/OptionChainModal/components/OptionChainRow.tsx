import React from 'react';
import type { FC } from 'react';
import classNames from 'classnames';
import styles from '../OptionChainModal.module.css';

/**
 * Format helpers
 */
import { formatCompactNumber, formatPrice, formatPercent } from '../../../utils/shared/formatters';

type ColumnType = 'ce' | 'pe';

interface OptionData {
    symbol?: string;
    ltp?: number;
    oi?: number;
    prevClose?: number;
}

interface OptionRow {
    strike: number;
    ce?: OptionData;
    pe?: OptionData;
}

interface LiveData {
    ltp?: number;
}

interface Greeks {
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
}

interface GreeksData {
    greeks?: Greeks;
    iv?: number;
}

export interface OptionChainRowProps {
    row: OptionRow;
    isITM_CE: boolean;
    isITM_PE: boolean;
    rowIndex: number;
    focusedRow: number | null;
    focusedCol: ColumnType | null;
    maxOI: number;
    liveLTP: Map<string, LiveData>;
    onCellClick: (rowIndex: number, col: ColumnType, symbol?: string) => void;
}

export interface OptionChainGreeksRowProps {
    row: OptionRow;
    isITM_CE: boolean;
    isITM_PE: boolean;
    rowIndex: number;
    focusedRow: number | null;
    focusedCol: ColumnType | null;
    liveLTP: Map<string, LiveData>;
    greeksData: Map<string, GreeksData>;
    onCellClick: (rowIndex: number, col: ColumnType, symbol?: string) => void;
}

/**
 * Format helpers
 */
export const formatOI = (oi: number | undefined): string => {
    if (!oi && oi !== 0) return '-';
    return formatCompactNumber(oi, 2);
};

export const formatLTP = (ltp: number | undefined): string =>
    (!ltp && ltp !== 0) ? '-' : formatPrice(ltp, 2);

export const formatLtpChange = (change: number | null): string | null => {
    if (change === null || change === undefined) return null;
    return formatPercent(change, 2, true);
};

export const formatGreek = (value: number | undefined, decimals = 4): string => {
    if (value === null || value === undefined) return '-';
    return formatPrice(value, decimals);
};

export const formatDelta = (value: number | undefined): string => formatGreek(value, 2);

export const formatIv = (value: number | undefined): string => {
    if (value === null || value === undefined) return '-';
    return formatPercent(value, 1, false);
};

export const formatTheta = (value: number | undefined): string => formatGreek(value, 0);
export const formatVega = (value: number | undefined): string => formatGreek(value, 0);
export const formatGamma = (value: number | undefined): string => formatGreek(value, 4);

/**
 * Standard LTP/OI Row Component
 */
export const OptionChainRow: FC<OptionChainRowProps> = ({
    row,
    isITM_CE,
    isITM_PE,
    rowIndex,
    focusedRow,
    focusedCol,
    maxOI,
    liveLTP,
    onCellClick,
}) => {
    const ceLive = liveLTP.get(row.ce?.symbol || '');
    const peLive = liveLTP.get(row.pe?.symbol || '');

    const ceLTP = ceLive?.ltp ?? row.ce?.ltp;
    const peLTP = peLive?.ltp ?? row.pe?.ltp;

    const ceOIWidth = row.ce?.oi ? Math.min((row.ce.oi / maxOI) * 100, 100) : 0;
    const peOIWidth = row.pe?.oi ? Math.min((row.pe.oi / maxOI) * 100, 100) : 0;
    const isRowFocused = rowIndex === focusedRow;

    // Calculate LTP change
    const ceLtpChange = row.ce?.prevClose && ceLTP
        ? ((ceLTP - row.ce.prevClose) / row.ce.prevClose) * 100
        : null;
    const peLtpChange = row.pe?.prevClose && peLTP
        ? ((peLTP - row.pe.prevClose) / row.pe.prevClose) * 100
        : null;

    return (
        <div className={classNames(styles.row, {
            [styles.itmCE]: isITM_CE,
            [styles.itmPE]: isITM_PE,
            [styles.focused]: isRowFocused
        })}>
            {/* CALLS */}
            <div
                className={classNames(styles.cell, styles.combinedCell, styles.combinedCellLeft, styles.clickable, {
                    [styles.focusedCell]: isRowFocused && focusedCol === 'ce'
                })}
                onClick={() => onCellClick(rowIndex, 'ce', row.ce?.symbol)}
            >
                <div className={styles.oiSection}>
                    <div className={styles.oiBarWrapperLeft}>
                        <div className={styles.oiBarGreen} style={{ width: `${ceOIWidth}%` }}></div>
                    </div>
                    <span className={styles.oiValue}>{formatOI(row.ce?.oi)}</span>
                </div>
                <div className={styles.ltpSection}>
                    <span className={styles.ltpValue}>{formatLTP(ceLTP)}</span>
                    {ceLtpChange !== null && (
                        <span className={classNames(styles.ltpChange, ceLtpChange >= 0 ? styles.changePositive : styles.changeNegative)}>
                            {formatLtpChange(ceLtpChange)}
                        </span>
                    )}
                </div>
            </div>

            {/* STRIKE */}
            <div className={classNames(styles.cell, styles.strikeCell)}>
                {formatPrice(row.strike, 0)}
            </div>

            {/* PUTS */}
            <div
                className={classNames(styles.cell, styles.combinedCell, styles.combinedCellRight, styles.clickable, {
                    [styles.focusedCell]: isRowFocused && focusedCol === 'pe'
                })}
                onClick={() => onCellClick(rowIndex, 'pe', row.pe?.symbol)}
            >
                <div className={styles.ltpSection}>
                    <span className={styles.ltpValue}>{formatLTP(peLTP)}</span>
                    {peLtpChange !== null && (
                        <span className={classNames(styles.ltpChange, peLtpChange >= 0 ? styles.changePositive : styles.changeNegative)}>
                            {formatLtpChange(peLtpChange)}
                        </span>
                    )}
                </div>
                <div className={styles.oiSection}>
                    <div className={styles.oiBarWrapperRight}>
                        <div className={styles.oiBarRed} style={{ width: `${peOIWidth}%` }}></div>
                    </div>
                    <span className={styles.oiValue}>{formatOI(row.pe?.oi)}</span>
                </div>
            </div>
        </div>
    );
};

/**
 * Greeks Row Component
 */
export const OptionChainGreeksRow: FC<OptionChainGreeksRowProps> = ({
    row,
    isITM_CE,
    isITM_PE,
    rowIndex,
    focusedRow,
    focusedCol,
    liveLTP,
    greeksData,
    onCellClick,
}) => {
    const ceLive = liveLTP.get(row.ce?.symbol || '');
    const peLive = liveLTP.get(row.pe?.symbol || '');
    const ceLTP = ceLive?.ltp ?? row.ce?.ltp;
    const peLTP = peLive?.ltp ?? row.pe?.ltp;

    const ceGreeks = greeksData.get(row.ce?.symbol || '');
    const peGreeks = greeksData.get(row.pe?.symbol || '');

    const isRowFocused = rowIndex === focusedRow;

    return (
        <div className={classNames(styles.rowGreeks, {
            [styles.itmCE]: isITM_CE,
            [styles.itmPE]: isITM_PE,
            [styles.focused]: isRowFocused
        })}>
            {/* CALLS - Gamma, Vega, Theta, Delta, LTP */}
            <div
                className={classNames(styles.greeksCell, {
                    [styles.focusedCell]: isRowFocused && focusedCol === 'ce'
                })}
                onClick={() => onCellClick(rowIndex, 'ce', row.ce?.symbol)}
            >
                <span className={classNames(styles.greekValue, styles.muted)}>
                    {formatGamma(ceGreeks?.greeks?.gamma)}
                </span>
                <span className={styles.greekValue}>
                    {formatVega(ceGreeks?.greeks?.vega)}
                </span>
                <span className={classNames(styles.greekValue, styles.greekTheta)}>
                    {formatTheta(ceGreeks?.greeks?.theta)}
                </span>
                <span className={classNames(styles.greekValue, styles.greekDeltaPositive)}>
                    {formatDelta(ceGreeks?.greeks?.delta)}
                </span>
                <span className={styles.greekLtp}>{formatLTP(ceLTP)}</span>
            </div>

            {/* STRIKE with IV */}
            <div className={styles.strikeCellGreeks}>
                <span>{formatPrice(row.strike, 0)}</span>
                <span className={styles.strikeIv}>
                    {ceGreeks?.iv ? formatIv(ceGreeks.iv) : ''}
                </span>
            </div>

            {/* PUTS - LTP, Delta, Theta, Vega, Gamma */}
            <div
                className={classNames(styles.greeksCell, {
                    [styles.focusedCell]: isRowFocused && focusedCol === 'pe'
                })}
                onClick={() => onCellClick(rowIndex, 'pe', row.pe?.symbol)}
            >
                <span className={styles.greekLtp}>{formatLTP(peLTP)}</span>
                <span className={classNames(styles.greekValue, styles.greekDeltaNegative)}>
                    {formatDelta(peGreeks?.greeks?.delta)}
                </span>
                <span className={classNames(styles.greekValue, styles.greekTheta)}>
                    {formatTheta(peGreeks?.greeks?.theta)}
                </span>
                <span className={styles.greekValue}>
                    {formatVega(peGreeks?.greeks?.vega)}
                </span>
                <span className={classNames(styles.greekValue, styles.muted)}>
                    {formatGamma(peGreeks?.greeks?.gamma)}
                </span>
            </div>
        </div>
    );
};

export default OptionChainRow;
