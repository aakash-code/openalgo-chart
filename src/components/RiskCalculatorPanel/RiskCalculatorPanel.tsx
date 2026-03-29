import React, { useState, useEffect } from 'react';
import type { FC, MouseEvent as ReactMouseEvent } from 'react';
import { X, Minimize2, Maximize2, Edit2 } from 'lucide-react';
import { validateRiskParamsDetailed, autoDetectSide } from '../../utils/indicators/riskCalculator';
import TemplateSelector from './TemplateSelector';
import styles from './RiskCalculatorPanel.module.css';

type Side = 'BUY' | 'SELL';
type Product = 'MIS' | 'CNC' | 'NRML';
type SizingMode = 'cash' | 'marginPerUnit' | 'leverage';

interface FormValues {
    capital: number;
    riskPercent: number;
    side: Side;
    entryPrice: number;
    stopLossPrice: number;
    targetPrice: number;
    riskRewardRatio: number;
    product: Product;
    sizingMode: SizingMode;
    availableMargin: number;
    marginPerUnit: number;
    leverage: number;
}

interface FormattedResults {
    capital: string;
    riskPercent: string;
    riskAmount: string;
    entryPrice: string;
    stopLossPrice: string;
    slPoints: string;
    quantity: string;
    positionValue: string;
    targetPrice: string;
    rewardPoints: string;
    rewardAmount: string;
    rrRatio: string;
    product: string;
    sizingMode: string;
    riskQuantity: string;
    marginQuantity: string;
    availableMargin: string;
    marginPerUnit: string;
    requiredMargin: string;
    remainingMargin: string;
    exposure: string;
    limitingFactor: string;
}

interface Results {
    error?: string;
    formatted?: FormattedResults;
}

interface Params {
    capital?: number;
    riskPercent?: number;
    side?: Side;
    entryPrice?: number;
    stopLossPrice?: number;
    targetPrice?: number;
    riskRewardRatio?: number;
    product?: Product;
    sizingMode?: SizingMode;
    availableMargin?: number;
    marginPerUnit?: number;
    leverage?: number;
    showTarget?: boolean;
}

interface FieldErrors {
    [key: string]: string | undefined;
}

interface FieldTouched {
    [key: string]: boolean;
}

interface Position {
    x: number;
    y: number;
}

interface SettingsUpdate {
    capital: number;
    riskPercent: number;
    side: Side;
    entryPrice: number;
    stopLossPrice: number;
    product: Product;
    sizingMode: SizingMode;
    availableMargin: number;
    marginPerUnit: number;
    leverage: number;
    showTarget: boolean;
    targetPrice?: number;
    riskRewardRatio?: number;
}

export interface RiskCalculatorPanelProps {
    results: Results | null;
    params: Params;
    onClose: () => void;
    onUpdateSettings?: (updates: SettingsUpdate) => void;
    ltp?: number;
    draggable?: boolean;
}

/**
 * Floating panel that displays risk calculator results and allows editing parameters
 */
