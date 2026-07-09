import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import classNames from 'classnames';
import { Loader2 } from 'lucide-react';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
    iconOnly?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
    children,
    className,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    disabled,
    fullWidth = false,
    iconOnly = false,
    ...props
}, ref) => {
    return (
        <button
            ref={ref}
            className={classNames(
                styles.button,
                styles[variant],
                styles[size],
                {
                    [styles.loading]: isLoading,
                    [styles.fullWidth]: fullWidth,
                    [styles.iconOnly]: iconOnly
                },
                className
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <Loader2 className={styles.spin} size={size === 'sm' ? 14 : 18} />
            ) : leftIcon ? (
                <span className={styles.icon}>{leftIcon}</span>
            ) : null}

            {(!iconOnly || (!isLoading && !leftIcon && !rightIcon)) && children}

            {!isLoading && rightIcon && (
                <span className={styles.icon}>{rightIcon}</span>
            )}
        </button>
    );
});

Button.displayName = 'Button';
