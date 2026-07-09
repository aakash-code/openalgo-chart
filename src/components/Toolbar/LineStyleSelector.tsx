import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import styles from './LineStyleSelector.module.css';
import { LINE_STYLES } from '../../hooks/useDrawingProperties';
import { ChevronDown } from 'lucide-react';

export interface LineStyleSelectorProps {
    value: number;
    onChange: (value: number) => void;
    label?: string;
}

/**
 * Line style selector with visual previews
 */
const LineStyleSelector: React.FC<LineStyleSelectorProps> = ({ value, onChange, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentStyle = LINE_STYLES.find(s => s.value === value) || LINE_STYLES[0];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent): void => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = useCallback((styleValue: number): void => {
        onChange(styleValue);
        setIsOpen(false);
    }, [onChange]);

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>): void => {
        if (e.key === 'Escape') {
            setIsOpen(false);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
        } else if (e.key === 'ArrowDown' && isOpen) {
            e.preventDefault();
            const currentIndex = LINE_STYLES.findIndex(s => s.value === value);
            const nextIndex = (currentIndex + 1) % LINE_STYLES.length;
            onChange(LINE_STYLES[nextIndex].value);
        } else if (e.key === 'ArrowUp' && isOpen) {
            e.preventDefault();
            const currentIndex = LINE_STYLES.findIndex(s => s.value === value);
            const prevIndex = (currentIndex - 1 + LINE_STYLES.length) % LINE_STYLES.length;
            onChange(LINE_STYLES[prevIndex].value);
        }
    }, [isOpen, value, onChange]);

    /**
     * Render SVG line preview based on pattern
     */
    const renderLinePreview = (pattern: number[], isSelected = false): React.ReactElement => {
        const color = isSelected ? 'var(--tv-color-brand)' : 'var(--tv-color-text-primary)';
        const dashArray = pattern.length > 0 ? pattern.join(' ') : 'none';

        return (
            <svg
                width="60"
                height="12"
                viewBox="0 0 60 12"
                className={styles.linePreview}
            >
                <line
                    x1="0"
                    y1="6"
                    x2="60"
                    y2="6"
                    stroke={color}
                    strokeWidth="2"
                    strokeDasharray={dashArray}
                />
            </svg>
        );
    };

    return (
        <div className={styles.container} ref={containerRef}>
            {label && <span className={styles.label}>{label}</span>}
            <button
                type="button"
                className={styles.selector}
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                aria-label={`Line style: ${currentStyle.label}`}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <div className={styles.selectedValue}>
                    {renderLinePreview(currentStyle.pattern, true)}
                    <span className={styles.styleName}>{currentStyle.label}</span>
                </div>
                <ChevronDown
                    size={14}
                    className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                />
            </button>

            {isOpen && (
                <div
                    className={styles.dropdown}
                    role="listbox"
                    aria-label="Line style options"
                >
                    {LINE_STYLES.map((style) => (
                        <button
                            key={style.value}
                            type="button"
                            className={`${styles.option} ${value === style.value ? styles.optionActive : ''}`}
                            onClick={() => handleSelect(style.value)}
                            role="option"
                            aria-selected={value === style.value}
                        >
                            {renderLinePreview(style.pattern, value === style.value)}
                            <span className={styles.optionLabel}>{style.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LineStyleSelector;
