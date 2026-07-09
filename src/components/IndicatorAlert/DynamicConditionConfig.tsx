import React from 'react';
import type { FC, ChangeEvent } from 'react';
import styles from './IndicatorAlertDialog.module.css';

type ConditionType =
    | 'crosses_above'
    | 'crosses_below'
    | 'greater_than'
    | 'less_than'
    | 'increases_by'
    | 'decreases_by'
    | 'changes_by'
    | 'enters_zone'
    | 'exits_zone'
    | 'within_zone'
    | 'outside_zone'
    | 'line_crosses_above'
    | 'line_crosses_below'
    | 'equals';

interface ValueRange {
    min: number;
    max: number;
}

interface Condition {
    type: ConditionType;
    defaultValue?: number;
    valueRange?: ValueRange;
    valueStep?: number;
    zone?: [number, number];
    series?: string;
    value?: number;
}

interface ConditionConfig {
    value?: number;
    zone?: [number, number];
    [key: string]: unknown;
}

export interface DynamicConditionConfigProps {
    condition: Condition | null;
    config: ConditionConfig;
    onChange: (config: ConditionConfig) => void;
}

/**
 * Dynamic Condition Config
 * Renders condition-specific input fields based on the selected condition type
 */
const DynamicConditionConfig: FC<DynamicConditionConfigProps> = ({ condition, config, onChange }) => {
    if (!condition) return null;

    const { type, defaultValue, valueRange, valueStep, zone } = condition;

    const handleChange = (key: string, value: unknown): void => {
        onChange({
            ...config,
            [key]: value,
        });
    };

    // For conditions that require a threshold value
    const rendersValueInput = ['crosses_above', 'crosses_below', 'greater_than', 'less_than', 'increases_by', 'decreases_by', 'changes_by'].includes(type);

    // For conditions that work with zones (already pre-defined in condition)
    const usesZone = ['enters_zone', 'exits_zone', 'within_zone', 'outside_zone'].includes(type);

    // For line crossovers (no additional config needed)
    const isCrossover = ['line_crosses_above', 'line_crosses_below'].includes(type);

    // For equals condition (value is pre-defined)
    const isEquals = type === 'equals';

    return (
        <div className={styles.conditionConfig}>
            {rendersValueInput && (
                <div className={styles.field}>
                    <label htmlFor="condition-value" className={styles.label}>
                        Threshold Value <span className={styles.required}>*</span>
                    </label>
                    <input
                        id="condition-value"
                        type="number"
                        className={styles.input}
                        value={config.value !== undefined ? config.value : defaultValue || ''}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('value', parseFloat(e.target.value))}
                        min={valueRange?.min}
                        max={valueRange?.max}
                        step={valueStep || 0.01}
                        placeholder={defaultValue?.toString() || '0'}
                    />
                    {valueRange && (
                        <small className={styles.fieldHint}>
                            Range: {valueRange.min} - {valueRange.max}
                        </small>
                    )}
                </div>
            )}

            {usesZone && zone && (
                <div className={styles.infoBox}>
                    <strong>Zone:</strong> {zone[0]} - {zone[1]}
                </div>
            )}

            {isCrossover && (
                <div className={styles.infoBox}>
                    <small>No additional configuration required for crossover alerts.</small>
                </div>
            )}

            {isEquals && condition.value !== undefined && (
                <div className={styles.infoBox}>
                    <strong>Target Value:</strong> {condition.value === 1 ? 'Bullish' : condition.value === -1 ? 'Bearish' : condition.value}
                </div>
            )}
        </div>
    );
};

export default DynamicConditionConfig;
