import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FC, ChangeEvent } from 'react';
import { X, TrendingUp, Loader2, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, Settings2 } from 'lucide-react';
import { getOptionChain, getAvailableExpiries, UNDERLYINGS, getDaysToExpiry, parseExpiryDate, fetchMultiOptionGreeks, clearOptionChainCache } from '../../services/optionChain';
import { subscribeToMultiTicker } from '../../services/openalgo';
import { STRATEGY_TEMPLATES, applyTemplate, validateStrategy, calculateNetPremium, formatStrategyName, generateLegId } from '../../services/strategyTemplates';
import styles from './OptionChainPicker.module.css';
import classNames from 'classnames';
import logger from '../../utils/logger';

// Import extracted components and hooks
import { LegBuilder } from './components';
import { useOptionFilters } from './hooks';
import { formatCurrency, formatCompactNumber } from '../../utils/shared/formatters';

type Direction = 'buy' | 'sell';
type OptionType = 'CE' | 'PE';

interface Underlying {
    symbol: string;
    name?: string;
    exchange: string;
    indexExchange?: string;
}

interface Leg {
    id: string;
    type: OptionType;
    strike: number;
    symbol: string;
    direction: Direction;
    quantity: number;
    ltp: number;
}

interface OptionData {
    symbol?: string;
    ltp?: number;
    oi?: number;
}

interface OptionRow {
    strike: number;
    ce?: OptionData;
    pe?: OptionData;
    straddlePremium?: number;
}

interface OptionChainData {
    chain?: OptionRow[];
    atmStrike?: number;
    underlyingLTP?: number;
    underlying?: string;
    expiryDate?: string;
}

interface GreeksDataItem {
    delta?: number;
    iv?: number;
}

interface AllExpiriesOI {
    totalCeOI: number;
    totalPeOI: number;
    isLoading: boolean;
    loadedCount: number;
    totalExpiries: number;
}

interface Metrics {
    totalCeOI: number;
    totalPeOI: number;
    totalCeOIFormatted: string;
    totalPeOIFormatted: string;
    maxOI: number;
    straddlePrem: string;
    pcr: string;
}

interface ExpiryTabInfo {
    display: string;
    dte: number;
    label: string;
}

interface StrategyConfig {
    strategyType: string;
    underlying: string;
    exchange: string;
    expiry: string | null;
    legs: Leg[];
    displayName: string;
}

interface WebSocketConnection {
    close: () => void;
}

interface TickerData {
    symbol: string;
    last: number;
}

interface StrategyTemplate {
    name?: string;
    shortName?: string;
    description?: string;
}

export interface OptionChainPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (config: StrategyConfig) => void;
}

/**
 * OptionChainPicker - Professional Option Chain UI with Multi-Leg Strategy Support
 */
