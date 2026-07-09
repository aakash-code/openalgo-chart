import React, { useCallback, useRef, useState, useEffect } from 'react';
import type { DragEvent, MouseEvent } from 'react';
import { X, GripVertical } from 'lucide-react';
import styles from './WatchlistItem.module.css';
import classNames from 'classnames';
import type { WatchlistItemData } from '../../types/watchlist';

const getFlagColor = (flag?: string): string => {
    switch (flag?.toLowerCase()) {
        case 'red': return '#ff5252';
        case 'green': return '#4caf50';
        case 'blue': return '#2196f3';
        case 'yellow': return '#ffeb3b';
        case 'orange': return '#ff9800';
        case 'purple': return '#9c27b0';
        default: return 'transparent';
    }
};

interface SymbolData {
    symbol: string;
    exchange: string;
}

interface ColumnWidths {
    symbol: number;
    last: number;
    chg: number;
    chgP: number;
}

export interface WatchlistItemProps {
    item: WatchlistItemData;
    isActive: boolean;
    isFocused: boolean;
    isDragging: boolean;
    columnWidths: ColumnWidths;
    minColumnWidth: number;
    sortEnabled: boolean;
    index: number;
    onSelect: (data: SymbolData) => void;
    onDoubleClick?: (data: SymbolData) => void;
    onRemove: (data: SymbolData) => void;
    onDragStart?: (e: DragEvent<HTMLDivElement>, index: number) => void;
    onDragOver?: (e: DragEvent<HTMLDivElement>, index: number) => void;
    onDragEnd?: () => void;
    onDrop?: (e: DragEvent<HTMLDivElement>, index: number) => void;
    onContextMenu?: (e: MouseEvent<HTMLDivElement>, item: WatchlistItemData, index: number) => void;
    onMouseEnter?: (e: MouseEvent<HTMLDivElement>, item: WatchlistItemData, rect?: DOMRect) => void;
    onMouseLeave?: () => void;
    onMouseMove?: (e: MouseEvent<HTMLDivElement>) => void;
}

/**
 * WatchlistItem - Individual symbol row in the watchlist
 */
const WatchlistItem: React.FC<WatchlistItemProps> = ({
    item,
    isActive,
    isFocused,
    isDragging,
    columnWidths,
    minColumnWidth,
    sortEnabled,
    index,
    onSelect,
    onDoubleClick,
    onRemove,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
    onContextMenu,
    onMouseEnter,
    onMouseLeave,
    onMouseMove,
}) => {
    const itemRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    // VIRTUAL WATCHLIST OPTIMIZATION: Only render full row when visible
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => setIsVisible(entry.isIntersecting),
            { threshold: 0.01, rootMargin: '200px' } 
        );
        if (itemRef.current) observer.observe(itemRef.current);
        return () => observer.disconnect();
    }, []);

    // Scroll into view when focused
    useEffect(() => {
        if (isFocused && itemRef.current) {
            itemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [isFocused]);

    const handleClick = useCallback((): void => {
        onSelect({ symbol: item.symbol, exchange: item.exchange });
    }, [item.symbol, item.exchange, onSelect]);

    const handleDoubleClick = useCallback((): void => {
        if (onDoubleClick) {
            onDoubleClick({ symbol: item.symbol, exchange: item.exchange });
        }
    }, [item.symbol, item.exchange, onDoubleClick]);

    const handleRemoveClick = useCallback((e: MouseEvent<HTMLButtonElement>): void => {
        e.stopPropagation();
        onRemove({ symbol: item.symbol, exchange: item.exchange });
    }, [item.symbol, item.exchange, onRemove]);

    const handleContextMenu = useCallback((e: MouseEvent<HTMLDivElement>): void => {
        e.preventDefault();
        if (onContextMenu) {
            onContextMenu(e, item, index);
        }
    }, [onContextMenu, item, index]);

    const handleMouseEnter = useCallback((e: MouseEvent<HTMLDivElement>): void => {
        if (onMouseEnter) {
            const rect = itemRef.current?.getBoundingClientRect();
            onMouseEnter(e, item, rect);
        }
    }, [onMouseEnter, item]);

    const handleMouseLeave = useCallback((): void => {
        if (onMouseLeave) {
            onMouseLeave();
        }
    }, [onMouseLeave]);

    const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>): void => {
        if (onMouseMove) {
            onMouseMove(e);
        }
    }, [onMouseMove]);

    // If item is off-screen, render a lightweight spacer to maintain scroll position
    // BUT always render the active item or focused item for accessibility
    if (!isVisible && !isActive && !isFocused && !isDragging) {
        return <div ref={itemRef} className={styles.item} style={{ height: '33px', opacity: 0 }} />;
    }

    return (
        <div
            ref={itemRef}
            className={classNames(styles.item, {
                [styles.active]: isActive,
                [styles.focused]: isFocused,
                [styles.dragging]: isDragging,
            })}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
            draggable={!sortEnabled}
            onDragStart={(e) => onDragStart?.(e, index)}
            onDragOver={(e) => onDragOver?.(e, index)}
            onDragEnd={onDragEnd}
            onDrop={(e) => onDrop?.(e, index)}
        >
            {/* Drag handle - visible on hover */}
            <div className={styles.dragHandle}>
                <GripVertical size={12} />
            </div>

            {/* Symbol name */}
            <span
                className={styles.symbolName}
                style={{ width: columnWidths.symbol, minWidth: columnWidths.symbol }}
            >
                {item.flag && (
                    <span 
                        className={styles.flag} 
                        style={{ backgroundColor: getFlagColor(item.flag) }}
                    />
                )}
                {item.symbol}
            </span>

            {/* Last price */}
            <span
                className={classNames(styles.last, {
                    [styles.up]: item.up,
                    [styles.down]: !item.up && item.chg !== 0,
                })}
                style={{ width: columnWidths.last, minWidth: minColumnWidth }}
            >
                {item.last}
            </span>

            {/* Change */}
            <span
                className={classNames(styles.chg, {
                    [styles.up]: item.up,
                    [styles.down]: !item.up && item.chg !== 0,
                })}
                style={{ width: columnWidths.chg, minWidth: minColumnWidth }}
            >
                {item.chg}
            </span>

            {/* Change % */}
            <span
                className={classNames(styles.chgP, {
                    [styles.up]: item.up,
                    [styles.down]: !item.up && item.chg !== 0,
                })}
                style={{ width: columnWidths.chgP, minWidth: minColumnWidth }}
            >
                {item.chgP}
            </span>

            {/* Remove button - appears on hover */}
            <button
                className={styles.removeBtn}
                onClick={handleRemoveClick}
                title="Remove from watchlist"
            >
                <X size={12} />
            </button>
        </div>
    );
};

// Optimized memoization: Only re-render if essential props change
export default React.memo(WatchlistItem, (prev, next) => {
    return (
        prev.isActive === next.isActive &&
        prev.isFocused === next.isFocused &&
        prev.isDragging === next.isDragging &&
        prev.item.last === next.item.last &&
        prev.item.chg === next.item.chg &&
        prev.item.flag === next.item.flag &&
        prev.columnWidths === next.columnWidths
    );
});
