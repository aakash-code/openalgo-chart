import React from 'react';
import styles from './ConfirmDialog.module.css';

/**
 * ConfirmDialog - Centered confirmation modal
 * 
 * @param {boolean} isOpen - Whether the dialog is visible
 * @param {string} title - Dialog title
 * @param {string} message - Confirmation message
 * @param {function} onConfirm - Called when user clicks confirm
 * @param {function} onCancel - Called when user clicks cancel
 * @param {string} confirmText - Confirm button text (default: "Confirm")
 * @param {string} cancelText - Cancel button text (default: "Cancel")
 * @param {boolean} danger - If true, confirm button is red (for destructive actions)
 */
const ConfirmDialog = ({
    isOpen,
    title = 'Confirm',
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = false
}) => {
    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onCancel();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onCancel();
        } else if (e.key === 'Enter') {
            onConfirm();
        }
    };

    return (
        <div
            className={styles.overlay}
            onClick={handleOverlayClick}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
        >
            <div className={styles.dialog} role="alertdialog" aria-modal="true">
                <div className={styles.header}>
                    <h3 className={styles.title}>{title}</h3>
                </div>
                <div className={styles.body}>
                    <p className={styles.message}>{message}</p>
                </div>
                <div className={styles.footer}>
                    <button
                        className={styles.cancelBtn}
                        onClick={onCancel}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`${styles.confirmBtn} ${danger ? styles.danger : ''}`}
                        onClick={onConfirm}
                        autoFocus
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
