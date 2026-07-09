import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { FC, ChangeEvent, MouseEvent } from 'react';
import styles from './IndicatorAlertDialog.module.css';
import { X, TrendingUp, Info } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useKeyboardNav } from '../../hooks/useKeyboardNav';
import {
    INDICATOR_ALERT_CONFIGS,
    getConditionConfig,
    ALERT_CONDITION_TYPES,
} from '../../utils/alerts/alertConditions';
import { getDefaultMessageTemplate, AVAILABLE_PLACEHOLDERS } from '../../utils/alerts/alertMessageTemplate';
import DynamicConditionConfig from './DynamicConditionConfig';

type Theme = 'dark' | 'light';
type Frequency = 'once_per_bar' | 'every_time';

interface ConditionConfig {
    id: string;
    type: string;
    label: string;
    description?: string;
    defaultValue?: number;
    zone?: [number, number];
    [key: string]: unknown;
}

interface IndicatorConfig {
    id: string;
    name: string;
    description?: string;
    defaultConditions?: ConditionConfig[];
}

interface ActiveIndicator {
    type: string;
    visible?: boolean;
    enabled?: boolean;
}

interface AlertCondition {
    id: string;
    type: string;
    label: string;
    [key: string]: unknown;
}

interface Alert {
    id: string;
    type: string;
    symbol: string;
    exchange: string;
    indicator: string;
    condition: AlertCondition;
    name: string;
    message: string;
    webhookUrl?: string | null;
    frequency: Frequency;
    created_at: string;
    status: string;
    interval: string;
}

interface AlertToEdit {
    id: string;
    indicator: string;
    condition: AlertCondition;
    name: string;
    message: string;
    webhookUrl?: string;
    frequency?: Frequency;
    interval?: string;
    created_at?: string;
}

interface PlaceholderItem {
    token: string;
    description: string;
}

interface PlaceholderGroups {
    general: PlaceholderItem[];
    price: PlaceholderItem[];
    indicators: Record<string, PlaceholderItem[]>;
}

export interface IndicatorAlertDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (alert: Alert) => void;
    activeIndicators: ActiveIndicator[] | Record<string, boolean | { enabled: boolean }>;
    symbol: string;
    exchange?: string;
    theme?: Theme;
    alertToEdit?: AlertToEdit | null;
    initialIndicator?: string | null;
    currentInterval?: string;
}

