/**
 * HighlightText Component
 * Highlights matching text in search results
 */
import React from 'react';
import styles from '../SymbolSearch.module.css';

/**
 * Escape special regex characters to prevent crashes
 */
const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface HighlightTextProps {
    text: string;
    highlight?: string;
}

/**
 * Highlight matching text
 */
export const HighlightText: React.FC<HighlightTextProps> = ({ text, highlight }) => {
    if (!highlight || !text) return <>{text}</>;

    const regex = new RegExp(`(${escapeRegex(highlight)})`, 'gi');
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <span key={i} className={styles.highlight}>{part}</span>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    );
};

export default HighlightText;