const RiskCalculatorPanel: FC<RiskCalculatorPanelProps> = ({
    results,
    params,
    onClose,
    onUpdateSettings,
    ltp = 0,
    draggable = false
}) => {
    const formatted = results?.formatted ?? null;

    // Edit mode: show when there's an error or initially
    const [editMode, setEditMode] = useState(!results || !!results.error);
    const [minimized, setMinimized] = useState(false);
    const [position, setPosition] = useState<Position>({ x: 20, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

    // Local state for form inputs
    const [formValues, setFormValues] = useState<FormValues>({
        capital: params?.capital || 100000,
        riskPercent: params?.riskPercent || 2,
        side: params?.side || 'BUY',
        entryPrice: params?.entryPrice || 0,
        stopLossPrice: params?.stopLossPrice || 0,
        targetPrice: params?.targetPrice || 0,
        riskRewardRatio: params?.riskRewardRatio || 2,
        product: params?.product || 'MIS',
        sizingMode: params?.sizingMode || 'cash',
        availableMargin: params?.availableMargin || 0,
        marginPerUnit: params?.marginPerUnit || 0,
        leverage: params?.leverage || 5,
    });

    // Validation state
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [fieldTouched, setFieldTouched] = useState<FieldTouched>({});

    // Handle drag start
    const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>): void => {
        if (!draggable) return;
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    // Handle drag move
    const handleMouseMove = (e: MouseEvent): void => {
        if (!isDragging || !draggable) return;
        setPosition({
            x: e.clientX - dragOffset.x,
            y: e.clientY - dragOffset.y
        });
    };

    // Handle drag end
    const handleMouseUp = (): void => {
        setIsDragging(false);
    };

    // Add/remove mouse event listeners
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragOffset]);

    // Update edit mode when results change
    useEffect(() => {
        if (results && !results.error) {
            setEditMode(false);
        } else {
            setEditMode(true);
        }
    }, [results]);

    // Validation helper function
    const validateField = (key: string, value: number | string): boolean => {
        const validationParams = {
            ...formValues,
            [key]: value
        };

        const validation = validateRiskParamsDetailed(validationParams);

        // Update errors for this field
        setFieldErrors(prev => {
            const updated = { ...prev };

            // Clear previous errors/suggestions for this field
            delete updated[key];
            delete updated[`${key}Suggestion`];
            delete updated[`${key}Level`];

            // Add new errors if any
            if (validation.errors[key]) {
                updated[key] = validation.errors[key];
                if (validation.errors[`${key}Suggestion`]) {
                    updated[`${key}Suggestion`] = validation.errors[`${key}Suggestion`];
                }
                if (validation.errors[`${key}Level`]) {
                    updated[`${key}Level`] = validation.errors[`${key}Level`];
                }
            }

            return updated;
        });

        return validation.isValid;
    };

    // Handle input blur (field was touched)
    const handleBlur = (key: string): void => {
        setFieldTouched(prev => ({ ...prev, [key]: true }));
        validateField(key, formValues[key as keyof FormValues]);
    };

    // Handle input change
    const handleInputChange = (field: keyof FormValues, value: string | number): void => {
        setFormValues(prev => {
            const updated = { ...prev, [field]: value };

            // Auto-detect side when entry or stop loss changes
            if ((field === 'entryPrice' || field === 'stopLossPrice') &&
                Number(updated.entryPrice) > 0 && Number(updated.stopLossPrice) > 0) {

                const autoSide = autoDetectSide(Number(updated.entryPrice), Number(updated.stopLossPrice));
                if (autoSide) {
                    updated.side = autoSide as Side;
                }
            }

            return updated;
        });

        // Only validate if field was touched before
        if (fieldTouched[field]) {
            validateField(field, value);
        }
    };

    // Check if form is valid
    const isFormValid = (): boolean => {
        const validation = validateRiskParamsDetailed({
            ...formValues
        });
        return validation.isValid;
    };

    // Handle Use LTP button
    const handleUseLTP = (): void => {
        if (ltp > 0) {
            handleInputChange('entryPrice', ltp);
        }
    };

    // Handle Calculate button
    const handleCalculate = (): void => {
        if (onUpdateSettings) {
            const updates: SettingsUpdate = {
                capital: Number(formValues.capital),
                riskPercent: Number(formValues.riskPercent),
                side: formValues.side,
                entryPrice: Number(formValues.entryPrice),
                stopLossPrice: Number(formValues.stopLossPrice),
                product: formValues.product,
                sizingMode: formValues.sizingMode,
                availableMargin: Number(formValues.availableMargin),
                marginPerUnit: Number(formValues.marginPerUnit),
                leverage: Number(formValues.leverage),
                showTarget: true
            };

            // Include targetPrice if provided, otherwise use riskRewardRatio
            if (formValues.targetPrice && Number(formValues.targetPrice) > 0) {
                updates.targetPrice = Number(formValues.targetPrice);
            } else {
                updates.riskRewardRatio = Number(formValues.riskRewardRatio);
            }

            onUpdateSettings(updates);
        }
    };

    // Handle Edit button (switch back to edit mode)
    const handleEdit = (): void => {
        setEditMode(true);
    };

    // Helper function to render input with validation
    const renderValidatedInput = (
        key: keyof FormValues,
        label: string,
        type: string = 'number',
        options: Record<string, unknown> = {}
    ): React.ReactNode => {
        const hasError = fieldErrors[key] && fieldTouched[key] && fieldErrors[`${key}Level`] !== 'warning';
        const hasWarning = fieldErrors[key] && fieldTouched[key] && fieldErrors[`${key}Level`] === 'warning';
        const isValid = !hasError && !hasWarning && fieldTouched[key] && (formValues[key] as any) !== '' && (formValues[key] as any) !== 0;
        const suggestion = fieldErrors[`${key}Suggestion`];

        let inputClass = '';
        if (hasError) inputClass = styles.inputError;
        else if (hasWarning) inputClass = styles.inputWarning;
        else if (isValid) inputClass = styles.inputValid;

        return (
            <div className={styles.inputGroup}>
                <label>{label}</label>
                <div className={styles.inputWrapper}>
                    <input
                        type={type}
                        value={formValues[key] || ''}
                        onChange={(e) => handleInputChange(key, e.target.value)}
                        onBlur={() => handleBlur(key)}
                        className={inputClass}
                        {...options}
                    />
                    {isValid && <span className={styles.validCheck}>✓</span>}
                </div>
                {hasError && (
                    <div className={styles.fieldError}>
                        <span>{fieldErrors[key]}</span>
                        {suggestion && (
                            <button
                                className={styles.suggestionButton}
                                onClick={() => {
                                    handleInputChange(key, parseFloat(suggestion));
                                    handleBlur(key);
                                }}
                            >
                                Try ₹{suggestion}
                            </button>
                        )}
                    </div>
                )}
                {hasWarning && (
                    <div className={styles.fieldWarning}>
                        <span>{fieldErrors[key]}</span>
                    </div>
                )}
            </div>
        );
    };

    // Helper function to render select with validation
    const renderValidatedSelect = (
        key: keyof FormValues,
        label: string,
        options: React.ReactNode
    ): React.ReactNode => {
        const hasError = fieldErrors[key] && fieldTouched[key];
        const isValid = !hasError && fieldTouched[key] && formValues[key];

        let selectClass = '';
        if (hasError) selectClass = styles.inputError;
        else if (isValid) selectClass = styles.inputValid;

        return (
            <div className={styles.inputGroup}>
                <label>{label}</label>
                <select
                    value={formValues[key] as string | number}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    onBlur={() => handleBlur(key)}
                    className={selectClass}
                >
                    {options}
                </select>
                {hasError && (
                    <div className={styles.fieldError}>
                        {fieldErrors[key]}
                    </div>
                )}
            </div>
        );
    };

    // Edit mode - show input fields
    if (editMode) {
        return (
            <div
                className={styles.panel}
                style={draggable ? { left: `${position.x}px`, top: `${position.y}px`, position: 'fixed' } : {}}
            >
                <div className={styles.header} onMouseDown={handleMouseDown}>
                    <span>Risk Calculator</span>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={16} />
                    </button>
                </div>

                <div className={styles.content}>
                    {/* Show error message if any */}
                    {results?.error && (
                        <div className={styles.errorMessage}>
                            {results.error}
                        </div>
                    )}

                    {/* Template Selector */}
                    <TemplateSelector
                        currentValues={{
                            capital: formValues.capital,
                            riskPercent: formValues.riskPercent
                        }}
                        onTemplateSelect={(values) => {
                            setFormValues(prev => ({
                                ...prev,
                                capital: values.capital,
                                riskPercent: values.riskPercent
                            }));
                            // Validate the new values if fields were previously touched
                            if (fieldTouched.capital) {
                                validateField('capital', values.capital);
                            }
                            if (fieldTouched.riskPercent) {
                                validateField('riskPercent', values.riskPercent);
                            }
                        }}
                    />

                    {/* Capital Input */}
                    {renderValidatedInput('capital', 'Capital (₹)', 'number', { min: '1000', step: '1000' })}

                    {/* Risk Percent Input */}
                    {renderValidatedInput('riskPercent', 'Risk %', 'number', { min: '0.1', max: '100', step: '0.1' })}

                    {/* Side Select */}
                    {renderValidatedSelect('side', 'Side', (
                        <>
                            <option value="BUY">BUY</option>
                            <option value="SELL">SELL</option>
                        </>
                    ))}

                    {renderValidatedSelect('product', 'Product', (
                        <>
                            <option value="MIS">MIS</option>
                            <option value="CNC">CNC</option>
                            <option value="NRML">NRML</option>
                        </>
                    ))}

                    {renderValidatedSelect('sizingMode', 'Sizing Mode', (
                        <>
                            <option value="cash">Cash</option>
                            <option value="marginPerUnit">Margin / Share</option>
                            <option value="leverage">Leverage</option>
                        </>
                    ))}

                    {/* Entry Price Input */}
                    <div className={styles.inputGroup}>
                        <label>Entry Price</label>
                        <div className={styles.inputWrapper}>
                            <input
                                type="number"
                                value={formValues.entryPrice || ''}
                                onChange={(e) => handleInputChange('entryPrice', e.target.value)}
                                onBlur={() => handleBlur('entryPrice')}
                                className={
                                    fieldErrors.entryPrice && fieldTouched.entryPrice
                                        ? styles.inputError
                                        : !fieldErrors.entryPrice && fieldTouched.entryPrice && formValues.entryPrice > 0
                                        ? styles.inputValid
                                        : ''
                                }
                                min="0"
                                step="0.01"
                            />
                            {!fieldErrors.entryPrice && fieldTouched.entryPrice && formValues.entryPrice > 0 && (
                                <span className={styles.validCheck}>✓</span>
                            )}
                        </div>
                        {ltp > 0 && (
                            <button onClick={handleUseLTP} className={styles.useLtp}>
                                Use LTP (₹{ltp.toFixed(2)})
                            </button>
                        )}
                        {fieldErrors.entryPrice && fieldTouched.entryPrice && (
                            <div className={styles.fieldError}>
                                <span>{fieldErrors.entryPrice}</span>
                            </div>
                        )}
                    </div>

                    {/* Stop Loss Input */}
                    {renderValidatedInput('stopLossPrice', 'Stop Loss', 'number', { min: '0', step: '0.01' })}

                    {/* Target Price Input */}
                    {renderValidatedInput('targetPrice', 'Target Price (optional)', 'number', { min: '0', step: '0.01', placeholder: 'Leave empty for auto-calc' })}

                    {/* Margin Inputs */}
                    {renderValidatedInput('availableMargin', 'Available Margin (₹)', 'number', { min: '0', step: '1', placeholder: 'Defaults to capital if empty' })}

                    {formValues.sizingMode === 'marginPerUnit' && (
                        renderValidatedInput('marginPerUnit', 'Margin / Share (₹)', 'number', { min: '0', step: '0.01' })
                    )}

                    {formValues.sizingMode === 'leverage' && (
                        renderValidatedInput('leverage', 'Leverage (x)', 'number', { min: '1', step: '0.1' })
                    )}

                    {/* Risk:Reward Ratio Select - only if no target price */}
                    {(!formValues.targetPrice || Number(formValues.targetPrice) <= 0) && renderValidatedSelect('riskRewardRatio', 'Risk : Reward', (
                        <>
                            <option value="1">1:1</option>
                            <option value="1.5">1:1.5</option>
                            <option value="2">1:2</option>
                            <option value="2.5">1:2.5</option>
                            <option value="3">1:3</option>
                            <option value="4">1:4</option>
                            <option value="5">1:5</option>
                        </>
                    ))}

                    {/* Calculate Button */}
                    <button
                        onClick={handleCalculate}
                        className={styles.calculateButton}
                        disabled={!isFormValid()}
                    >
                        Calculate
                    </button>
                </div>
            </div>
        );
    }

    // Minimized state
    if (minimized) {
        return (
            <div
                className={styles.panelMinimized}
                style={draggable ? { left: `${position.x}px`, top: `${position.y}px`, position: 'fixed' } : {}}
                onMouseDown={handleMouseDown}
            >
                <span>Qty: {formatted?.quantity || '--'}</span>
                <button onClick={() => setMinimized(false)} className={styles.iconButton}>
                    <Maximize2 size={14} />
                </button>
            </div>
        );
    }

    // Full panel display
    return (
        <div
            className={styles.panel}
            style={draggable ? { left: `${position.x}px`, top: `${position.y}px`, position: 'fixed' } : {}}
        >
            <div className={styles.header} onMouseDown={handleMouseDown}>
                <span>Risk Calculator</span>
                <div className={styles.headerButtons}>
                    <button onClick={handleEdit} className={styles.iconButton} title="Edit">
                        <Edit2 size={16} />
                    </button>
                    <button onClick={() => setMinimized(true)} className={styles.iconButton}>
                        <Minimize2 size={16} />
                    </button>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className={styles.content}>
                {!formatted && (
                    <div className={styles.errorMessage}>
                        {results?.error || 'Risk calculator results are not available yet.'}
                    </div>
                )}

                {/* Capital & Risk Section */}
                <div className={styles.section}>
                    <div className={styles.row}>
                        <span className={styles.label}>Capital:</span>
                        <span className={styles.value}>{formatted?.capital || '--'}</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.label}>Risk %:</span>
                        <span className={styles.value}>{formatted?.riskPercent || '--'}</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.label}>Risk Amount:</span>
                        <span className={`${styles.value} ${styles.risk}`}>{formatted?.riskAmount || '--'}</span>
                    </div>
                </div>

                {/* Entry & Stop Loss Section */}
                <div className={styles.section}>
                    <div className={styles.row}>
                        <span className={styles.label}>Entry:</span>
                        <span className={`${styles.value} ${styles.entry}`}>{formatted?.entryPrice || '--'}</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.label}>Stop Loss:</span>
                        <span className={`${styles.value} ${styles.stopLoss}`}>{formatted?.stopLossPrice || '--'}</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.label}>SL Points:</span>
                        <span className={styles.value}>{formatted?.slPoints || '--'}</span>
                    </div>
                </div>

                {/* Position Section */}
                <div className={styles.section}>
                    <div className={styles.row}>
                        <span className={styles.label}>✓ Quantity:</span>
                        <span className={`${styles.value} ${styles.quantity}`}>{formatted?.quantity ? `${formatted.quantity} shares` : '--'}</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.label}>Risk Qty:</span>
                        <span className={styles.value}>{formatted?.riskQuantity || '--'}</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.label}>Margin Qty:</span>
                        <span className={styles.value}>{formatted?.marginQuantity || '--'}</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.label}>Limiter:</span>
                        <span className={styles.value}>{formatted?.limitingFactor || '--'}</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.label}>Position Value:</span>
                        <span className={styles.value}>{formatted?.positionValue || '--'}</span>
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.row}>
                        <span className={styles.label}>Product:</span>
                        <span className={styles.value}>{formatted?.product || '--'}</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.label}>Sizing Mode:</span>
                        <span className={styles.value}>{formatted?.sizingMode || '--'}</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.label}>Available Margin:</span>
                        <span className={styles.value}>{formatted?.availableMargin || '--'}</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.label}>Margin / Share:</span>
                        <span className={styles.value}>{formatted?.marginPerUnit || '--'}</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.label}>Required Margin:</span>
                        <span className={styles.value}>{formatted?.requiredMargin || '--'}</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.label}>Remaining Margin:</span>
                        <span className={styles.value}>{formatted?.remainingMargin || '--'}</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.label}>Exposure:</span>
                        <span className={styles.value}>{formatted?.exposure || '--'}</span>
                    </div>
                </div>

                {/* Target & Reward Section */}
                {params.showTarget && (
                    <div className={styles.section}>
                        <div className={styles.row}>
                            <span className={styles.label}>Target:</span>
                            <span className={`${styles.value} ${styles.target}`}>{formatted?.targetPrice || '--'}</span>
                        </div>
                        <div className={styles.row}>
                            <span className={styles.label}>Reward Points:</span>
                            <span className={styles.value}>{formatted?.rewardPoints || '--'}</span>
                        </div>
                        <div className={styles.row}>
                            <span className={styles.label}>Reward Amount:</span>
                            <span className={`${styles.value} ${styles.reward}`}>{formatted?.rewardAmount || '--'}</span>
                        </div>
                    </div>
                )}

                {/* Risk:Reward Ratio */}
                <div className={styles.section}>
                    <div className={styles.row}>
                        <span className={styles.label}>Risk : Reward</span>
                        <span className={`${styles.value} ${styles.rrRatio}`}>{formatted?.rrRatio || '--'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RiskCalculatorPanel;
