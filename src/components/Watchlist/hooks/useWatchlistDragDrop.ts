/**
 * useWatchlistDragDrop Hook
 * Handles drag and drop logic for watchlist items and sections
 */
import { useState, useCallback } from 'react';

export interface WatchlistItem {
    symbol?: string;
    exchange?: string;
    isSection?: boolean;
    title?: string;
    [key: string]: any;
}

export interface UseWatchlistDragDropReturn {
    draggedIndex: number | null;
    draggedSection: string | null;
    handleDragStart: (e: React.DragEvent, index: number) => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDragEnd: () => void;
    handleDrop: (e: React.DragEvent, dropIndex: number) => void;
    handleSectionDragStart: (e: React.DragEvent, sectionTitle: string, sectionIdx: number) => void;
    handleSectionDragEnd: () => void;
    handleSectionDrop: (e: React.DragEvent, sectionIndex: number) => void;
}

/**
 * Hook for managing watchlist drag and drop
 */
export const useWatchlistDragDrop = (
    items: WatchlistItem[],
    onReorder?: (items: WatchlistItem[]) => void
): UseWatchlistDragDropReturn => {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [draggedSection, setDraggedSection] = useState<string | null>(null);

    // Item drag handlers
    const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData('text/plain', index.toString());
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
    }, []);

    const handleDragEnd = useCallback(() => {
        setDraggedIndex(null);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        e.stopPropagation();

        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            return;
        }

        const newItems = [...items];
        const [draggedItem] = newItems.splice(draggedIndex, 1);
        newItems.splice(dropIndex, 0, draggedItem);

        if (onReorder) onReorder(newItems);
        setDraggedIndex(null);
    }, [draggedIndex, items, onReorder]);

    // Section drag handlers
    const handleSectionDragStart = useCallback((e: React.DragEvent, sectionTitle: string, sectionIdx: number) => {
        setDraggedSection(sectionTitle);
        setDraggedIndex(sectionIdx);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData('text/plain', sectionIdx.toString());
    }, []);

    const handleSectionDragEnd = useCallback(() => {
        setDraggedSection(null);
        setDraggedIndex(null);
    }, []);

    const handleSectionDrop = useCallback((e: React.DragEvent, sectionIndex: number) => {
        e.preventDefault();
        e.stopPropagation();

        const data = e.dataTransfer.getData('text/plain');
        const draggedIdx = parseInt(data, 10);

        if (isNaN(draggedIdx) || draggedIdx === sectionIndex) {
            setDraggedIndex(null);
            setDraggedSection(null);
            return;
        }

        const newItems = [...items];
        const [draggedItem] = newItems.splice(draggedIdx, 1);

        const insertIndex = draggedIdx < sectionIndex ? sectionIndex : sectionIndex + 1;
        newItems.splice(insertIndex, 0, draggedItem);

        if (onReorder) onReorder(newItems);
        setDraggedIndex(null);
        setDraggedSection(null);
    }, [items, onReorder]);

    return {
        draggedIndex,
        draggedSection,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        handleDrop,
        handleSectionDragStart,
        handleSectionDragEnd,
        handleSectionDrop,
    };
};

export default useWatchlistDragDrop;
