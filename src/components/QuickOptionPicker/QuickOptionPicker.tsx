import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FC, RefObject } from 'react';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { getOptionChain, getAvailableExpiries, UNDERLYINGS, parseExpiryDate } from '../../services/optionChain';
import { formatCurrency } from '../../utils/shared/formatters';
import styles from './QuickOptionPicker.module.css';
import classNames from 'classnames';
import logger from '../../utils/logger';

interface Underlying {
    symbol: string;
    name?: string;
    exchange: string;
    indexExchange?: string;
}

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

interface OptionChainData {
    chain?: OptionRow[];
    atmStrike?: number;
    spotPrice?: number;
    underlyingLTP?: number;
}

interface Position {
    top: number;
    left: number;
}

interface Metrics {
    pcr: number;
    atmPremium: number;
    totalCeOI?: number;
    totalPeOI?: number;
}

export interface QuickOptionPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (symbol: string, exchange: string) => void;
    anchorRef?: RefObject<HTMLElement>;
}

/**
 * QuickOptionPicker - Full option chain dropdown for charting individual options
 * Shows OI, OI Bars, LTP, and metrics without strategy building
 * Click on any CE/PE to chart that option
 */
const QuickOptionPicker: FC<QuickOptionPickerProps> = ({ isOpen, onClose, onSelect, anchorRef }) => {
    const [underlying, setUnderlying] = useState<Underlying>(UNDERLYINGS[0] as Underlying);
    const [optionChain, setOptionChain] = useState<OptionChainData | null>(null);
    const [availableExpiries, setAvailableExpiries] = useState<string[]>([]);
    const [selectedExpiry, setSelectedExpiry] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingExpiries, setIsLoadingExpiries] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expiryScrollIndex, setExpiryScrollIndex] = useState(0);
    const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Calculate position from anchor element
    useEffect(() => {
        if (isOpen && anchorRef?.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 4,
                left: Math.max(8, rect.left - 200) // Center dropdown, keep within viewport
            });
        }
    }, [isOpen, anchorRef]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent): void => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                if (anchorRef?.current && anchorRef.current.contains(e.target as Node)) {
                    return; // Don't close if clicking the anchor button
                }
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose, anchorRef]);

    // Fetch expiries when underlying changes
    const fetchExpiries = useCallback(async (): Promise<void> => {
        setIsLoadingExpiries(true);
        try {
            const expiries = await getAvailableExpiries(underlying.symbol, underlying.exchange) as string[];
            setAvailableExpiries(expiries);
            if (expiries.length > 0) {
                setSelectedExpiry(expiries[0]);
                setExpiryScrollIndex(0);
            }
        } catch (err) {
            logger.error('Failed to fetch expiries:', err);
            setAvailableExpiries([]);
        } finally {
            setIsLoadingExpiries(false);
        }
    }, [underlying]);

    // Fetch option chain when expiry changes
    const fetchChain = useCallback(async (forceRefresh = false): Promise<void> => {
        if (!selectedExpiry) return;

        setIsLoading(true);
        setError(null);
        try {
            const chain = await getOptionChain(
                underlying.symbol,
                underlying.exchange,
                selectedExpiry,
                15,
                forceRefresh
            ) as OptionChainData;
            if (!chain || (chain.chain?.length ?? 0) === 0) {
                setError('No data available');
                setOptionChain(null);
                return;
            }
            setOptionChain(chain);
        } catch (err) {
            setError('Failed to fetch option chain');
        } finally {
            setIsLoading(false);
        }
    }, [underlying, selectedExpiry]);

    useEffect(() => {
        if (isOpen) {
            fetchExpiries();
        }
    }, [isOpen, fetchExpiries]);

    useEffect(() => {
        if (isOpen && selectedExpiry) {
            fetchChain();
        }
    }, [isOpen, selectedExpiry, fetchChain]);

    // Format expiry tab
    const formatExpiryTab = (expiryStr: string): string => {
        const date = parseExpiryDate(expiryStr);
        if (!date) return expiryStr;
        const day = date.getDate();
        const month = date.toLocaleDateString('en-IN', { month: 'short' });
        return `${day} ${month}`;
    };

    // Visible expiries (show 4 at a time)
    const visibleExpiries = useMemo((): string[] => {
        return availableExpiries.slice(expiryScrollIndex, expiryScrollIndex + 4);
    }, [availableExpiries, expiryScrollIndex]);

    const canScrollLeft = expiryScrollIndex > 0;
    const canScrollRight = expiryScrollIndex + 4 < availableExpiries.length;

    // Handle option click
    const handleOptionClick = useCallback((optionData: OptionData): void => {
        if (!optionData?.symbol) return;
        onSelect(optionData.symbol, 'NFO');
    }, [onSelect]);

    // Format LTP
    const formatLTP = (ltp: number | undefined): string => {
        if (!ltp && ltp !== 0) return '-';
        return ltp.toFixed(1);
    };

    // Format OI with K/L suffixes
    const formatOI = (oi: number | undefined): string => {
        if (!oi && oi !== 0) return '-';
        if (oi >= 10000000) return (oi / 10000000).toFixed(1) + 'Cr';
        if (oi >= 100000) return (oi / 100000).toFixed(1) + 'L';
        if (oi >= 1000) return (oi / 1000).toFixed(1) + 'K';
        return oi.toString();
    };

    // Format spot price
    const formatSpotPrice = (price: number | undefined): string => {
        if (!price) return '-';
        return formatCurrency(price, { showSymbol: false, decimals: 2 });
    };

    const chainData = optionChain?.chain || [];
    const atmStrike = optionChain?.atmStrike || 0;
    const spotPrice = optionChain?.spotPrice || 0;

    // Calculate max OI for bar percentage
    const maxOI = useMemo((): number => {
        if (chainData.length === 0) return 1;
        return Math.max(
            ...chainData.flatMap(r => [r.ce?.oi || 0, r.pe?.oi || 0]),
            1 // Prevent division by zero
        );
    }, [chainData]);

    // Calculate metrics
    const metrics = useMemo((): Metrics => {
        if (chainData.length === 0) return { pcr: 0, atmPremium: 0 };

        let totalCeOI = 0;
        let totalPeOI = 0;
        let atmPremium = 0;

        chainData.forEach(row => {
            totalCeOI += row.ce?.oi || 0;
            totalPeOI += row.pe?.oi || 0;
            if (row.strike === atmStrike) {
                atmPremium = (row.ce?.ltp || 0) + (row.pe?.ltp || 0);
            }
        });

        const pcr = totalCeOI > 0 ? totalPeOI / totalCeOI : 0;

        return { pcr, atmPremium, totalCeOI, totalPeOI };
    }, [chainData, atmStrike]);

    if (!isOpen) return null;

    return (
        <div className={styles.dropdown} ref={dropdownRef} style={{ top: position.top, left: position.left }}>
            {/* Header */}
            <div className={styles.header}>
                <select
                    className={styles.underlyingSelect}
                    value={underlying.symbol}
                    onChange={(e) => {
                        const found = (UNDERLYINGS as Underlying[]).find(u => u.symbol === e.target.value);
                        if (found) {
                            setUnderlying(found);
                            setSelectedExpiry(null);
                            setOptionChain(null);
                        }
                    }}
                >
                    {(UNDERLYINGS as Underlying[]).map(u => (
                        <option key={u.symbol} value={u.symbol}>{u.symbol}</option>
                    ))}
                </select>

                {spotPrice > 0 && (
                    <div className={styles.spotPrice}>
                        <span className={styles.spotLabel}>Spot:</span>
                        <span>{formatSpotPrice(spotPrice)}</span>
                    </div>
                )}

                <div className={styles.expiryTabs}>
                    {canScrollLeft && (
                        <button className={styles.scrollBtn} onClick={() => setExpiryScrollIndex(prev => Math.max(0, prev - 1))}>
                            <ChevronLeft size={14} />
                        </button>
                    )}
                    {isLoadingExpiries ? (
                        <span className={styles.loadingText}>Loading...</span>
                    ) : (
                        visibleExpiries.map(exp => (
                            <button
                                key={exp}
                                className={classNames(styles.expiryTab, { [styles.activeTab]: selectedExpiry === exp })}
                                onClick={() => setSelectedExpiry(exp)}
                            >
                                {formatExpiryTab(exp)}
                            </button>
                        ))
                    )}
                    {canScrollRight && (
                        <button className={styles.scrollBtn} onClick={() => setExpiryScrollIndex(prev => prev + 1)}>
                            <ChevronRight size={14} />
                        </button>
                    )}
                </div>

                <button
                    className={styles.refreshBtn}
                    onClick={() => fetchChain(true)}
                    disabled={isLoading}
                    title="Refresh"
                >
                    <RefreshCw size={12} className={isLoading ? styles.spinning : ''} />
                </button>
            </div>

            {/* Metrics Bar */}
            {chainData.length > 0 && (
                <div className={styles.metricsBar}>
                    <div className={styles.metric}>
                        <span className={styles.metricLabel}>PCR:</span>
                        <span className={classNames(styles.metricValue, {
                            [styles.bullish]: metrics.pcr > 1,
                            [styles.bearish]: metrics.pcr < 1
                        })}>
                            {metrics.pcr.toFixed(2)}
                        </span>
                    </div>
                    <div className={styles.metric}>
                        <span className={styles.metricLabel}>ATM Premium:</span>
                        <span className={styles.metricValue}>₹{metrics.atmPremium.toFixed(0)}</span>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className={styles.content}>
                {isLoading ? (
                    <div className={styles.loadingState}>
                        <Loader2 size={20} className={styles.spinning} />
                    </div>
                ) : error ? (
                    <div className={styles.errorState}>{error}</div>
                ) : chainData.length === 0 ? (
                    <div className={styles.emptyState}>Select expiry to load chain</div>
                ) : (
                    <>
                        <div className={styles.tableHeader}>
                            <div>OI</div>
                            <div>CE OI</div>
                            <div>CE LTP</div>
                            <div>Strike</div>
                            <div>PE LTP</div>
                            <div>PE OI</div>
                            <div>OI</div>
                        </div>
                        <div className={styles.tableBody}>
                            {chainData.map(row => {
                                const isATM = row.strike === atmStrike;
                                const ceITM = spotPrice > 0 && row.strike < spotPrice;
                                const peITM = spotPrice > 0 && row.strike > spotPrice;
                                const ceOIPercent = ((row.ce?.oi || 0) / maxOI) * 100;
                                const peOIPercent = ((row.pe?.oi || 0) / maxOI) * 100;

                                return (
                                    <div
                                        key={row.strike}
                                        className={classNames(styles.tableRow, { [styles.atmRow]: isATM })}
                                    >
                                        {/* CE OI Bar */}
                                        <div className={classNames(styles.colOIBar, styles.ce)}>
                                            <div
                                                className={classNames(styles.oiBarInner, styles.ce)}
                                                style={{ width: `${ceOIPercent}%` }}
                                            />
                                        </div>

                                        {/* CE OI */}
                                        <div className={styles.colOI}>
                                            {formatOI(row.ce?.oi)}
                                        </div>

                                        {/* CE LTP */}
                                        <div
                                            className={classNames(styles.colCE, styles.clickable, { [styles.itm]: ceITM })}
                                            onClick={() => row.ce && handleOptionClick(row.ce)}
                                            title={row.ce?.symbol || ''}
                                        >
                                            {formatLTP(row.ce?.ltp)}
                                        </div>

                                        {/* Strike */}
                                        <div className={styles.colStrike}>
                                            {row.strike}
                                        </div>

                                        {/* PE LTP */}
                                        <div
                                            className={classNames(styles.colPE, styles.clickable, { [styles.itm]: peITM })}
                                            onClick={() => row.pe && handleOptionClick(row.pe)}
                                            title={row.pe?.symbol || ''}
                                        >
                                            {formatLTP(row.pe?.ltp)}
                                        </div>

                                        {/* PE OI */}
                                        <div className={styles.colOI}>
                                            {formatOI(row.pe?.oi)}
                                        </div>

                                        {/* PE OI Bar */}
                                        <div className={classNames(styles.colOIBar, styles.pe)}>
                                            <div
                                                className={classNames(styles.oiBarInner, styles.pe)}
                                                style={{ width: `${peOIPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default QuickOptionPicker;
