/**
 * BaseDialog - Reusable confirmation/alert dialog
 *
 * Built on top of BaseModal for consistent styling.
 * Features:
 * - Confirm/Cancel buttons
 * - Danger mode for destructive actions
 * - Enter key to confirm, Escape to cancel
 * - Alert mode (single OK button)
 */

import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import BaseModal from '../Modal/BaseModal';
import styles from './BaseDialog.module.css';

type DialogIconType = 'warning' | 'info' | 'success' | 'error' | 'danger';

const ICONS: Record<DialogIconType, LucideIcon> = {
    warning: AlertTriangle,
    info: Info,
    success: CheckCircle,
    error: XCircle,
    danger: AlertTriangle,
};

export interface BaseDialogProps {
    isOpen: boolean;
    title?: string;
    message?: ReactNode;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    icon?: DialogIconType | null;
    showCancel?: boolean;
    loading?: boolean;
    children?: ReactNode;
}

const BaseDialog: React.FC<BaseDialogProps> = ({
    isOpen,
    title = 'Confirm',
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = false,
    icon = null,
    showCancel = true,
    loading = false,
    children = null,
}) => {
    // Handle Enter key to confirm
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent): void => {
            if (e.key === 'Enter' && !loading) {
                onConfirm?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onConfirm, loading]);

    const IconComponent = icon ? ICONS[icon] : null;
    const iconColor = danger ? styles.iconDanger :
        icon === 'success' ? styles.iconSuccess :
            icon === 'error' ? styles.iconError :
                styles.iconDefault;

    const footer = (
        <>
            {showCancel && (
                <button
                    className={styles.cancelBtn}
                    onClick={onCancel}
                    disabled={loading}
                    type="button"
                >
                    {cancelText}
                </button>
            )}
            <button
                className={`${styles.confirmBtn} ${danger ? styles.danger : ''}`}
                onClick={onConfirm}
                disabled={loading}
                autoFocus
                type="button"
            >
                {loading ? 'Processing...' : confirmText}
            </button>
        </>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onCancel ?? (() => {})}
            title={title}
            size="small"
            footer={footer}
        >
            <div className={styles.content}>
                {IconComponent && (
                    <div className={`${styles.icon} ${iconColor}`}>
                        <IconComponent size={32} />
                    </div>
                )}
                {message && (
                    <p className={styles.message}>{message}</p>
                )}
                {children}
            </div>
        </BaseModal>
    );
};

export default BaseDialog;

/**
 * ConfirmDialog - Convenience alias for confirm dialogs
 */
export const ConfirmDialog: React.FC<BaseDialogProps> = (props) => <BaseDialog {...props} />;

/**
 * AlertDialog - Single button alert dialog
 */
export interface AlertDialogProps extends Omit<BaseDialogProps, 'onConfirm' | 'onCancel' | 'confirmText' | 'showCancel'> {
    onClose?: () => void;
    okText?: string;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({ onClose, okText = 'OK', ...props }) => (
    <BaseDialog
        {...props}
        onConfirm={onClose}
        onCancel={onClose}
        confirmText={okText}
        showCancel={false}
    />
);

/**
 * DangerDialog - Destructive action confirmation
 */
export const DangerDialog: React.FC<BaseDialogProps> = (props) => (
    <BaseDialog {...props} danger icon="danger" />
);
