/**
 * BaseDropdown - Reusable dropdown menu component
 *
 * Features:
 * - Absolute positioning relative to trigger
 * - Click outside to close
 * - Items with icons, labels, active states
 * - Keyboard navigation (Escape to close)
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { ReactNode, ComponentType, CSSProperties, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import styles from './BaseDropdown.module.css';

interface IconProps {
    size?: number;
    className?: string;
}

export interface DropdownItemProps {
    icon?: ComponentType<IconProps> | ReactNode;
    label?: ReactNode;
    onClick?: () => void;
    active?: boolean;
    disabled?: boolean;
    children?: ReactNode;
}

/**
 * DropdownItem - Individual dropdown option
 */
export const DropdownItem: React.FC<DropdownItemProps> = ({
    icon: Icon,
    label,
    onClick,
    active = false,
    disabled = false,
    children,
}) => (
    <div
        className={`${styles.item} ${active ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
        onClick={disabled ? undefined : onClick}
    >
        {Icon && (typeof Icon === 'function' ? <Icon size={16} className={styles.icon} /> : <span className={styles.icon}>{Icon}</span>)}
        {label && <span className={styles.label}>{label}</span>}
        {children}
    </div>
);

/**
 * DropdownDivider - Separator between sections
 */
export const DropdownDivider: React.FC = () => <div className={styles.divider} />;

export interface DropdownPosition {
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
}

export interface BaseDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    position?: DropdownPosition;
    children: ReactNode;
    width?: number;
    className?: string;
}

/**
 * BaseDropdown - Main dropdown component
 */
const BaseDropdown: React.FC<BaseDropdownProps> = ({
    isOpen,
    onClose,
    position,
    children,
    width = 180,
    className = '',
}) => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        const handleClickOutside = (e: globalThis.MouseEvent): void => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const style: CSSProperties = {
        ...position,
        minWidth: width,
    };

    return (
        <div
            ref={dropdownRef}
            className={`${styles.dropdown} ${className}`}
            style={style}
            onClick={(e: MouseEvent) => e.stopPropagation()}
        >
            {children}
        </div>
    );
};

export interface DropdownWithTriggerProps {
    trigger: ReactNode;
    children: ReactNode;
    width?: number;
    align?: 'left' | 'right';
}

/**
 * DropdownTrigger - Wrapper with built-in trigger button
 */
export const DropdownWithTrigger: React.FC<DropdownWithTriggerProps> = ({
    trigger,
    children,
    width = 180,
    align = 'left',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<DropdownPosition>({ top: 0, left: 0 });

    const handleToggle = useCallback((): void => {
        if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 4,
                ...(align === 'right'
                    ? { right: window.innerWidth - rect.right }
                    : { left: rect.left }
                ),
            });
        }
        setIsOpen(!isOpen);
    }, [isOpen, align]);

    return (
        <>
            <div ref={triggerRef} onClick={handleToggle}>
                {trigger}
            </div>
            {isOpen && createPortal(
                <>
                    <div className={styles.backdrop} onClick={() => setIsOpen(false)} />
                    <BaseDropdown
                        isOpen={isOpen}
                        onClose={() => setIsOpen(false)}
                        position={position}
                        width={width}
                    >
                        {children}
                    </BaseDropdown>
                </>,
                document.body
            )}
        </>
    );
};

export default BaseDropdown;
