/**
 * BaseButton - Reusable button component with variants
 *
 * Variants:
 * - primary: Blue accent button
 * - secondary: Neutral/ghost button
 * - danger: Red destructive action
 * - buy: Green trading buy button
 * - sell: Red trading sell button
 *
 * Sizes: small, medium, large
 */

import React from 'react';
import type { ComponentType, ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './BaseButton.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'buy' | 'sell' | 'ghost';
type ButtonSize = 'small' | 'medium' | 'large';

interface IconProps {
    size?: number;
    className?: string;
}

export interface BaseButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
    children?: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    icon?: ComponentType<IconProps> | null;
    iconPosition?: 'left' | 'right';
    type?: 'button' | 'submit' | 'reset';
    className?: string;
}

const BaseButton: React.FC<BaseButtonProps> = ({
    children,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    fullWidth = false,
    icon: Icon = null,
    iconPosition = 'left',
    type = 'button',
    className = '',
    onClick,
    ...props
}) => {
    const variantClass = styles[variant] || styles.primary;
    const sizeClass = styles[size] || styles.medium;

    const buttonClasses = [
        styles.button,
        variantClass,
        sizeClass,
        fullWidth ? styles.fullWidth : '',
        loading ? styles.loading : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <button
            type={type}
            className={buttonClasses}
            disabled={disabled || loading}
            onClick={onClick}
            {...props}
        >
            {loading && <span className={styles.spinner} />}
            {Icon && iconPosition === 'left' && !loading && (
                <Icon size={size === 'small' ? 14 : size === 'large' ? 18 : 16} className={styles.icon} />
            )}
            {children && <span className={styles.label}>{children}</span>}
            {Icon && iconPosition === 'right' && !loading && (
                <Icon size={size === 'small' ? 14 : size === 'large' ? 18 : 16} className={styles.icon} />
            )}
        </button>
    );
};

/**
 * IconButton - Button with only an icon (no text)
 */
export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
    icon: ComponentType<IconProps>;
    size?: ButtonSize;
    variant?: ButtonVariant;
    tooltip?: string;
    className?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
    icon: Icon,
    size = 'medium',
    variant = 'ghost',
    tooltip,
    className = '',
    ...props
}) => {
    const iconSize = size === 'small' ? 16 : size === 'large' ? 22 : 18;

    return (
        <button
            type="button"
            className={`${styles.iconButton} ${styles[variant]} ${styles[size]} ${className}`}
            title={tooltip}
            {...props}
        >
            <Icon size={iconSize} />
        </button>
    );
};

/**
 * ButtonGroup - Container for grouped buttons
 */
export interface ButtonGroupProps {
    children: ReactNode;
    className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, className = '' }) => (
    <div className={`${styles.buttonGroup} ${className}`}>
        {children}
    </div>
);

export default BaseButton;
