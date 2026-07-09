/**
 * useOptionChainGreeks Hook
 * Custom hook for fetching and managing option Greeks data
 * Handles batch API calls, retries, and caching
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { getMultiOptionGreeks } from '../../../services/openalgo';
import logger from '../../../utils/logger';

export interface GreeksResult {
    iv?: number;
    greeks?: {
        delta?: number;
        gamma?: number;
        theta?: number;
        vega?: number;
        [key: string]: number | undefined;
    };
}

export interface OptionChainRow {
    ce?: { symbol: string; [key: string]: any };
    pe?: { symbol: string; [key: string]: any };
    [key: string]: any;
}

export interface OptionChain {
    chain?: OptionChainRow[];
    [key: string]: any;
}

export interface Underlying {
    exchange: string;
    [key: string]: any;
}

export interface UseOptionChainGreeksParams {
    isOpen: boolean;
    optionChain?: OptionChain | null;
    underlying?: Underlying | null;
    viewMode: string;
    selectedExpiry?: string;
}

export interface UseOptionChainGreeksReturn {
    greeksData: Map<string, GreeksResult>;
    greeksLoading: boolean;
    fetchGreeks: () => Promise<void>;
    retryFailedGreeks: () => Promise<void>;
}

const MAX_GREEKS_RETRY_COUNT = 3;

export function useOptionChainGreeks({
    isOpen,
    optionChain,
    underlying,
    viewMode,
    selectedExpiry,
}: UseOptionChainGreeksParams): UseOptionChainGreeksReturn {
    const [greeksData, setGreeksData] = useState<Map<string, GreeksResult>>(new Map());
    const [greeksLoading, setGreeksLoading] = useState<boolean>(false);

    // Request tracking refs
    const greeksRequestIdRef = useRef<number>(0);
    const failedGreeksSymbolsRef = useRef<Set<string>>(new Set());
    const greeksRetryCountRef = useRef<Map<string, number>>(new Map());

    // Helper to increment retry count and check if should block
    const markSymbolFailed = useCallback((symbol: string): void => {
        const currentCount = greeksRetryCountRef.current.get(symbol) || 0;
        const newCount = currentCount + 1;
        greeksRetryCountRef.current.set(symbol, newCount);

        if (newCount >= MAX_GREEKS_RETRY_COUNT) {
            failedGreeksSymbolsRef.current.add(symbol);
            logger.debug(`[OptionChain] Symbol ${symbol} permanently blocked after ${newCount} failed attempts`);
        } else {
            logger.debug(`[OptionChain] Symbol ${symbol} failed attempt ${newCount}/${MAX_GREEKS_RETRY_COUNT}`);
        }
    }, []);

    // Batch fetch Greeks
    const fetchGreeks = useCallback(async (): Promise<void> => {
        if (!optionChain?.chain?.length) return;

        const requestId = ++greeksRequestIdRef.current;

        // Collect symbols to fetch
        const symbolsToFetch: Array<{ symbol: string; exchange: string }> = [];
        optionChain.chain.forEach(row => {
            if (row.ce?.symbol && !greeksData.has(row.ce.symbol) && !failedGreeksSymbolsRef.current.has(row.ce.symbol)) {
                symbolsToFetch.push({ symbol: row.ce.symbol, exchange: underlying?.exchange || 'NSE' });
            }
            if (row.pe?.symbol && !greeksData.has(row.pe.symbol) && !failedGreeksSymbolsRef.current.has(row.pe.symbol)) {
                symbolsToFetch.push({ symbol: row.pe.symbol, exchange: underlying?.exchange || 'NSE' });
            }
        });

        if (symbolsToFetch.length === 0) return;

        logger.debug('[OptionChain] Fetching Greeks for', symbolsToFetch.length, 'options, requestId:', requestId);
        setGreeksLoading(true);

        try {
            const response = await getMultiOptionGreeks(symbolsToFetch);

            if (requestId !== greeksRequestIdRef.current) {
                logger.debug('[OptionChain] Discarding stale Greeks response');
                return;
            }

            if (response?.data?.length > 0) {
                const newGreeksData = new Map(greeksData);
                const symbolsInResponse = new Set<string>();

                response.data.forEach((item: any) => {
                    if (item.status === 'success' && item.symbol) {
                        newGreeksData.set(item.symbol, {
                            iv: item.implied_volatility,
                            greeks: item.greeks
                        });
                        symbolsInResponse.add(item.symbol);
                        greeksRetryCountRef.current.delete(item.symbol);
                    } else if (item.symbol) {
                        markSymbolFailed(item.symbol);
                        symbolsInResponse.add(item.symbol);
                    }
                });

                // Mark symbols not in response as failed
                symbolsToFetch.forEach(s => {
                    if (!symbolsInResponse.has(s.symbol) && !newGreeksData.has(s.symbol)) {
                        markSymbolFailed(s.symbol);
                    }
                });

                setGreeksData(newGreeksData);
                logger.debug('[OptionChain] Greeks loaded:', response.summary);
            } else {
                symbolsToFetch.forEach(s => markSymbolFailed(s.symbol));
            }
        } catch (error) {
            logger.error('[OptionChain] Greeks API error:', error);
            symbolsToFetch.forEach(s => markSymbolFailed(s.symbol));
        } finally {
            if (requestId === greeksRequestIdRef.current) {
                setGreeksLoading(false);
            }
        }
    }, [optionChain?.chain, underlying?.exchange, greeksData, markSymbolFailed]);

    // Retry failed Greeks
    const retryFailedGreeks = useCallback(async (): Promise<void> => {
        if (!optionChain?.chain?.length) return;

        const missingSymbols: Array<{ symbol: string; exchange: string }> = [];
        optionChain.chain.forEach(row => {
            if (row.ce?.symbol && !greeksData.has(row.ce.symbol) && !failedGreeksSymbolsRef.current.has(row.ce.symbol)) {
                missingSymbols.push({ symbol: row.ce.symbol, exchange: underlying?.exchange || 'NSE' });
            }
            if (row.pe?.symbol && !greeksData.has(row.pe.symbol) && !failedGreeksSymbolsRef.current.has(row.pe.symbol)) {
                missingSymbols.push({ symbol: row.pe.symbol, exchange: underlying?.exchange || 'NSE' });
            }
        });

        if (missingSymbols.length === 0) return;

        logger.debug('[OptionChain] Retrying', missingSymbols.length, 'missing Greeks...');
        setGreeksLoading(true);

        await new Promise(r => setTimeout(r, 2000));

        const requestId = greeksRequestIdRef.current;
        try {
            const response = await getMultiOptionGreeks(missingSymbols);

            if (requestId !== greeksRequestIdRef.current) return;

            if (response?.data?.length > 0) {
                const newGreeksData = new Map(greeksData);
                const symbolsInResponse = new Set<string>();

                response.data.forEach((item: any) => {
                    if (item.status === 'success' && item.symbol) {
                        newGreeksData.set(item.symbol, {
                            iv: item.implied_volatility,
                            greeks: item.greeks
                        });
                        symbolsInResponse.add(item.symbol);
                        greeksRetryCountRef.current.delete(item.symbol);
                    } else if (item.symbol) {
                        markSymbolFailed(item.symbol);
                        symbolsInResponse.add(item.symbol);
                    }
                });

                missingSymbols.forEach(s => {
                    if (!symbolsInResponse.has(s.symbol) && !newGreeksData.has(s.symbol)) {
                        markSymbolFailed(s.symbol);
                    }
                });

                setGreeksData(newGreeksData);
            } else {
                missingSymbols.forEach(s => markSymbolFailed(s.symbol));
            }
        } catch (error) {
            logger.error('[OptionChain] Retry failed:', error);
            missingSymbols.forEach(s => markSymbolFailed(s.symbol));
        } finally {
            if (requestId === greeksRequestIdRef.current) {
                setGreeksLoading(false);
            }
        }
    }, [optionChain?.chain, underlying?.exchange, greeksData, markSymbolFailed]);

    // Trigger Greeks fetch when switching to greeks view
    useEffect(() => {
        if (isOpen && viewMode === 'greeks' && optionChain?.chain?.length && optionChain.chain.length > 0) {
            fetchGreeks();
        }
    }, [isOpen, viewMode, optionChain?.chain, fetchGreeks]);

    // Auto-retry missing Greeks
    useEffect(() => {
        if (!isOpen || viewMode !== 'greeks' || greeksLoading || greeksData.size === 0) return;

        const hasMissing = optionChain?.chain?.some(row =>
            (row.ce?.symbol && !greeksData.has(row.ce.symbol) && !failedGreeksSymbolsRef.current.has(row.ce.symbol)) ||
            (row.pe?.symbol && !greeksData.has(row.pe.symbol) && !failedGreeksSymbolsRef.current.has(row.pe.symbol))
        );

        if (hasMissing) {
            const timeoutId = setTimeout(retryFailedGreeks, 500);
            return () => clearTimeout(timeoutId);
        }
    }, [isOpen, viewMode, greeksLoading, greeksData.size, optionChain?.chain, retryFailedGreeks]);

    // Clear Greeks cache on modal close
    useEffect(() => {
        if (!isOpen) {
            greeksRequestIdRef.current++;
            setGreeksData(new Map());
            failedGreeksSymbolsRef.current = new Set();
            greeksRetryCountRef.current = new Map();
        }
    }, [isOpen]);

    // Clear Greeks cache on expiry change
    useEffect(() => {
        greeksRequestIdRef.current++;
        setGreeksData(new Map());
        failedGreeksSymbolsRef.current = new Set();
        greeksRetryCountRef.current = new Map();
    }, [selectedExpiry]);

    return {
        greeksData,
        greeksLoading,
        fetchGreeks,
        retryFailedGreeks,
    };
}

export default useOptionChainGreeks;
