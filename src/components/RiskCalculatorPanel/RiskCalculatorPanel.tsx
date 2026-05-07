import React, { useState, useEffect } from 'react';
import type { FC, MouseEvent as ReactMouseEvent } from 'react';
import { X, Minimize2, Maximize2, Edit2, Plus } from 'lucide-react';
import { validateRiskParamsDetailed, riskCalculatorStateService } from '../../utils/indicators';
import type { TradeSide, TradeSegment, Exchange } from '../../utils/indicators/riskCalculator';
import styles from './RiskCalculatorPanel.module.css';

interface FormValues {
    capital: number;
    riskPercent: number;
    side: TradeSide;
    entryPrice: number;
    stopLossPrice: number;
    targetPrice: number;
    riskRewardRatio: number;
    targets: { price: number; exitPercent: number }[];
    leverage: number;
    segment: TradeSegment;
    exchange: Exchange;
}

interface Params {
    capital?: number;
    riskPercent?: number;
    side?: TradeSide;
    entryPrice?: number;
    stopLossPrice?: number;
    targetPrice?: number;
    riskRewardRatio?: number;
    showTarget?: boolean;
    targets?: { price: number; exitPercent: number }[];
    leverage?: number;
    segment?: TradeSegment;
    exchange?: Exchange;
}

interface Position {
    x: number;
    y: number;
}

interface SettingsUpdate {
    capital: number;
    riskPercent: number;
    side: TradeSide;
    entryPrice: number;
    stopLossPrice: number;
    showTarget: boolean;
    targetPrice?: number;
    riskRewardRatio?: number;
    targets?: { price: number; exitPercent: number }[];
    leverage: number;
    segment: TradeSegment;
    exchange: Exchange;
}

export interface RiskCalculatorPanelProps {
    results: any | null;
    params: Params;
    onClose: () => void;
    onUpdateSettings?: (updates: SettingsUpdate) => void;
    onPlacementModeToggle?: (isActive: boolean) => void;
    placementMode?: 'entry' | 'stopLoss' | 'target' | null;
    ltp?: number;
    draggable?: boolean;
}

