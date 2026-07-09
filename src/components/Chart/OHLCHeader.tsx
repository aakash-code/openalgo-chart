/**
 * OHLCHeader Component
 * Displays the symbol, interval, and OHLC data header bar
 */

import React from 'react';
import styles from './ChartComponent.module.css';

interface StrategyConfig {
    displayName?: string;
}

interface OHLCData {
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    change?: number;
    changePercent?: number;
    isUp?: boolean;
}

export interface OHLCHeaderProps {
    symbol: string;
    exchange: string;
    interval: string;
    strategyConfig?: StrategyConfig | null;
    ohlcData?: OHLCData | null;
    isToolbarVisible?: boolean;
    isLeftScaleVisible?: boolean;
}

const OHLCHeader: React.FC<OHLCHeaderProps> = ({
    symbol,
    exchange,
    interval,
    strategyConfig,
    ohlcData,
    isToolbarVisible,
    isLeftScaleVisible
}) => {
    // Calculate left offset:
    // Toolbar width (approx 45px + 10px margin) if visible
    // + Left Scale width (approx 70px) if visible
    // + Base margin (10px) if toolbar hidden
    const toolbarOffset = isToolbarVisible ? 55 : 10;
    const scaleOffset = isLeftScaleVisible ? 70 : 0;
    const leftPos = toolbarOffset + scaleOffset;

    return (
        <div className={styles.ohlcHeader} style={{ left: `${leftPos}px` }}>
            <span className={styles.ohlcSymbol}>
                {strategyConfig?.displayName || `${symbol}:${exchange}`}
            </span>
            <span className={styles.ohlcInterval}>· {interval.toUpperCase()}</span>
            {ohlcData && (
                <>
                    <span className={`${styles.ohlcDot} ${ohlcData.isUp ? '' : styles.down}`}></span>
                    <div className={styles.ohlcValues}>
                        <span className={styles.ohlcItem}>
                            <span className={styles.ohlcLabel}>O</span>
                            <span className={styles.ohlcValue}>{ohlcData.open?.toFixed(2)}</span>
                        </span>
                        <span className={styles.ohlcItem}>
                            <span className={styles.ohlcLabel}>H</span>
                            <span className={styles.ohlcValue}>{ohlcData.high?.toFixed(2)}</span>
                        </span>
                        <span className={styles.ohlcItem}>
                            <span className={styles.ohlcLabel}>L</span>
                            <span className={styles.ohlcValue}>{ohlcData.low?.toFixed(2)}</span>
                        </span>
                        <span className={styles.ohlcItem}>
                            <span className={styles.ohlcLabel}>C</span>
                            <span className={`${styles.ohlcValue} ${ohlcData.isUp ? styles.up : styles.down}`}>
                                {ohlcData.close?.toFixed(2)}
                            </span>
                        </span>
                        <span className={styles.ohlcChange}>
                            <span className={`${styles.ohlcChangeValue} ${(ohlcData.change ?? 0) >= 0 ? styles.up : styles.down}`}>
                                {(ohlcData.change ?? 0) >= 0 ? '+' : ''}{ohlcData.change?.toFixed(2)} ({(ohlcData.changePercent ?? 0) >= 0 ? '+' : ''}{ohlcData.changePercent?.toFixed(2)}%)
                            </span>
                        </span>
                    </div>
                </>
            )}
        </div>
    );
};

export default OHLCHeader;
