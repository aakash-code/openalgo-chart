/**
 * useColumnResize Hook
 * Handles column resizing logic for watchlist
 */
import { useState, useCallback, useRef, useEffect } from 'react';

export interface ColumnWidths {
    symbol: number;
    last: number;
    chg: number;
    chgP: number;
    [key: string]: number;
}

export const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
    symbol: 80,
    last: 65,
    chg: 55,
    chgP: 55
};

export const MIN_COLUMN_WIDTH = 40;

export interface UseColumnResizeReturn {
    columnWidths: ColumnWidths;
    setColumnWidths: React.Dispatch<React.SetStateAction<ColumnWidths>>;
    resizing: string | null;
    handleResizeStart: (e: React.MouseEvent, column: string) => void;
    MIN_COLUMN_WIDTH: number;
}

/**
 * Hook for managing column resizing
 */
export const useColumnResize = (initialWidths: ColumnWidths = DEFAULT_COLUMN_WIDTHS): UseColumnResizeReturn => {
    const [columnWidths, setColumnWidths] = useState<ColumnWidths>(initialWidths);
    const [resizing, setResizing] = useState<string | null>(null);
    const startXRef = useRef<number>(0);
    const startWidthRef = useRef<number>(0);

    const handleResizeStart = useCallback((e: React.MouseEvent, column: string) => {
        e.preventDefault();
        e.stopPropagation();
        setResizing(column);
        startXRef.current = e.clientX;
        startWidthRef.current = columnWidths[column];
    }, [columnWidths]);

    useEffect(() => {
        if (!resizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const diff = e.clientX - startXRef.current;
            const newWidth = Math.max(MIN_COLUMN_WIDTH, startWidthRef.current + diff);
            setColumnWidths(prev => ({
                ...prev,
                [resizing]: newWidth
            }));
        };

        const handleMouseUp = () => {
            setResizing(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizing]);

    return {
        columnWidths,
        setColumnWidths,
        resizing,
        handleResizeStart,
        MIN_COLUMN_WIDTH,
    };
};

export default useColumnResize;
