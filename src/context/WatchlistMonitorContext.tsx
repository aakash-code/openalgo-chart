/**
 * WatchlistMonitorContext - Background scanning engine for watchlist stocks
 * Monitors all symbols in the watchlist and triggers alerts based on custom logic
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useWatchlist } from './WatchlistContext';
import { useAlert } from './AlertContext';
import { getKlines, subscribeToMultiTicker } from '../services/openalgo';
import { calculateVolumetricCandlePair } from '../utils/indicators/volumetricCandlePair';
import { calculatePatternRecognition } from '../utils/indicators/patternRecognition';
import { OHLCData } from '../utils/indicators/types';
import { playAlertSound } from '../utils/soundManager';
import logger from '../utils/logger';


// ==================== TYPES ====================

interface MonitorState {
    klines: OHLCData[];
    lastSignalTime: number;
    lastPatternTime: number;
    lastCumulativeVolume?: number;
}

interface WatchlistMonitorContextValue {
    isScanning: boolean;
    scanningSymbols: string[];
}

const WatchlistMonitorContext = createContext<WatchlistMonitorContextValue | null>(null);

export const WatchlistMonitorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { watchlistSymbols } = useWatchlist();
    const { addAlert, addGlobalPopup, addAlertLog } = useAlert();
    
    const [isScanning, setIsScanning] = useState(false);
    const [scanningSymbols, setScanningSymbols] = useState<string[]>([]);
    
    // Map of symbolKey -> MonitorState
    const monitorDataRef = useRef<Map<string, MonitorState>>(new Map());
    const processedAlertsRef = useRef<Set<string>>(new Set()); // To prevent duplicate alerts for same signal
    
    // Default scanning interval (3 minutes to match user preference)
    const INTERVAL = '3'; 

    /**
     * Run Signal Detection Logic
     */
    const detectSignals = useCallback((symbol: string, exchange: string, data: OHLCData[]) => {
        if (data.length < 10) return;

        const symbolKey = `${symbol}:${exchange}`;
        const lastCandle = data[data.length - 1];
        
        // 1. Run Volumetric Breakout Logic - TEST MODE (Filters Disabled)
        const volResult = calculateVolumetricCandlePair(data, {
            showBreakouts: true,
            useTrendFilter: false, 
            useDeltaFilter: false,
            emaPeriod1: 20,
            emaPeriod2: 50,
            emaPeriod3: 200,
            emaPeriod4: 200
        });

        // PROXIMITY LOGGING - Find stocks near breakout to verify alerts
        if (volResult.allZones.length > 0) {
            const lastZone = volResult.allZones[volResult.allZones.length - 1];
            const distHigh = ((lastCandle.close - lastZone.high) / lastZone.high) * 100;
            const distLow = ((lastCandle.close - lastZone.low) / lastZone.low) * 100;

            // Log if within 0.1% of zone high or low
            if (Math.abs(distHigh) < 0.1 || Math.abs(distLow) < 0.1) {
                logger.info(`[Scanner-Proximity] ${symbol} is NEAR ZONE! Price: ${lastCandle.close}, High: ${lastZone.high.toFixed(2)} (${distHigh.toFixed(2)}%), Low: ${lastZone.low.toFixed(2)} (${distLow.toFixed(2)}%)`);
            }
        }

        if (volResult.markers.length > 0) {
            // Check last few markers instead of just the absolute latest
            const recentMarkers = volResult.markers.slice(-5);
            
            for (const marker of recentMarkers) {
                const markerIndex = data.findIndex(d => d.time === marker.time);
                const isRecent = markerIndex !== -1 && data.length - markerIndex <= 5;

                if (isRecent) {
                    const alertKey = `${symbolKey}:vol:${marker.text}:${marker.time}`;
                    
                    if (!processedAlertsRef.current.has(alertKey)) {
                        processedAlertsRef.current.add(alertKey);
                        
                        const isUpside = marker.text.toLowerCase().includes('long') || marker.text.toLowerCase().includes('breakout');
                        const signalEmoji = isUpside ? '🚀' : '🔻';
                        const signalType = isUpside ? 'UPSIDE LONG' : 'DOWNSIDE SHORT';
                        const message = `${signalEmoji} VCP ${signalType}: ${symbol} Breakout detected!`;
                        
                        addAlert({
                            id: `alert_${Date.now()}`,
                            symbol,
                            status: 'Active',
                            message,
                            triggered: true,
                            triggeredAt: Date.now()
                        });

                        addAlertLog({
                            symbol,
                            message,
                            type: 'trigger'
                        });

                        addGlobalPopup({
                            symbol,
                            message,
                            price: lastCandle.close
                        });

                        playAlertSound(isUpside ? 'success' : 'warning');
                        logger.info(`[Scanner] SIGNAL DETECTED for ${symbol}: ${message}`);
                    }
                }
            }
        } else {
            // Log heartbeat every 50 stocks to show it's working
            if (Math.random() < 0.02) {
                logger.debug(`[Scanner] Monitoring ${symbol}... No breakout yet. (Price: ${lastCandle.close})`);
            }
        }



        // 2. Run Pattern Recognition (HH/LL, Hammers)
        const patternResult = calculatePatternRecognition(data, {
            showCandlestickPatterns: true,
            showMarketStructure: true,
            lookback: 5
        });

        if (patternResult.markers.length > 0) {
            const recentPatterns = patternResult.markers.slice(-3);
            
            for (const pattern of recentPatterns) {
                const markerIndex = data.findIndex(d => d.time === pattern.time);
                const isRecent = markerIndex !== -1 && data.length - markerIndex <= 3;

                if (isRecent) {
                    const alertKey = `${symbolKey}:pattern:${pattern.text}:${pattern.time}`;
                    
                    if (!processedAlertsRef.current.has(alertKey)) {
                        processedAlertsRef.current.add(alertKey);
                        
                        const message = `${symbol}: ${pattern.text} pattern found.`;
                        
                        addAlertLog({
                            symbol,
                            message,
                            type: 'trigger'
                        });
                        
                        logger.debug(`[Scanner] PATTERN: ${message}`);
                    }
                }
            }
        }
    }, [addAlert, addAlertLog, addGlobalPopup]);

    /**
     * Update internal data and re-run logic on ticker update
     */
    const handleTickerUpdate = useCallback((update: any) => {
        const symbolKey = `${update.symbol}:${update.exchange}`;
        const state = monitorDataRef.current.get(symbolKey);
        
        if (!state || state.klines.length === 0) return;

        const klines = [...state.klines];
        const lastCandle = klines[klines.length - 1];
        
        // CRITICAL FIX: Add IST offset (19800s) to match historical candle timestamps
        const IST_OFFSET = 19800;
        const now = Math.floor(Date.now() / 1000) + IST_OFFSET;
        const intervalSeconds = parseInt(INTERVAL) * 60;
        const currentCandleTime = Math.floor(now / intervalSeconds) * intervalSeconds;
        
        // Handle New Candle Generation
        if (currentCandleTime > lastCandle.time) {
            logger.debug(`[Scanner] New ${INTERVAL}m candle for ${symbolKey} at ${new Date(currentCandleTime * 1000).toLocaleTimeString()}`);
            
            // Push new candle
            const newCandle: OHLCData = {
                time: currentCandleTime,
                open: update.last,
                high: update.last,
                low: update.last,
                close: update.last,
                volume: 0 
            };
            klines.push(newCandle);
            if (klines.length > 250) klines.shift();
            
            state.lastCumulativeVolume = update.volume;
        }

        // Calculate per-candle volume delta
        if (state.lastCumulativeVolume === undefined) {
            state.lastCumulativeVolume = update.volume;
        }
        
        const volumeDelta = Math.max(0, update.volume - state.lastCumulativeVolume);
        state.lastCumulativeVolume = update.volume;

        // Update last candle
        const targetCandle = klines[klines.length - 1];
        const updatedLastCandle = {
            ...targetCandle,
            close: update.last,
            high: Math.max(targetCandle.high, update.last),
            low: Math.min(targetCandle.low, update.last),
            volume: (targetCandle.volume || 0) + volumeDelta
        };
        
        klines[klines.length - 1] = updatedLastCandle;
        state.klines = klines;
        
        // Run detection
        detectSignals(update.symbol, update.exchange, klines);
    }, [detectSignals]);


    /**
     * Initial Load and Sync for Watchlist
     */
    useEffect(() => {
        if (!watchlistSymbols || watchlistSymbols.length === 0) {
            setIsScanning(false);
            setScanningSymbols([]);
            return;
        }

        const validSymbols = (watchlistSymbols || []).map(s => {
            if (typeof s === 'string') return { symbol: s, exchange: 'NSE' };
            return s;
        }).filter(s => s && s.symbol && !s.symbol.startsWith('###'));

        const currentSymbols = validSymbols.map(s => `${s.symbol}:${s.exchange || 'NSE'}`);
        
        logger.info(`[Scanner] Monitoring started for ${currentSymbols.length} symbols: ${currentSymbols.join(', ')}`);
        
        setScanningSymbols(currentSymbols);
        setIsScanning(true);

        // 1. Fetch historical data for all new symbols with a small delay to avoid rate limiting
        const initSymbols = async () => {
            for (const symObj of validSymbols as any) {
                const symbolKey = `${symObj.symbol}:${symObj.exchange || 'NSE'}`;
                if (!monitorDataRef.current.has(symbolKey)) {
                    try {
                        // Small delay between symbols
                        await new Promise(resolve => setTimeout(resolve, 200));
                        
                        const data = await getKlines(symObj.symbol, symObj.exchange || 'NSE', INTERVAL, 200);
                        if (data && data.length > 0) {
                            monitorDataRef.current.set(symbolKey, {
                                klines: data,
                                lastSignalTime: 0,
                                lastPatternTime: 0
                            });
                            logger.info(`[Scanner] Initialized ${symbolKey} with ${data.length} candles`);
                            
                            addAlertLog({
                                symbol: symObj.symbol,
                                message: `Real-time monitoring started for ${symObj.symbol}`,
                                type: 'create'
                            });
                            
                            detectSignals(symObj.symbol, symObj.exchange || 'NSE', data);
                        }
                    } catch (e) {
                        logger.error(`[Scanner] Failed to fetch data for ${symbolKey}`, e);
                    }
                }
            }
        };

        initSymbols();


        // 2. Subscribe to real-time updates for the whole watchlist
        const subscription = subscribeToMultiTicker(validSymbols as any, handleTickerUpdate);

        return () => {
            if (subscription) subscription.close();
        };
    }, [watchlistSymbols, handleTickerUpdate, detectSignals]);

    return (
        <WatchlistMonitorContext.Provider value={{ isScanning, scanningSymbols }}>
            {children}
        </WatchlistMonitorContext.Provider>
    );
};

export const useWatchlistMonitor = () => {
    const context = useContext(WatchlistMonitorContext);
    if (!context) {
        throw new Error('useWatchlistMonitor must be used within a WatchlistMonitorProvider');
    }
    return context;
};