const RiskCalculatorPanel: FC<RiskCalculatorPanelProps> = ({
    results,
    params,
    onClose,
    onUpdateSettings,
    onPlacementModeToggle,
    placementMode,
    ltp = 0,
    draggable = false
}) => {
    const [editMode, setEditMode] = useState(!results || !!results.error);
    const [minimized, setMinimized] = useState(false);
    const [position, setPosition] = useState<Position>({ x: 20, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

    const [formValues, setFormValues] = useState<FormValues>(() => {
        const globals = riskCalculatorStateService.loadGlobalSettings();
        const segment = params?.segment || globals?.segment || 'Equity Intraday';
        let defaultLeverage = globals?.leverage || 1;
        if (segment === 'Equity Intraday' && !globals?.leverage) defaultLeverage = 5;
        
        return {
            capital: params?.capital || globals?.capital || 100000,
            riskPercent: params?.riskPercent || globals?.riskPercent || 2,
            side: params?.side || globals?.side || 'BUY',
            entryPrice: params?.entryPrice || 0,
            stopLossPrice: params?.stopLossPrice || 0,
            targetPrice: params?.targetPrice || 0,
            riskRewardRatio: params?.riskRewardRatio || 2,
            targets: params?.targets || [],
            leverage: params?.leverage || defaultLeverage,
            segment: segment,
            exchange: params?.exchange || globals?.exchange || 'NSE',
        };
    });

    // Handle form changes and notify parent
    const updateFormField = (updates: Partial<FormValues>) => {
        const newValues = { ...formValues, ...updates };
        setFormValues(newValues);
        
        // Notify parent immediately for global settings to keep everything in sync
        if (onUpdateSettings) {
            onUpdateSettings({
                ...newValues,
                showTarget: true
            });
        }
    };

    // Save global settings when relevant fields change
    useEffect(() => {
        riskCalculatorStateService.saveGlobalSettings({
            capital: formValues.capital,
            riskPercent: formValues.riskPercent,
            leverage: formValues.leverage,
            segment: formValues.segment,
            exchange: formValues.exchange
        });
    }, [formValues.capital, formValues.riskPercent, formValues.leverage, formValues.segment, formValues.exchange]);

    useEffect(() => {
        if (results && results.success && !results.error && !placementMode) {
            setEditMode(false);
        }
    }, [results?.success, results?.error, placementMode]);

    // Update form values from params ONLY if params actually changed from external source (like dragging on chart)
    // and ignore if we are currently in edit mode to prevent overwriting user typing
    useEffect(() => {
        if (params && !editMode) {
            setFormValues(prev => ({
                ...prev,
                ...params,
                entryPrice: params.entryPrice || prev.entryPrice,
                stopLossPrice: params.stopLossPrice || prev.stopLossPrice,
                targetPrice: params.targetPrice || prev.targetPrice
            }));
        }
    }, [params, editMode]);

    const handlePlacementClick = () => {
        if (onPlacementModeToggle) {
            onPlacementModeToggle(placementMode === null);
        }
    };

    const handleCalculate = () => {
        if (onUpdateSettings) {
            onUpdateSettings({
                ...formValues,
                showTarget: true
            });
            setEditMode(false);
        }
    };

    const toggleMinimized = (e: ReactMouseEvent) => {
        e.stopPropagation();
        setMinimized(!minimized);
    };

    const handleMouseDown = (e: ReactMouseEvent) => {
        if (!draggable) return;
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragOffset.x,
                    y: e.clientY - dragOffset.y
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    if (minimized) {
        return (
            <div 
                className={styles.panelMinimized}
                style={{ left: position.x, top: position.y }}
                onMouseDown={handleMouseDown}
            >
                <div className={styles.minQty}>QTY: {results?.formatted?.quantity || '0'}</div>
                {results?.formatted?.rrRatio && (
                    <div className={styles.minRR}>RR {results.formatted.rrRatio}</div>
                )}
                <div className={styles.headerButtons}>
                    <button onClick={toggleMinimized} title="Restore"><Maximize2 size={14} /></button>
                    <button onClick={onClose} title="Close"><X size={14} /></button>
                </div>
            </div>
        );
    }

    return (
        <div 
            className={styles.panel}
            style={{ left: position.x, top: position.y }}
        >
            <div className={styles.header} onMouseDown={handleMouseDown}>
                <span>Risk Calculator</span>
                <div className={styles.headerButtons}>
                    <button className={styles.iconButton} onClick={() => setEditMode(!editMode)} title={editMode ? "View Results" : "Edit Parameters"}>
                        {editMode ? <Maximize2 size={14} /> : <Edit2 size={14} />}
                    </button>
                    <button className={styles.iconButton} onClick={toggleMinimized} title="Minimize"><Minimize2 size={14} /></button>
                    <button className={styles.closeButton} onClick={onClose} title="Close"><X size={14} /></button>
                </div>
            </div>

            <div className={styles.content}>
                {!editMode && results && results.success ? (
                    <>
                        <div className={styles.mainResult}>
                            <span className={styles.quantityLabel}>Recommended Quantity</span>
                            <div className={styles.quantityValue}>{results.formatted.quantity}</div>
                            <div style={{ marginTop: 8 }}>
                                <span className={`${styles.badge} ${results.side === 'BUY' ? styles.buyBadge : styles.sellBadge}`}>
                                    {results.side}
                                </span>
                            </div>
                        </div>

                        <div className={styles.section}>
                            <div className={styles.row}>
                                <span className={styles.label}>Capital Used</span>
                                <span className={styles.value}>{results.formatted.capital} ({results.formatted.leverage})</span>
                            </div>
                            <div className={styles.row}>
                                <span className={styles.label}>Risk Amount</span>
                                <span className={`${styles.value} ${styles.risk}`}>{results.formatted.riskAmount}</span>
                            </div>
                            <div className={styles.row}>
                                <span className={styles.label}>Position Value</span>
                                <span className={styles.value}>{results.formatted.positionValue}</span>
                            </div>
                            <div className={styles.row}>
                                <span className={styles.label}>Net Profit</span>
                                <span className={`${styles.value} ${styles.reward}`}>{results.formatted.netProfit}</span>
                            </div>
                            <div className={styles.row}>
                                <span className={styles.label}>R:R Ratio</span>
                                <span className={`${styles.value} ${styles.rrRatio}`}>{results.formatted.rrRatio}</span>
                            </div>
                            {results.initialMargin > 0 && formValues.leverage > 1 && (
                                <div className={styles.row}>
                                    <span className={styles.label}>Margin Required</span>
                                    <span className={`${styles.value} ${results.exceedsBuyingPower ? styles.risk : ''}`}>
                                        {results.formatted.initialMargin}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className={styles.section}>
                            <div className={styles.row}>
                                <span className={styles.label}>Entry</span>
                                <span className={`${styles.value} ${styles.entry}`}>{results.formatted.entryPrice}</span>
                            </div>
                            <div className={styles.row}>
                                <span className={styles.label}>Stop Loss</span>
                                <span className={`${styles.value} ${styles.stopLoss}`}>{results.formatted.stopLossPrice}</span>
                            </div>
                            <div className={styles.row}>
                                <span className={styles.label}>Target</span>
                                <span className={`${styles.value} ${styles.target}`}>{results.formatted.targetPrice}</span>
                            </div>
                        </div>

                        <button className={styles.calculateButton} onClick={() => setEditMode(true)}>
                            Adjust Parameters
                        </button>
                    </>
                ) : (
                    <div className={styles.editForm}>
                        <div className={styles.inputGroup}>
                            <label>Capital</label>
                            <input 
                                type="number" 
                                value={formValues.capital} 
                                onChange={(e) => updateFormField({ capital: Number(e.target.value) })}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Risk %</label>
                            <input 
                                type="number" 
                                value={formValues.riskPercent} 
                                step="0.1"
                                onChange={(e) => updateFormField({ riskPercent: Number(e.target.value) })}
                            />
                        </div>

                        <div className={styles.editControls}>
                            <button 
                                className={`${styles.placeOnChartBtn} ${placementMode ? styles.active : ''}`}
                                onClick={handlePlacementClick}
                            >
                                <Plus size={16} />
                                {placementMode ? `Set ${placementMode.toUpperCase()}...` : 'Place on Chart'}
                            </button>
                        </div>

                        <div className={styles.section} style={{ marginTop: 16 }}>
                            <div className={styles.inputGroup}>
                                <label>Segment</label>
                                <select 
                                    value={formValues.segment}
                                    onChange={(e) => {
                                        const newSegment = e.target.value as TradeSegment;
                                        let newLeverage = formValues.leverage;
                                        if (newSegment === 'Equity Intraday') newLeverage = 5;
                                        else if (newSegment === 'Equity Delivery') newLeverage = 1;
                                        
                                        updateFormField({ 
                                            segment: newSegment,
                                            leverage: newLeverage
                                        });
                                    }}
                                >
                                    <option value="Equity Intraday">Equity Intraday (5x)</option>
                                    <option value="Equity Delivery">Equity Delivery (1x)</option>
                                    <option value="F&O Futures">F&O Futures</option>
                                    <option value="F&O Options">F&O Options</option>
                                </select>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Leverage (x)</label>
                                <input 
                                    type="number" 
                                    value={formValues.leverage} 
                                    min="1"
                                    max="100"
                                    onChange={(e) => updateFormField({ leverage: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <button className={styles.calculateButton} onClick={handleCalculate}>
                            Calculate Position
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RiskCalculatorPanel;