const OptionChainPicker: FC<OptionChainPickerProps> = ({ isOpen, onClose, onSelect }) => {
    const [underlying, setUnderlying] = useState<Underlying>(UNDERLYINGS[0] as Underlying);
    const [optionChain, setOptionChain] = useState<OptionChainData | null>(null);
    const [availableExpiries, setAvailableExpiries] = useState<string[]>([]);
    const [selectedExpiry, setSelectedExpiry] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingExpiries, setIsLoadingExpiries] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expiryScrollIndex, setExpiryScrollIndex] = useState(0);

    // Multi-leg strategy state
    const [legs, setLegs] = useState<Leg[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState('straddle');

    // Use extracted hook for filter and add-ons state
    const {
        showOI, setShowOI,
        showOIBars, setShowOIBars,
        showPremium, setShowPremium,
        showDelta, setShowDelta,
        showIV, setShowIV,
        addOnsOpen, setAddOnsOpen,
        addOnsRef,
        strikeCount, setStrikeCount,
        STRIKE_COUNT_OPTIONS,
    } = useOptionFilters();

    // WebSocket ref
    const optionChainWsRef = useRef<WebSocketConnection | null>(null);

    // Greeks state
    const [greeksData, setGreeksData] = useState<Record<string, GreeksDataItem>>({});
    const [isLoadingGreeks, setIsLoadingGreeks] = useState(false);

    // Aggregated OI across all expiries
    const [allExpiriesOI, setAllExpiriesOI] = useState<AllExpiriesOI>({
        totalCeOI: 0,
        totalPeOI: 0,
        isLoading: false,
        loadedCount: 0,
        totalExpiries: 0
    });
    const oiFetchAbortRef = useRef(false);

    // Request tracking refs
    const expiryRequestIdRef = useRef(0);
    const chainRequestIdRef = useRef(0);

    // Fetch available expiries
    const fetchExpiries = useCallback(async (): Promise<void> => {
        const requestId = ++expiryRequestIdRef.current;
        const currentSymbol = underlying.symbol;
        const currentExchange = underlying.exchange;

        logger.debug('[OptionChainPicker] Fetching expiries for', currentSymbol, 'requestId:', requestId);
        setIsLoadingExpiries(true);

        try {
            const expiries = await getAvailableExpiries(currentSymbol, currentExchange) as string[];

            if (requestId !== expiryRequestIdRef.current) {
                logger.debug('[OptionChainPicker] Discarding stale expiry response');
                return;
            }

            setAvailableExpiries(expiries);
            if (expiries.length > 0) {
                setSelectedExpiry(expiries[0]);
                setExpiryScrollIndex(0);
            }
        } catch (err) {
            if (requestId === expiryRequestIdRef.current) {
                logger.error('Failed to fetch expiries:', err);
                setAvailableExpiries([]);
            }
        } finally {
            if (requestId === expiryRequestIdRef.current) {
                setIsLoadingExpiries(false);
            }
        }
    }, [underlying.symbol, underlying.exchange]);

    // Fetch option chain
    const fetchChain = useCallback(async (forceRefresh = false): Promise<void> => {
        if (!selectedExpiry) return;

        const requestId = ++chainRequestIdRef.current;
        const currentSymbol = underlying.symbol;
        const currentExchange = underlying.exchange;
        const currentExpiry = selectedExpiry;

        logger.debug('[OptionChainPicker] Fetching chain for', currentSymbol, currentExpiry, 'requestId:', requestId);
        setIsLoading(true);
        setError(null);
        setGreeksData({});

        try {
            const chain = await getOptionChain(currentSymbol, currentExchange, currentExpiry, strikeCount, forceRefresh) as any;

            if (requestId !== chainRequestIdRef.current) {
                logger.debug('[OptionChainPicker] Discarding stale chain response');
                return;
            }

            if (!chain || (chain.chain?.length ?? 0) === 0) {
                const reason = !chain ? 'null_response' : !chain.chain ? 'missing_chain_array' : 'empty_chain_array';
                logger.error('[OptionChainPicker] Empty chain:', { reason });
                setError(`No data available (${reason}). Please wait 30-60 seconds and try again.`);
                setOptionChain(null);
                return;
            }

            setOptionChain(chain);
            setLegs([]);
        } catch (err) {
            if (requestId === chainRequestIdRef.current) {
                logger.error('[OptionChainPicker] Fetch error:', err);
                const errMessage = (err as Error).message || '';
                if (errMessage.includes('500') || errMessage.includes('rate limit')) {
                    setError('Broker rate limit hit. Please wait 30-60 seconds and try again.');
                } else {
                    setError('Failed to fetch option chain');
                }
            }
        } finally {
            if (requestId === chainRequestIdRef.current) {
                setIsLoading(false);
            }
        }
    }, [underlying.symbol, underlying.exchange, selectedExpiry, strikeCount]);

    // Force refresh
    const handleForceRefresh = useCallback((): void => {
        clearOptionChainCache(underlying.symbol, selectedExpiry!);
        fetchChain(true);
    }, [underlying.symbol, selectedExpiry, fetchChain]);

    // Fetch aggregated OI
    const fetchAllExpiriesOI = useCallback(async (): Promise<void> => {
        if (!availableExpiries.length) return;

        oiFetchAbortRef.current = false;
        setAllExpiriesOI({
            totalCeOI: 0,
            totalPeOI: 0,
            isLoading: true,
            loadedCount: 0,
            totalExpiries: availableExpiries.length
        });

        let totalCeOI = 0;
        let totalPeOI = 0;

        for (let i = 0; i < availableExpiries.length; i++) {
            if (oiFetchAbortRef.current) break;

            const expiry = availableExpiries[i];
            try {
                const chain = await getOptionChain(underlying.symbol, underlying.exchange, expiry, strikeCount, false) as any;

                if (chain?.chain) {
                    chain.chain.forEach(row => {
                        totalCeOI += row.ce?.oi || 0;
                        totalPeOI += row.pe?.oi || 0;
                    });
                }

                setAllExpiriesOI(prev => ({
                    ...prev,
                    totalCeOI,
                    totalPeOI,
                    loadedCount: i + 1
                }));

                if (i < availableExpiries.length - 1) {
                    await new Promise(r => setTimeout(r, 2000));
                }
            } catch (e) {
                logger.warn('[OI Aggregation] Failed for expiry:', expiry, (e as Error).message);
            }
        }

        setAllExpiriesOI(prev => ({
            ...prev,
            isLoading: false
        }));
    }, [availableExpiries, underlying, strikeCount]);

    // Fetch Greeks
    const fetchGreeks = useCallback(async (chainRows: OptionRow[]): Promise<void> => {
        if (!chainRows?.length) return;

        setIsLoadingGreeks(true);
        logger.debug('[Greeks] Using batch API for', chainRows.length, 'strikes');

        try {
            const symbols = chainRows.slice(0, 25).flatMap(row => [
                row.ce?.symbol && { symbol: row.ce.symbol, exchange: underlying.exchange },
                row.pe?.symbol && { symbol: row.pe.symbol, exchange: underlying.exchange }
            ].filter(Boolean)) as Array<{ symbol: string; exchange: string }>;

            if (symbols.length === 0) {
                setIsLoadingGreeks(false);
                return;
            }

            const response = await fetchMultiOptionGreeks(symbols) as {
                data?: Array<{ status: string; symbol?: string; greeks?: { delta?: number }; implied_volatility?: number }>;
                summary?: string;
            };

            if (response?.data) {
                const results: Record<string, GreeksDataItem> = {};

                response.data.forEach(item => {
                    if (item.status === 'success' && item.symbol) {
                        results[item.symbol] = {
                            delta: item.greeks?.delta,
                            iv: item.implied_volatility
                        };
                    }
                });

                logger.debug('[Greeks] Batch results:', response.summary, '- Loaded', Object.keys(results).length, 'symbols');
                setGreeksData(results);
            } else {
                logger.warn('[Greeks] Batch API returned empty response');
            }
        } catch (error) {
            logger.error('[Greeks] Batch API error:', error);
        } finally {
            setIsLoadingGreeks(false);
        }
    }, [underlying.exchange]);

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

    useEffect(() => {
        if (isOpen && availableExpiries.length > 0) {
            fetchAllExpiriesOI();
        }
        return () => {
            oiFetchAbortRef.current = true;
        };
    }, [isOpen, availableExpiries, fetchAllExpiriesOI]);

    useEffect(() => {
        setAllExpiriesOI({
            totalCeOI: 0,
            totalPeOI: 0,
            isLoading: false,
            loadedCount: 0,
            totalExpiries: 0
        });
    }, [underlying]);

    // WebSocket subscription
    useEffect(() => {
        if (!isOpen || !optionChain?.chain?.length) return;

        if (optionChainWsRef.current) {
            optionChainWsRef.current.close();
            optionChainWsRef.current = null;
        }

        const symbols = optionChain.chain.flatMap(row => [
            row.ce?.symbol && { symbol: row.ce.symbol, exchange: 'NFO' },
            row.pe?.symbol && { symbol: row.pe.symbol, exchange: 'NFO' }
        ].filter(Boolean)) as Array<{ symbol: string; exchange: string }>;

        if (symbols.length === 0) return;

        logger.debug('[OptionChainPicker] Subscribing to', symbols.length, 'option symbols');

        optionChainWsRef.current = subscribeToMultiTicker(symbols, (ticker: TickerData) => {
            setOptionChain(prev => {
                if (!prev) return prev;
                const newChain = prev.chain?.map(row => {
                    if (row.ce?.symbol === ticker.symbol) {
                        return { ...row, ce: { ...row.ce, ltp: ticker.last } };
                    }
                    if (row.pe?.symbol === ticker.symbol) {
                        return { ...row, pe: { ...row.pe, ltp: ticker.last } };
                    }
                    return row;
                });
                return { ...prev, chain: newChain };
            });
        }) as WebSocketConnection;

        return () => {
            if (optionChainWsRef.current) {
                logger.debug('[OptionChainPicker] Unsubscribing from option chain WebSocket');
                optionChainWsRef.current.close();
                optionChainWsRef.current = null;
            }
        };
    }, [isOpen, optionChain?.underlying, optionChain?.expiryDate]);

    // Chain data
    const chainData = useMemo(() => optionChain?.chain || [], [optionChain]);
    const atmStrike = optionChain?.atmStrike || 0;

    // Calculate strike gap
    const strikeGap = useMemo((): number => {
        if (chainData.length < 2) return 50;
        const strikes = chainData.map(r => r.strike).sort((a, b) => a - b);
        return strikes[1] - strikes[0];
    }, [chainData]);

    // Calculate metrics
    const metrics = useMemo((): Metrics | null => {
        if (!chainData.length || !atmStrike) return null;

        let totalCeOI = 0;
        let totalPeOI = 0;
        let maxOI = 0;

        chainData.forEach(row => {
            const ceOI = row.ce?.oi || 0;
            const peOI = row.pe?.oi || 0;
            totalCeOI += ceOI;
            totalPeOI += peOI;
            maxOI = Math.max(maxOI, ceOI, peOI);
        });

        const atmRow = chainData.find(r => r.strike === atmStrike);
        const straddlePrem = atmRow ? (parseFloat(String(atmRow.ce?.ltp || 0)) + parseFloat(String(atmRow.pe?.ltp || 0))).toFixed(2) : '-';
        const pcr = totalCeOI > 0 ? (totalPeOI / totalCeOI).toFixed(2) : '-';

        const formatOI = (oi: number): string => formatCompactNumber(oi, 1);

        return {
            totalCeOI,
            totalPeOI,
            totalCeOIFormatted: formatOI(totalCeOI),
            totalPeOIFormatted: formatOI(totalPeOI),
            maxOI,
            straddlePrem,
            pcr
        };
    }, [chainData, atmStrike]);

    // Calculate ATM IV
    const atmIV = useMemo((): string | null => {
        if (!atmStrike || !chainData.length || Object.keys(greeksData).length === 0) return null;
        const atmRow = chainData.find(r => r.strike === atmStrike);
        if (!atmRow) return null;
        const ceIV = greeksData[atmRow.ce?.symbol || '']?.iv;
        const peIV = greeksData[atmRow.pe?.symbol || '']?.iv;
        if (ceIV && peIV) return ((ceIV + peIV) / 2).toFixed(1);
        if (ceIV) return ceIV.toFixed(1);
        if (peIV) return peIV.toFixed(1);
        return null;
    }, [greeksData, atmStrike, chainData]);

    // Net premium
    const netPremium = useMemo(() => calculateNetPremium(legs), [legs]);

    // Get expiry label type
    const getExpiryLabel = (expiryStr: string, index: number): string => {
        const dte = getDaysToExpiry(expiryStr);
        if (index === 0) return 'CW';
        if (index === 1) return 'NW';
        if (dte <= 7) return 'W' + (index + 1);
        if (dte <= 35) return 'CM';
        return 'NM';
    };

    // Format expiry for tab
    const formatExpiryTab = (expiryStr: string, index: number): ExpiryTabInfo => {
        const date = parseExpiryDate(expiryStr);
        if (!date) return { display: expiryStr, dte: 0, label: '' };

        const day = date.getDate();
        const month = date.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
        const year = date.getFullYear().toString().slice(-2);
        const dte = getDaysToExpiry(expiryStr);
        const label = getExpiryLabel(expiryStr, index);

        return { display: `${day} ${month} '${year}`, dte, label };
    };

    // Format ATM offset
    const formatStrikeOffset = (strike: number): string => {
        if (!atmStrike) return '';
        const diff = strike - atmStrike;
        if (diff === 0) return '(ATM)';
        return diff > 0 ? `(ATM + ${diff})` : `(ATM - ${Math.abs(diff)})`;
    };

    // Visible expiries
    const visibleExpiries = useMemo((): string[] => {
        const maxVisible = 5;
        return availableExpiries.slice(expiryScrollIndex, expiryScrollIndex + maxVisible);
    }, [availableExpiries, expiryScrollIndex]);

    const canScrollLeft = expiryScrollIndex > 0;
    const canScrollRight = expiryScrollIndex + 5 < availableExpiries.length;

    // Handle template selection
    const handleTemplateSelect = useCallback((templateKey: string): void => {
        setSelectedTemplate(templateKey);

        if (templateKey === 'custom') {
            return;
        }

        if (atmStrike && chainData.length > 0) {
            const newLegs = applyTemplate(templateKey, atmStrike, strikeGap, chainData) as Leg[] | null;
            if (newLegs) {
                setLegs(newLegs);
            }
        }
    }, [atmStrike, strikeGap, chainData]);

    // Handle option click
    const handleOptionClick = useCallback((strike: number, type: OptionType, optionData: OptionData): void => {
        if (selectedTemplate !== 'custom') {
            const newLegs = applyTemplate(selectedTemplate, strike, strikeGap, chainData) as Leg[] | null;
            if (newLegs) {
                setLegs(newLegs);
            }
            return;
        }

        if (legs.length >= 4) {
            console.warn('Maximum 4 legs allowed');
            return;
        }

        const existingLeg = legs.find(l => l.symbol === optionData.symbol);
        if (existingLeg) {
            setLegs(legs.filter(l => l.symbol !== optionData.symbol));
            return;
        }

        const newLeg: Leg = {
            id: generateLegId(),
            type,
            strike,
            symbol: optionData.symbol || '',
            direction: 'buy',
            quantity: 1,
            ltp: optionData.ltp || 0,
        };

        setLegs([...legs, newLeg]);
    }, [selectedTemplate, legs, strikeGap, chainData]);

    // Toggle leg direction
    const toggleLegDirection = useCallback((legId: string): void => {
        setLegs(legs.map(leg =>
            leg.id === legId
                ? { ...leg, direction: leg.direction === 'buy' ? 'sell' : 'buy' }
                : leg
        ));
    }, [legs]);

    // Remove leg
    const removeLeg = useCallback((legId: string): void => {
        setLegs(legs.filter(leg => leg.id !== legId));
    }, [legs]);

    // Get leg for option
    const getLegForOption = useCallback((symbol: string | undefined): Leg | undefined => {
        if (!symbol) return undefined;
        return legs.find(leg => leg.symbol === symbol);
    }, [legs]);

    // Handle create
    const handleCreate = useCallback((): void => {
        const validation = validateStrategy(legs) as { valid: boolean; error?: string };
        if (!validation.valid) {
            logger.error('Invalid strategy:', validation.error);
            return;
        }

        const config: StrategyConfig = {
            strategyType: selectedTemplate,
            underlying: underlying.symbol,
            exchange: underlying.exchange,
            expiry: selectedExpiry,
            legs: legs,
            displayName: formatStrategyName({
                strategyType: selectedTemplate,
                underlying: underlying.symbol,
                legs,
                expiry: selectedExpiry
            }) as string
        };

        onSelect(config);
        onClose();
    }, [legs, selectedTemplate, underlying, selectedExpiry, onSelect, onClose]);

    const formatNumber = (num: number | undefined): string => {
        if (!num && num !== 0) return '-';
        return formatCurrency(num, { showSymbol: false, decimals: 0 });
    };

    const formatLTP = (ltp: number | undefined): string => {
        if (!ltp && ltp !== 0) return '-';
        return ltp.toFixed(1);
    };

    const formatOI = (oi: number | undefined): string => {
        if (!oi && oi !== 0) return '-';
        return formatCompactNumber(oi, 1);
    };

    if (!isOpen) return null;

    const templateKeys = ['straddle', 'strangle', 'iron-condor', 'butterfly', 'bull-call-spread', 'bear-put-spread', 'custom'];

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <TrendingUp size={18} />
                        <h3>Option Strategy</h3>
                        <select
                            className={styles.underlyingSelect}
                            value={underlying.symbol}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                const found = (UNDERLYINGS as Underlying[]).find(u => u.symbol === e.target.value);
                                if (found) {
                                    setUnderlying(found);
                                    setSelectedExpiry(null);
                                    setOptionChain(null);
                                    setLegs([]);
                                }
                            }}
                        >
                            {(UNDERLYINGS as Underlying[]).map(u => (
                                <option key={u.symbol} value={u.symbol}>{u.symbol}</option>
                            ))}
                        </select>
                    </div>

                    {/* Add-ons Dropdown */}
                    <div className={styles.addOnsWrapper} ref={addOnsRef}>
                        <button
                            className={classNames(styles.addOnsBtn, { [styles.active]: addOnsOpen })}
                            onClick={() => setAddOnsOpen(!addOnsOpen)}
                        >
                            <Settings2 size={14} />
                            <span>Add ons</span>
                            <ChevronDown size={14} className={addOnsOpen ? styles.rotated : ''} />
                        </button>
                        {addOnsOpen && (
                            <div className={styles.addOnsMenu}>
                                <label className={styles.addOnsItem}>
                                    <input type="checkbox" checked={showDelta} onChange={(e) => setShowDelta(e.target.checked)} />
                                    <span>Delta</span>
                                </label>
                                <label className={styles.addOnsItem}>
                                    <input type="checkbox" checked={showIV} onChange={(e) => setShowIV(e.target.checked)} />
                                    <span>IV</span>
                                </label>
                                <label className={styles.addOnsItem}>
                                    <input type="checkbox" checked={showOI} onChange={(e) => setShowOI(e.target.checked)} />
                                    <span>OI</span>
                                </label>
                                <label className={styles.addOnsItem}>
                                    <input type="checkbox" checked={showOIBars} onChange={(e) => setShowOIBars(e.target.checked)} />
                                    <span>OI Bars</span>
                                </label>
                                <label className={styles.addOnsItem}>
                                    <input type="checkbox" checked={showPremium} onChange={(e) => setShowPremium(e.target.checked)} />
                                    <span>Premium</span>
                                </label>
                                <div className={styles.addOnsDivider} />
                                <div className={styles.strikeCountItem}>
                                    <span>Strikes:</span>
                                    <select
                                        value={strikeCount}
                                        onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                            const val = parseInt(e.target.value, 10);
                                            setStrikeCount(val);
                                            localStorage.setItem('optionChainStrikeCount', val.toString());
                                        }}
                                        className={styles.strikeSelect}
                                    >
                                        {STRIKE_COUNT_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>
                                                {opt === 50 ? 'All' : `±${opt}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {optionChain && (
                        <div className={styles.headerStats}>
                            <div className={styles.spotPrice}>
                                Spot: <strong>{formatNumber(optionChain.underlyingLTP)}</strong>
                            </div>
                            <div className={styles.aggregatedOI}>
                                {allExpiriesOI.isLoading ? (
                                    <span className={styles.oiLoading}>
                                        OI: Loading ({allExpiriesOI.loadedCount}/{allExpiriesOI.totalExpiries})...
                                    </span>
                                ) : allExpiriesOI.totalExpiries > 0 ? (
                                    <>
                                        <span className={styles.ceOIHeader}>
                                            CE: {formatOI(allExpiriesOI.totalCeOI)}
                                        </span>
                                        <span className={styles.peOIHeader}>
                                            PE: {formatOI(allExpiriesOI.totalPeOI)}
                                        </span>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    )}
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Expiry Tabs */}
                <div className={styles.expiryTabs}>
                    {canScrollLeft && (
                        <button className={styles.scrollBtn} onClick={() => setExpiryScrollIndex(prev => Math.max(0, prev - 1))}>
                            <ChevronLeft size={16} />
                        </button>
                    )}
                    <div className={styles.tabsContainer}>
                        {isLoadingExpiries ? (
                            <div className={styles.loadingTabs}>Loading expiries...</div>
                        ) : (
                            visibleExpiries.map((exp, idx) => {
                                const { display, dte, label } = formatExpiryTab(exp, expiryScrollIndex + idx);
                                return (
                                    <button
                                        key={exp}
                                        className={classNames(styles.expiryTab, { [styles.activeTab]: selectedExpiry === exp })}
                                        onClick={() => setSelectedExpiry(exp)}
                                    >
                                        <span className={styles.tabDate}>{display}</span>
                                        <span className={styles.tabDte}>({label}: {dte} DTE)</span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                    {canScrollRight && (
                        <button className={styles.scrollBtn} onClick={() => setExpiryScrollIndex(prev => prev + 1)}>
                            <ChevronRight size={16} />
                        </button>
                    )}
                    <button
                        className={styles.refreshBtn}
                        onClick={handleForceRefresh}
                        disabled={isLoading || !selectedExpiry}
                        title="Refresh (clears cache)"
                    >
                        <RefreshCw size={14} className={isLoading ? styles.spinning : ''} />
                    </button>
                </div>

                {/* Strategy Template Selector */}
                <div className={styles.strategySelector}>
                    {templateKeys.map(key => (
                        <button
                            key={key}
                            className={classNames(styles.strategyBtn, { [styles.active]: selectedTemplate === key })}
                            onClick={() => handleTemplateSelect(key)}
                            title={(STRATEGY_TEMPLATES as Record<string, StrategyTemplate>)[key]?.description}
                        >
                            {(STRATEGY_TEMPLATES as Record<string, StrategyTemplate>)[key]?.shortName || key}
                        </button>
                    ))}
                </div>

                {/* Leg Builder Panel */}
                <LegBuilder
                    legs={legs}
                    netPremium={netPremium}
                    selectedTemplate={selectedTemplate}
                    onToggleDirection={toggleLegDirection}
                    onRemoveLeg={removeLeg}
                />

                {/* Metrics Bar */}
                {metrics && (
                    <div className={styles.metricsBar}>
                        {atmIV && (
                            <div className={styles.metric}>
                                <span className={styles.metricLabel}>ATM IV</span>
                                <span className={styles.metricValue}>{atmIV}%</span>
                            </div>
                        )}
                        <div className={styles.metric}>
                            <span className={styles.metricLabel}>PCR</span>
                            <span className={styles.metricValue}>{metrics.pcr}</span>
                        </div>
                        <div className={styles.metric}>
                            <span className={styles.metricLabel}>Straddle</span>
                            <span className={styles.metricValue}>{metrics.straddlePrem}</span>
                        </div>
                        <div className={styles.oiSummary}>
                            <span className={styles.ceOI}>{metrics.totalCeOIFormatted}</span>
                            <span className={styles.oiLabel}>CE OI</span>
                            <div className={styles.oiDivider} />
                            <span className={styles.oiLabel}>PE OI</span>
                            <span className={styles.peOI}>{metrics.totalPeOIFormatted}</span>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className={styles.content}>
                    {isLoading ? (
                        <div className={styles.loadingState}>
                            <Loader2 size={24} className={styles.spinning} />
                            <p>Loading option chain...</p>
                        </div>
                    ) : error ? (
                        <div className={styles.errorState}>
                            <p>{error}</p>
                            <button onClick={handleForceRefresh}>Retry (Clear Cache)</button>
                        </div>
                    ) : chainData.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No options found for {underlying.symbol}</p>
                            <p className={styles.subText}>Select an expiry to load option chain</p>
                        </div>
                    ) : (
                        <div className={classNames(styles.strikeTable, {
                            [styles.hideOI]: !showOI,
                            [styles.hideOIBars]: !showOIBars,
                            [styles.hidePremium]: !showPremium
                        })}>
                            <div className={styles.tableHeader}>
                                {showOIBars && <div className={styles.colOIBar}></div>}
                                {showOI && <div className={styles.colOI}>CE OI</div>}
                                <div className={styles.colLTP}>{showDelta ? 'CE LTP (Δ)' : 'CE LTP'}</div>
                                {showIV && <div className={styles.colIV}>CE IV</div>}
                                <div className={styles.colStrike}>Strike</div>
                                {showPremium && <div className={styles.colPremium}>Prem</div>}
                                {showIV && <div className={styles.colIV}>PE IV</div>}
                                <div className={styles.colLTP}>{showDelta ? 'PE LTP (Δ)' : 'PE LTP'}</div>
                                {showOI && <div className={styles.colOI}>PE OI</div>}
                                {showOIBars && <div className={styles.colOIBar}></div>}
                            </div>
                            <div className={styles.tableBody}>
                                {chainData.map(row => {
                                    const isATM = row.strike === atmStrike;
                                    const isITM_CE = row.strike < atmStrike;
                                    const isITM_PE = row.strike > atmStrike;
                                    const ceOIPercent = metrics?.maxOI ? ((row.ce?.oi || 0) / metrics.maxOI) * 100 : 0;
                                    const peOIPercent = metrics?.maxOI ? ((row.pe?.oi || 0) / metrics.maxOI) * 100 : 0;

                                    const ceLeg = getLegForOption(row.ce?.symbol);
                                    const peLeg = getLegForOption(row.pe?.symbol);

                                    return (
                                        <div
                                            key={row.strike}
                                            className={classNames(styles.tableRow, {
                                                [styles.atmRow]: isATM,
                                                [styles.itmRowCE]: isITM_CE && !isATM,
                                                [styles.itmRowPE]: isITM_PE && !isATM
                                            })}
                                        >
                                            {showOIBars && (
                                                <div className={styles.colOIBar}>
                                                    <div className={styles.oiBarCE} style={{ width: `${ceOIPercent}%` }} />
                                                </div>
                                            )}

                                            {showOI && (
                                                <div className={classNames(styles.colOI, styles.ceCell)}>
                                                    {formatNumber(row.ce?.oi)}
                                                </div>
                                            )}

                                            <div
                                                className={classNames(styles.colLTP, styles.clickable, styles.ceCell, {
                                                    [styles.selected]: !!ceLeg,
                                                    [styles.buySelected]: ceLeg?.direction === 'buy',
                                                    [styles.sellSelected]: ceLeg?.direction === 'sell'
                                                })}
                                                onClick={() => row.ce && handleOptionClick(row.strike, 'CE', row.ce)}
                                            >
                                                {ceLeg && <span className={styles.legIndicator}>{ceLeg.direction === 'buy' ? 'B' : 'S'}</span>}
                                                <span>{formatLTP(row.ce?.ltp)}</span>
                                                {showDelta && greeksData[row.ce?.symbol || '']?.delta !== undefined && (
                                                    <span className={styles.delta}>({greeksData[row.ce!.symbol!].delta!.toFixed(2)})</span>
                                                )}
                                            </div>

                                            {showIV && (
                                                <div className={classNames(styles.colIV, styles.ceCell)}>
                                                    {greeksData[row.ce?.symbol || '']?.iv !== undefined ? `${greeksData[row.ce!.symbol!].iv!.toFixed(1)}%` : '-'}
                                                </div>
                                            )}

                                            <div className={styles.colStrike}>
                                                <span className={styles.strikeValue}>{row.strike}</span>
                                                <span className={styles.strikeOffset}>{formatStrikeOffset(row.strike)}</span>
                                            </div>

                                            {showPremium && (
                                                <div className={styles.colPremium}>
                                                    <span className={styles.premiumValue}>{row.straddlePremium}</span>
                                                </div>
                                            )}

                                            {showIV && (
                                                <div className={classNames(styles.colIV, styles.peCell)}>
                                                    {greeksData[row.pe?.symbol || '']?.iv !== undefined ? `${greeksData[row.pe!.symbol!].iv!.toFixed(1)}%` : '-'}
                                                </div>
                                            )}

                                            <div
                                                className={classNames(styles.colLTP, styles.clickable, styles.peCell, {
                                                    [styles.selected]: !!peLeg,
                                                    [styles.buySelected]: peLeg?.direction === 'buy',
                                                    [styles.sellSelected]: peLeg?.direction === 'sell'
                                                })}
                                                onClick={() => row.pe && handleOptionClick(row.strike, 'PE', row.pe)}
                                            >
                                                {showDelta && greeksData[row.pe?.symbol || '']?.delta !== undefined && (
                                                    <span className={styles.delta}>({greeksData[row.pe!.symbol!].delta!.toFixed(2)})</span>
                                                )}
                                                <span>{formatLTP(row.pe?.ltp)}</span>
                                                {peLeg && <span className={styles.legIndicator}>{peLeg.direction === 'buy' ? 'B' : 'S'}</span>}
                                            </div>

                                            {showOI && (
                                                <div className={classNames(styles.colOI, styles.peCell)}>
                                                    {formatNumber(row.pe?.oi)}
                                                </div>
                                            )}

                                            {showOIBars && (
                                                <div className={styles.colOIBar}>
                                                    <div className={styles.oiBarPE} style={{ width: `${peOIPercent}%` }} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <div className={styles.selection}>
                        {legs.length >= 2 ? (
                            <span>
                                <strong>{underlying.symbol}</strong>{' '}
                                {(STRATEGY_TEMPLATES as Record<string, StrategyTemplate>)[selectedTemplate]?.name || 'Custom'}{' '}
                                <span className={styles.premiumInfo}>
                                    | Net: {netPremium >= 0 ? `₹${netPremium.toFixed(2)}` : `-₹${Math.abs(netPremium).toFixed(2)}`}
                                </span>
                            </span>
                        ) : (
                            <span className={styles.hint}>
                                {selectedTemplate === 'custom'
                                    ? 'Click options to add at least 2 legs'
                                    : `Click on chain to place ${(STRATEGY_TEMPLATES as Record<string, StrategyTemplate>)[selectedTemplate]?.name || 'strategy'}`}
                            </span>
                        )}
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
                        <button
                            className={styles.createBtn}
                            onClick={handleCreate}
                            disabled={legs.length < 2}
                        >
                            Create Chart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OptionChainPicker;
