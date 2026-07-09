/**
 * BaseModal - Reusable modal wrapper component
 *
 * Extracts common patterns from existing modals:
 * - Overlay with click-outside-to-close
 * - Escape key to close
 * - Conditional rendering based on isOpen
 * - Header with title and close button
 * - Optional footer
 */

import React, { useEffect, useCallback } from 'react';
import type { ReactNode, MouseEvent } from 'react';
import { X } from 'lucide-react';
import styles from './BaseModal.module.css';

type ModalSize = 'small' | 'medium' | 'large' | 'full';

export interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: ReactNode;
    children: ReactNode;
    className?: string;
    size?: ModalSize;
    showHeader?: boolean;
    showCloseButton?: boolean;
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
    noPadding?: boolean;
    footer?: ReactNode;
    headerRight?: ReactNode;
    contentClassName?: string;
}

const BaseModal: React.FC<BaseModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    className = '',
    size = 'medium',
    showHeader = true,
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    noPadding = false,
    footer = null,
    headerRight = null,
    contentClassName = '',
}) => {
    // Handle Escape key
    useEffect(() => {
        if (!closeOnEscape) return;

        const handleEscape = (e: KeyboardEvent): void => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose, closeOnEscape]);

    // Handle overlay click
    const handleOverlayClick = useCallback((e: MouseEvent<HTMLDivElement>): void => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
            onClose();
        }
    }, [closeOnOverlayClick, onClose]);

    // Don't render if not open
    if (!isOpen) return null;

    const sizeClass = styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`] || '';

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div
                className={`${styles.modal} ${sizeClass} ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {showHeader && (
                    <div className={styles.header}>
                        {title && <h2 className={styles.title}>{title}</h2>}
                        <div className={styles.headerRight}>
                            {headerRight}
                            {showCloseButton && (
                                <button
                                    className={styles.closeButton}
                                    onClick={onClose}
                                    type="button"
                                    aria-label="Close modal"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className={`${styles.content} ${noPadding ? styles.noPadding : ''} ${contentClassName}`}>
                    {children}
                </div>

                {footer && (
                    <div className={styles.footer}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BaseModal;