const IndicatorAlertDialog: FC<IndicatorAlertDialogProps> = ({
    isOpen,
    onClose,
    onSave,
    activeIndicators,
    symbol,
    exchange = 'NSE',
    theme = 'dark',
    alertToEdit = null,
    initialIndicator = null,
    currentInterval = '1m',
}) => {
    const [selectedIndicator, setSelectedIndicator] = useState('');
    const [selectedCondition, setSelectedCondition] = useState<ConditionConfig | null>(null);
    const [conditionConfig, setConditionConfig] = useState<Record<string, unknown>>({});
    const [alertName, setAlertName] = useState('');
    const [message, setMessage] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [frequency, setFrequency] = useState<Frequency>('once_per_bar');
    const [interval, setIntervalState] = useState(currentInterval);
    const [showPlaceholders, setShowPlaceholders] = useState(false);

    // Focus trap for accessibility
    const focusTrapRef = useFocusTrap(isOpen);

    // Escape key to close
    useKeyboardNav({
        enabled: isOpen,
        onEscape: useCallback(() => onClose(), [onClose]),
    });

    // Get available indicators (only those that are enabled)
    const availableIndicators = useMemo((): IndicatorConfig[] => {
        if (!activeIndicators) return [];

        // Handle array format (new) or object format (legacy fallback)
        let indicatorsList: ActiveIndicator[] = [];
        if (Array.isArray(activeIndicators)) {
            indicatorsList = activeIndicators;
        } else if (typeof activeIndicators === 'object') {
            indicatorsList = Object.entries(activeIndicators).map(([key, val]) => ({
                type: key,
                visible: val === true || (typeof val === 'object' && val?.enabled === true)
            }));
        }

        // Get unique visible types that have alert configs
        const uniqueTypes = new Set(
            indicatorsList
                .filter(ind => ind.visible !== false)
                .map(ind => ind.type)
        );

        return Array.from(uniqueTypes)
            .filter(type => type in INDICATOR_ALERT_CONFIGS)
            .map(type => ({
                id: type,
                ...((INDICATOR_ALERT_CONFIGS as any)[type]),
            }));
    }, [activeIndicators]);

    // Get available conditions for selected indicator
    const availableConditions = useMemo((): ConditionConfig[] => {
        if (!selectedIndicator) return [];
        const config = (INDICATOR_ALERT_CONFIGS as any)[selectedIndicator];
        return config?.defaultConditions || [];
    }, [selectedIndicator]);

    // Reset or Populate form when dialog opens
    useEffect(() => {
        if (isOpen) {
            if (alertToEdit) {
                // Populate form for editing
                setSelectedIndicator(alertToEdit.indicator);

                // Find and set the condition object from config
                const config = (INDICATOR_ALERT_CONFIGS as any)[alertToEdit.indicator];
                const condition = config?.defaultConditions?.find(c => c.id === alertToEdit.condition.id) || null;
                setSelectedCondition(condition);

                // Extract config parameters (exclude id, type, label)
                const { id, type, label, ...params } = alertToEdit.condition;
                setConditionConfig(params);

                setAlertName(alertToEdit.name);
                setMessage(alertToEdit.message);
                setWebhookUrl(alertToEdit.webhookUrl || '');
                setFrequency(alertToEdit.frequency || 'once_per_bar');
                setIntervalState(alertToEdit.interval || currentInterval);
            } else {
                // Reset form for fresh create
                setSelectedIndicator(initialIndicator || '');
                setSelectedCondition(null);
                setConditionConfig({});
                setAlertName('');
                setMessage('');
                setWebhookUrl('');
                setFrequency('once_per_bar');
                setIntervalState(currentInterval);
            }
            setShowPlaceholders(false);
        }
    }, [isOpen, alertToEdit, initialIndicator, currentInterval]);

    // Update message template when condition changes
    useEffect(() => {
        if (selectedCondition && !message && !alertToEdit) {
            const template = getDefaultMessageTemplate(
                {
                    ...selectedCondition,
                    indicator: selectedIndicator,
                    ...conditionConfig,
                },
                symbol
            );
            setMessage(template);
        }
    }, [selectedCondition, selectedIndicator, conditionConfig, symbol, message, alertToEdit]);

    // Update alert name when indicator or condition changes
    useEffect(() => {
        if (selectedIndicator && selectedCondition && !alertName && !alertToEdit) {
            const indicatorName = (INDICATOR_ALERT_CONFIGS as any)[selectedIndicator]?.name || selectedIndicator;
            setAlertName(`${symbol} ${indicatorName} Alert`);
        }
    }, [selectedIndicator, selectedCondition, symbol, alertName, alertToEdit]);

    const handleIndicatorChange = (indicatorId: string): void => {
        setSelectedIndicator(indicatorId);
        setSelectedCondition(null);
        setConditionConfig({});
    };

    const handleConditionChange = (conditionId: string): void => {
        const condition = availableConditions.find((c) => c.id === conditionId) || null;
        setSelectedCondition(condition);

        // Initialize condition config with default values
        const initialConfig: Record<string, unknown> = {};
        if (condition?.defaultValue !== undefined) {
            initialConfig.value = condition.defaultValue;
        }
        if (condition?.zone) {
            initialConfig.zone = condition.zone;
        }
        setConditionConfig(initialConfig);
    };

    const handleSave = (): void => {
        if (!selectedIndicator || !selectedCondition) {
            return;
        }

        const alert: Alert = {
            id: alertToEdit ? alertToEdit.id : `indicator-alert-${Date.now()}`,
            type: 'indicator',
            symbol,
            exchange,
            indicator: selectedIndicator,
            condition: {
                id: selectedCondition.id,
                type: selectedCondition.type,
                label: selectedCondition.label,
                // Include series fields from selected condition for alert evaluation
                series: selectedCondition.series,
                series1: selectedCondition.series1,
                series2: selectedCondition.series2,
                comparison: selectedCondition.comparison,
                requiresPrice: selectedCondition.requiresPrice,
                ...conditionConfig,
            },
            name: alertName || `${symbol} ${selectedIndicator} Alert`,
            message: message || '',
            webhookUrl: webhookUrl || null,
            frequency,
            created_at: alertToEdit?.created_at || new Date().toISOString(),
            status: 'Active',
            interval,
        };

        onSave(alert);
        onClose();
    };

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    if (!isOpen) return null;

    const isFormValid = selectedIndicator && selectedCondition;
    const placeholders = AVAILABLE_PLACEHOLDERS as any;
    const intervalOptions = ['1m', '3m', '5m', '15m', '30m', '45m', '1h', '2h', '4h', '1d', '1w', '1M'];

    return (
        <div className={styles.overlay} onClick={handleClose}>
            <div
                ref={focusTrapRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="indicator-alert-dialog-title"
                className={styles.dialog}
                onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <TrendingUp size={20} className={styles.headerIcon} />
                        <h2 id="indicator-alert-dialog-title" className={styles.title}>
                            Create Indicator Alert
                        </h2>
                    </div>
                    <button
                        className={styles.closeButton}
                        onClick={handleClose}
                        aria-label="Close indicator alert dialog"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {availableIndicators.length === 0 ? (
                        <div className={styles.emptyState}>
                            <Info size={24} />
                            <p>No indicators are currently active.</p>
                            <small>Add indicators to your chart to create indicator-based alerts.</small>
                        </div>
                    ) : (
                        <>
                            {/* Step 1: Select Indicator */}
                            <div className={styles.field}>
                                <label htmlFor="indicator-select" className={styles.label}>
                                    Indicator <span className={styles.required}>*</span>
                                </label>
                                <select
                                    id="indicator-select"
                                    className={styles.select}
                                    value={selectedIndicator}
                                    onChange={(e: ChangeEvent<HTMLSelectElement>) => handleIndicatorChange(e.target.value)}
                                >
                                    <option value="">Select an indicator...</option>
                                    {availableIndicators.map((ind) => (
                                        <option key={ind.id} value={ind.id}>
                                            {ind.name}
                                        </option>
                                    ))}
                                </select>
                                {selectedIndicator && (
                                    <small className={styles.fieldHint}>
                                        {(INDICATOR_ALERT_CONFIGS as any)[selectedIndicator]?.description}
                                    </small>
                                )}
                            </div>

                            {/* Step 2: Select Condition */}
                            {selectedIndicator && (
                                <div className={styles.field}>
                                    <label htmlFor="condition-select" className={styles.label}>
                                        Condition <span className={styles.required}>*</span>
                                    </label>
                                    <select
                                        id="condition-select"
                                        className={styles.select}
                                        value={selectedCondition?.id || ''}
                                        onChange={(e: ChangeEvent<HTMLSelectElement>) => handleConditionChange(e.target.value)}
                                    >
                                        <option value="">Select a condition...</option>
                                        {availableConditions.map((cond) => (
                                            <option key={cond.id} value={cond.id}>
                                                {cond.label}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedCondition && (
                                        <small className={styles.fieldHint}>{selectedCondition.description}</small>
                                    )}
                                </div>
                            )}

                            {/* Step 3: Configure Condition Parameters */}
                            {selectedCondition && (
                                <DynamicConditionConfig
                                    condition={selectedCondition as any}
                                    config={conditionConfig}
                                    onChange={setConditionConfig}
                                />
                            )}

                            {/* Divider */}
                            {selectedCondition && <div className={styles.divider} />}

                            {/* Alert Settings */}
                            {selectedCondition && (
                                <>
                                    <div className={styles.field}>
                                        <label htmlFor="alert-name" className={styles.label}>
                                            Alert Name
                                        </label>
                                        <input
                                            id="alert-name"
                                            type="text"
                                            className={styles.input}
                                            value={alertName}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setAlertName(e.target.value)}
                                            placeholder="My RSI Alert"
                                        />
                                    </div>

                                    <div className={styles.field}>
                                        <label htmlFor="alert-message" className={styles.label}>
                                            Message
                                            <button
                                                type="button"
                                                className={styles.placeholdersToggle}
                                                onClick={() => setShowPlaceholders(!showPlaceholders)}
                                            >
                                                {showPlaceholders ? 'Hide' : 'Show'} Placeholders
                                            </button>
                                        </label>
                                        <textarea
                                            id="alert-message"
                                            className={styles.textarea}
                                            value={message}
                                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                                            placeholder="{{symbol}} RSI crossed {{rsi}} at {{time}}"
                                            rows={3}
                                        />
                                        {showPlaceholders && (
                                            <div className={styles.placeholders}>
                                                <div className={styles.placeholderGroup}>
                                                    <strong>General:</strong>
                                                    {placeholders.general.map((p) => (
                                                        <code key={p.token} title={p.description}>
                                                            {p.token}
                                                        </code>
                                                    ))}
                                                </div>
                                                <div className={styles.placeholderGroup}>
                                                    <strong>Price:</strong>
                                                    {placeholders.price.map((p) => (
                                                        <code key={p.token} title={p.description}>
                                                            {p.token}
                                                        </code>
                                                    ))}
                                                </div>
                                                {selectedIndicator && placeholders.indicators[selectedIndicator] && (
                                                    <div className={styles.placeholderGroup}>
                                                        <strong>{(INDICATOR_ALERT_CONFIGS as any)[selectedIndicator].name}:</strong>
                                                        {placeholders.indicators[selectedIndicator].map((p) => (
                                                            <code key={p.token} title={p.description}>
                                                                {p.token}
                                                            </code>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.field}>
                                        <label htmlFor="alert-frequency" className={styles.label}>
                                            Frequency
                                        </label>
                                        <select
                                            id="alert-frequency"
                                            className={styles.select}
                                            value={frequency}
                                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setFrequency(e.target.value as Frequency)}
                                        >
                                            <option value="once_per_bar">Once Per Bar Close</option>
                                            <option value="every_time">Every Time Condition Meets</option>
                                        </select>
                                        <small className={styles.fieldHint}>
                                            {frequency === 'once_per_bar'
                                                ? 'Alert triggers once then removes itself'
                                                : 'Alert triggers every time condition is met'}
                                        </small>
                                    </div>

                                    <div className={styles.field}>
                                        <label htmlFor="alert-interval" className={styles.label}>
                                            Timeframe
                                        </label>
                                        <select
                                            id="alert-interval"
                                            className={styles.select}
                                            value={interval}
                                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setIntervalState(e.target.value)}
                                        >
                                            {intervalOptions.map((int) => (
                                                <option key={int} value={int}>
                                                    {int}
                                                </option>
                                            ))}
                                        </select>
                                        <small className={styles.fieldHint}>
                                            Alert checks will run on this timeframe
                                        </small>
                                    </div>

                                    <div className={styles.field}>
                                        <label htmlFor="alert-webhook" className={styles.label}>
                                            Webhook URL <span className={styles.optional}>(Optional)</span>
                                        </label>
                                        <input
                                            id="alert-webhook"
                                            type="url"
                                            className={styles.input}
                                            value={webhookUrl}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setWebhookUrl(e.target.value)}
                                            placeholder="https://your-webhook.com/endpoint"
                                        />
                                        <small className={styles.fieldHint}>
                                            HTTP POST request will be sent to this URL when alert triggers
                                        </small>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {availableIndicators.length > 0 && (
                    <div className={styles.footer}>
                        <button className={`${styles.button} ${styles.cancelButton}`} onClick={handleClose}>
                            Cancel
                        </button>
                        <button
                            className={`${styles.button} ${styles.saveButton}`}
                            onClick={handleSave}
                            disabled={!isFormValid}
                        >
                            Create Alert
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IndicatorAlertDialog;
