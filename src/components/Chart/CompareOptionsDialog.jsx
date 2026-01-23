import React, { useState, useEffect, useRef } from 'react';
import styles from './CompareOptionsDialog.module.css';

// Scale Mode Icons
const SamePercentIcon = () => (
    <svg viewBox="0 0 28 28" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="4" width="20" height="16" rx="2" />
        <line x1="24" y1="6" x2="24" y2="18" strokeWidth="2" />
        <path d="M8 14 L12 10 L16 12 L20 8" strokeWidth="1.5" />
        <path d="M8 16 L12 14 L16 15 L20 11" strokeWidth="1.5" strokeDasharray="2,2" />
        <text x="25" y="12" fontSize="6" fill="currentColor" stroke="none">%</text>
    </svg>
);

const NewPriceScaleIcon = () => (
    <svg viewBox="0 0 28 28" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="4" width="20" height="16" rx="2" />
        <line x1="4" y1="6" x2="4" y2="18" strokeWidth="2" />
        <line x1="24" y1="6" x2="24" y2="18" strokeWidth="2" />
        <path d="M8 14 L12 10 L16 12 L20 8" strokeWidth="1.5" />
        <path d="M8 16 L12 14 L16 15 L20 11" strokeWidth="1.5" strokeDasharray="2,2" />
    </svg>
);

const NewPaneIcon = () => (
    <svg viewBox="0 0 28 28" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="4" width="20" height="8" rx="2" />
        <rect x="4" y="14" width="20" height="8" rx="2" />
        <path d="M8 8 L12 6 L16 7 L20 5" strokeWidth="1.5" />
        <path d="M8 18 L12 16 L16 17 L20 15" strokeWidth="1.5" strokeDasharray="2,2" />
    </svg>
);

/**
 * CompareOptionsDialog - TradingView-style dialog for choosing how to display comparison symbol
 * Options:
 * - Same % scale: Show on same axis with percentage scale
 * - New price scale: Show on a separate price scale
 * - New pane: Show in a separate pane below
 */
const CompareOptionsDialog = ({
    visible,
    symbol,
    exchange,
    symbolColor,
    onConfirm,
    onCancel
}) => {
    const [selectedMode, setSelectedMode] = useState('samePercent');
    const dialogRef = useRef(null);

    // Reset selection when dialog opens
    useEffect(() => {
        if (visible) {
            setSelectedMode('samePercent');
        }
    }, [visible]);

    // Handle escape key
    useEffect(() => {
        if (!visible) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onCancel();
            } else if (e.key === 'Enter') {
                onConfirm(selectedMode);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [visible, onCancel, onConfirm, selectedMode]);

    // Focus trap
    useEffect(() => {
        if (visible && dialogRef.current) {
            dialogRef.current.focus();
        }
    }, [visible]);

    if (!visible) return null;

    const options = [
        {
            id: 'samePercent',
            label: 'Same % scale',
            description: 'Compare using percentage change on the same axis',
            icon: <SamePercentIcon />
        },
        {
            id: 'newPriceScale',
            label: 'New price scale',
            description: 'Show on a separate price scale (left axis)',
            icon: <NewPriceScaleIcon />
        },
        {
            id: 'newPane',
            label: 'New pane',
            description: 'Show in a separate pane below the chart',
            icon: <NewPaneIcon />
        }
    ];

    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div
                ref={dialogRef}
                className={styles.dialog}
                onClick={(e) => e.stopPropagation()}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby="compare-dialog-title"
            >
                {/* Header */}
                <div className={styles.header}>
                    <h3 id="compare-dialog-title" className={styles.title}>Compare symbol</h3>
                    <button className={styles.closeBtn} onClick={onCancel} aria-label="Close">
                        <svg viewBox="0 0 18 18" width="18" height="18" fill="currentColor">
                            <path d="M9 7.586L14.293 2.293a1 1 0 1 1 1.414 1.414L10.414 9l5.293 5.293a1 1 0 0 1-1.414 1.414L9 10.414l-5.293 5.293a1 1 0 0 1-1.414-1.414L7.586 9 2.293 3.707a1 1 0 0 1 1.414-1.414L9 7.586z" />
                        </svg>
                    </button>
                </div>

                {/* Symbol Info */}
                <div className={styles.symbolInfo}>
                    <div
                        className={styles.symbolIcon}
                        style={{ backgroundColor: symbolColor || '#2196F3' }}
                    >
                        {symbol?.charAt(0) || 'S'}
                    </div>
                    <div className={styles.symbolDetails}>
                        <span className={styles.symbolName}>{symbol}</span>
                        <span className={styles.symbolExchange}>{exchange}</span>
                    </div>
                </div>

                {/* Options */}
                <div className={styles.optionsContainer}>
                    {options.map((option) => (
                        <button
                            key={option.id}
                            className={`${styles.optionItem} ${selectedMode === option.id ? styles.optionSelected : ''}`}
                            onClick={() => setSelectedMode(option.id)}
                        >
                            <div className={styles.optionIcon}>{option.icon}</div>
                            <div className={styles.optionContent}>
                                <span className={styles.optionLabel}>{option.label}</span>
                                <span className={styles.optionDescription}>{option.description}</span>
                            </div>
                            <div className={styles.radioCircle}>
                                {selectedMode === option.id && <div className={styles.radioFill} />}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <button className={styles.cancelBtn} onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        className={styles.confirmBtn}
                        onClick={() => onConfirm(selectedMode)}
                    >
                        Add symbol
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompareOptionsDialog;
