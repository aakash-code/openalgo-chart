import React, { ElementType, HTMLAttributes } from 'react';
import classNames from 'classnames';
import styles from './Text.module.css';

export interface TextProps extends HTMLAttributes<HTMLElement> {
    as?: ElementType;
    variant?: 'h1' | 'h2' | 'h3' | 'body' | 'body-sm' | 'caption' | 'label';
    color?: 'primary' | 'secondary' | 'muted' | 'brand' | 'success' | 'danger';
    weight?: 'normal' | 'medium' | 'semibold' | 'bold';
    align?: 'left' | 'center' | 'right';
    noWrap?: boolean;
}

export const Text: React.FC<TextProps> = ({
    as,
    children,
    className,
    variant = 'body',
    color = 'primary',
    weight,
    align,
    noWrap = false,
    ...props
}) => {
    const Component = as || (variant.startsWith('h') ? variant : 'p') as ElementType;

    return (
        <Component
            className={classNames(
                styles.text,
                styles[variant],
                styles[`color-${color}`],
                weight && styles[`weight-${weight}`],
                align && styles[`align-${align}`],
                { [styles.noWrap]: noWrap },
                className
            )}
            {...props}
        >
            {children}
        </Component>
    );
};
