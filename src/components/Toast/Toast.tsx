import React from 'react';
import type { ReactNode } from 'react';
import styles from './Toast.module.css';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'error' | 'success' | 'info' | 'warning';

interface ToastAction {
    label: string;
    onClick: () => void;
}

export interface ToastProps {
    message: string;
    type?: ToastType;
    onClose: () => void;
    action?: ToastAction;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'error', onClose, action }) => {
    const icons: Record<ToastType, ReactNode> = {
        error: <AlertCircle size={20} aria-hidden="true" />,
        success: <CheckCircle size={20} aria-hidden="true" />,
        info: <Info size={20} aria-hidden="true" />,
        warning: <AlertTriangle size={20} aria-hidden="true" />
    };

    // Errors and warnings should be assertive (interrupt immediately)
    // Success and info should be polite (wait for pause)
    const ariaLive = (type === 'error' || type === 'warning') ? 'assertive' : 'polite';

    // Get accessible label based on type
    const typeLabel: Record<ToastType, string> = {
        error: 'Error',
        success: 'Success',
        info: 'Information',
        warning: 'Warning'
    };

    return (
        <div
            role="alert"
            aria-live={ariaLive}
            aria-atomic="true"
            className={`${styles.toast} ${styles[type]}`}
        >
            <div className={styles.icon}>{icons[type]}</div>
            <div className={styles.content}>
                {/* Screen reader prefix for context */}
                <span className="sr-only">{typeLabel[type]}: </span>
                <div className={styles.message}>{message}</div>
                {action && (
                    <button className={styles.actionBtn} onClick={action.onClick}>
                        {action.label}
                    </button>
                )}
            </div>
            <button
                className={styles.closeBtn}
                onClick={onClose}
                aria-label="Dismiss notification"
            >
                <X size={16} aria-hidden="true" />
            </button>
        </div>
    );
};

export default Toast;
