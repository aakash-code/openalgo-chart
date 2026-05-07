import React from 'react';
import type { FC, ChangeEvent } from 'react';
import styles from './RiskCalculatorPanel.module.css';

export type TradeSide = 'BUY' | 'SELL';
export type TradeSegment = 'Equity Delivery' | 'Equity Intraday' | 'F&O Futures' | 'F&O Options';
export type Exchange = 'NSE' | 'BSE';

interface Params {
    capital: number;
    riskPercent: number;
    side: TradeSide;
    entryPrice: number;
    stopLossPrice: number;
    targetPrice?: number;
    riskRewardRatio: number;
    showTarget: boolean;
    leverage?: number;
    segment?: TradeSegment;
    exchange?: Exchange;
}

export interface RiskSettingsProps {
    params: Params;
    updateParam: (key: keyof Params, value: number | string | boolean) => void;
    ltp?: number;
    onClose?: () => void;
}

/**
 * Settings form for risk calculator inputs
 */
const RiskSettings: FC<RiskSettingsProps> = ({ params, updateParam, ltp, onClose }) => {
    return (
        <div className={styles.settings}>
            {/* Capital Input */}
            <div className={styles.inputGroup}>
                <label htmlFor="capital">Capital (₹)</label>
                <input
                    id="capital"
                    type="number"
                    value={params.capital || 100000}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam('capital', Number(e.target.value))}
                    min={1000}
                    step={1000}
                    placeholder="Enter trading capital"
                />
            </div>

            {/* Risk Percentage Input */}
            <div className={styles.inputGroup}>
                <label htmlFor="riskPercent">Risk %</label>
                <input
                    id="riskPercent"
                    type="number"
                    value={params.riskPercent || 2}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam('riskPercent', Number(e.target.value))}
                    min={0.1}
                    max={100}
                    step={0.1}
                    placeholder="Risk per trade"
                />
            </div>
            
            {/* Leverage Input */}
            <div className={styles.inputGroup}>
                <label htmlFor="leverage">Leverage (x)</label>
                <input
                    id="leverage"
                    type="number"
                    value={params.leverage || 1}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam('leverage', Number(e.target.value))}
                    min={1}
                    max={100}
                    step={1}
                />
            </div>
            
            {/* Segment Selection */}
            <div className={styles.inputGroup}>
                <label htmlFor="segment">Segment</label>
                <select
                    id="segment"
                    value={params.segment || 'Equity Intraday'}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => updateParam('segment', e.target.value)}
                >
                    <option value="Equity Delivery">Equity Delivery</option>
                    <option value="Equity Intraday">Equity Intraday</option>
                    <option value="F&O Futures">F&O Futures</option>
                    <option value="F&O Options">F&O Options</option>
                </select>
            </div>
            
            {/* Exchange Selection */}
            <div className={styles.inputGroup}>
                <label htmlFor="exchange">Exchange</label>
                <select
                    id="exchange"
                    value={params.exchange || 'NSE'}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => updateParam('exchange', e.target.value)}
                >
                    <option value="NSE">NSE</option>
                    <option value="BSE">BSE</option>
                </select>
            </div>

            {/* Side Selection */}
            <div className={styles.inputGroup}>
                <label htmlFor="side">Side</label>
                <select
                    id="side"
                    value={params.side || 'BUY'}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => updateParam('side', e.target.value as TradeSide)}
                >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                </select>
            </div>

            {/* Entry Price Input */}
            <div className={styles.inputGroup}>
                <label htmlFor="entryPrice">Entry Price</label>
                <input
                    id="entryPrice"
                    type="number"
                    value={params.entryPrice || 0}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam('entryPrice', Number(e.target.value))}
                    step={0.01}
                    placeholder="Entry price"
                />
                {ltp && (
                    <button
                        className={styles.useLtp}
                        onClick={() => updateParam('entryPrice', ltp)}
                        type="button"
                    >
                        Use LTP (₹{ltp.toFixed(2)})
                    </button>
                )}
            </div>

            {/* Stop Loss Input */}
            <div className={styles.inputGroup}>
                <label htmlFor="stopLossPrice">Stop Loss</label>
                <input
                    id="stopLossPrice"
                    type="number"
                    value={params.stopLossPrice || 0}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam('stopLossPrice', Number(e.target.value))}
                    step={0.01}
                    placeholder="Stop loss price"
                />
            </div>

            {/* Target Price Input */}
            <div className={styles.inputGroup}>
                <label htmlFor="targetPrice">Target Price (optional)</label>
                <input
                    id="targetPrice"
                    type="number"
                    value={params.targetPrice || ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam('targetPrice', Number(e.target.value))}
                    step={0.01}
                    placeholder="Leave empty for auto-calc"
                />
            </div>

            {/* Risk-Reward Ratio - only show if no target price */}
            {(!params.targetPrice || params.targetPrice <= 0) && (
                <div className={styles.inputGroup}>
                    <label htmlFor="riskRewardRatio">Risk:Reward Ratio</label>
                    <select
                        id="riskRewardRatio"
                        value={params.riskRewardRatio || 2}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => updateParam('riskRewardRatio', Number(e.target.value))}
                    >
                        <option value={1}>1:1</option>
                        <option value={1.5}>1:1.5</option>
                        <option value={2}>1:2</option>
                        <option value={2.5}>1:2.5</option>
                        <option value={3}>1:3</option>
                        <option value={4}>1:4</option>
                        <option value={5}>1:5</option>
                    </select>
                </div>
            )}

            {/* Show Target Toggle */}
            <div className={styles.inputGroup}>
                <label htmlFor="showTarget">
                    <input
                        id="showTarget"
                        type="checkbox"
                        checked={params.showTarget !== false}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam('showTarget', e.target.checked)}
                    />
                    Show Target Line
                </label>
            </div>
        </div>
    );
};

export default RiskSettings;
