import React, { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import styles from './AlertDialog.module.css';
import { Bell, Volume2, AlertTriangle, Info } from 'lucide-react';
import { BaseModal, BaseButton } from '../shared';

type AlertCondition = 'Crossing' | 'Crossing Up' | 'Crossing Down' | 'Greater Than' | 'Less Than';

interface AlertData {
    condition: AlertCondition;
    value: string;
    name: string | null;
    enableSound: boolean;
    enablePush: boolean;
}

export interface AlertDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: AlertData) => void;
    initialPrice?: number;
    symbol?: string;
    theme?: 'dark' | 'light';
}

const AlertDialog: React.FC<AlertDialogProps> = ({
    isOpen,
    onClose,
    onSave,
    initialPrice,
    symbol,
    theme = 'dark'
}) => {
    const [condition, setCondition] = useState<AlertCondition>('Crossing');
    const [value, setValue] = useState('');
    const [alertName, setAlertName] = useState('');
    const [enableSound, setEnableSound] = useState(true);
    const [enablePush, setEnablePush] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && initialPrice) {
            setValue(initialPrice.toString());
            setAlertName('');
            setError('');
        }
    }, [isOpen, initialPrice]);

    // Validate input
    const validateInput = (): boolean => {
        const numValue = parseFloat(value);

        if (!value || value.trim() === '') {
            setError('Please enter a price value');
            return false;
        }

        if (isNaN(numValue)) {
            setError('Please enter a valid number');
            return false;
        }

        if (numValue <= 0) {
            setError('Price must be greater than 0');
            return false;
        }

        if (numValue > 10000000) {
            setError('Price must be less than 1 crore');
            return false;
        }

        setError('');
        return true;
    };

    const handleSave = (): void => {
        if (!validateInput()) return;

        onSave({
            condition,
            value,
            name: alertName.trim() || null,
            enableSound,
            enablePush,
        });
        onClose();
    };

    // Get condition description
    const getConditionDesc = (): string => {
        const numValue = parseFloat(value) || 0;
        switch (condition) {
            case 'Crossing': return `Triggers when price crosses ${numValue}`;
            case 'Crossing Up': return `Triggers when price crosses above ${numValue}`;
            case 'Crossing Down': return `Triggers when price crosses below ${numValue}`;
            case 'Greater Than': return `Triggers when price is above ${numValue}`;
            case 'Less Than': return `Triggers when price is below ${numValue}`;
            default: return '';
        }
    };

    if (!isOpen) return null;

    const footer = (
        <>
            <BaseButton
                variant="secondary"
                onClick={onClose}
            >
                Cancel
            </BaseButton>
            <BaseButton
                variant="primary"
                onClick={handleSave}
                disabled={!!error}
            >
                Create Alert
            </BaseButton>
        </>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bell size={18} />
                    <span>Create Alert {symbol && <span className={styles.symbol}>{symbol}</span>}</span>
                </div>
            }
            footer={footer}
            size="small"
        >
            <div className={styles.content}>
                <div className={styles.field}>
                    <label htmlFor="alert-name" className={styles.label}>Alert Name (optional)</label>
                    <input
                        id="alert-name"
                        type="text"
                        className={styles.input}
                        value={alertName}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setAlertName(e.target.value)}
                        placeholder="e.g., Support Level"
                        maxLength={50}
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="alert-condition" className={styles.label}>Condition</label>
                    <select
                        id="alert-condition"
                        className={styles.select}
                        value={condition}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setCondition(e.target.value as AlertCondition)}
                    >
                        <option value="Crossing">Crossing</option>
                        <option value="Crossing Up">Crossing Up</option>
                        <option value="Crossing Down">Crossing Down</option>
                        <option value="Greater Than">Greater Than</option>
                        <option value="Less Than">Less Than</option>
                    </select>
                </div>
                <div className={styles.field}>
                    <label htmlFor="alert-value" className={styles.label}>Price</label>
                    <input
                        id="alert-value"
                        type="number"
                        className={`${styles.input} ${error ? styles.inputError : ''}`}
                        value={value}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            setValue(e.target.value);
                            if (error) setError('');
                        }}
                        step="0.01"
                        min="0.01"
                        placeholder="Enter price"
                    />
                    {error && (
                        <div className={styles.errorMessage}>
                            <AlertTriangle size={14} />
                            {error}
                        </div>
                    )}
                </div>

                {value && !error && (
                    <div className={styles.conditionPreview}>
                        <Info size={14} style={{ marginRight: '6px' }} />
                        {getConditionDesc()}
                    </div>
                )}

                <div className={styles.notificationSection}>
                    <label className={styles.sectionLabel}>Notifications</label>
                    <div className={styles.notificationOptions}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={enableSound}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setEnableSound(e.target.checked)}
                            />
                            <div className={styles.checkboxCustom} />
                            <Volume2 size={16} />
                            Sound
                        </label>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={enablePush}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setEnablePush(e.target.checked)}
                            />
                            <div className={styles.checkboxCustom} />
                            <Bell size={16} />
                            Push
                        </label>
                    </div>
                </div>
            </div>
        </BaseModal>
    );
};

export default AlertDialog;
