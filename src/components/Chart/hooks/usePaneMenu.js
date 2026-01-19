/**
 * usePaneMenu Hook
 * Handles pane context menu operations (maximize, collapse, move, delete)
 */

import { useState, useCallback } from 'react';

/**
 * Custom hook for managing pane context menu and pane operations
 * @param {Object} options - Hook options
 * @param {React.RefObject} options.chartRef - Reference to the chart instance
 * @param {React.RefObject} options.indicatorPanesMap - Map of indicator IDs to pane instances
 * @param {Function} options.onIndicatorRemove - Callback when indicator is removed
 * @returns {Object} Pane menu state and handlers
 */
export const usePaneMenu = ({ chartRef, chartContainerRef, indicatorPanesMap, onIndicatorRemove, onIndicatorMoveUp }) => {
    // Pane context menu state
    const [paneContextMenu, setPaneContextMenu] = useState({
        show: false,
        x: 0,
        y: 0,
        paneId: null
    });

    // Track maximized and collapsed panes
    const [maximizedPane, setMaximizedPane] = useState(null);
    const [collapsedPanes, setCollapsedPanes] = useState(new Set());

    // Show pane context menu
    const handlePaneMenu = useCallback((paneId, x, y) => {
        setPaneContextMenu({ show: true, x, y, paneId });
    }, []);

    // Close pane context menu
    const closePaneMenu = useCallback(() => {
        setPaneContextMenu({ show: false, x: 0, y: 0, paneId: null });
    }, []);

    // Maximize/Restore pane
    const handleMaximizePane = useCallback((paneId) => {
        if (!chartRef.current || !chartContainerRef?.current) return;

        try {
            const allPanes = chartRef.current.panes ? chartRef.current.panes() : [];
            if (allPanes.length <= 1) return; // Only main pane, nothing to maximize

            const totalHeight = chartContainerRef.current.clientHeight;

            if (maximizedPane === paneId) {
                // RESTORE: Set indicator panes to default and main pane to remaining space
                let usedHeight = 0;

                // First, reset all indicator panes (index > 0)
                allPanes.forEach((pane, index) => {
                    if (index === 0) return; // Skip main pane for now
                    try {
                        const defaultHeight = 100; // Default indicator height
                        pane.setHeight(defaultHeight);
                        usedHeight += defaultHeight;
                    } catch (e) { /* ignore */ }
                });

                // Then set main pane to fill remaining space
                try {
                    // Ensure main pane has at least some height
                    const mainHeight = Math.max(100, totalHeight - usedHeight);
                    allPanes[0].setHeight(mainHeight);
                } catch (e) { /* ignore */ }

                setMaximizedPane(null);
            } else {
                // MAXIMIZE: Expand target pane to full height, collapse others
                const targetPane = indicatorPanesMap.current.get(paneId);
                if (!targetPane) return;

                allPanes.forEach((pane) => {
                    try {
                        if (pane === targetPane) {
                            pane.setHeight(totalHeight); // Take full height
                        } else {
                            pane.setHeight(0); // Collapse completely (including main pane)
                        }
                    } catch (e) { /* ignore */ }
                });
                setMaximizedPane(paneId);
            }
        } catch (e) {
            console.warn('Error maximizing pane:', e);
        }
    }, [chartRef, chartContainerRef, indicatorPanesMap, maximizedPane]);

    // Collapse/Expand pane
    const handleCollapsePane = useCallback((paneId) => {
        if (!chartRef.current) return;

        try {
            const pane = indicatorPanesMap.current.get(paneId);
            if (!pane) return;

            // If we are collapsing the currently maximized pane, we must first "un-maximize" everything
            if (maximizedPane) {
                const allPanes = chartRef.current.panes ? chartRef.current.panes() : [];

                // Reset all to default first
                allPanes.forEach((p, index) => {
                    if (index === 0) return;
                    try { p.setHeight(100); } catch (e) { }
                });

                // If the pane being collapsed IS the maximized one, we effectively exit maximize mode
                // If it's a different pane, we still probably want to exit maximize mode to behave intuitively?
                // Let's assume yes: collapsing anything while maximized exits maximize mode to clear confusion.
                setMaximizedPane(null);
            }

            const newCollapsed = new Set(collapsedPanes);
            if (collapsedPanes.has(paneId)) {
                // Expand
                pane.setHeight(100);
                newCollapsed.delete(paneId);
            } else {
                // Collapse
                pane.setHeight(20); // Collapsed height (just header)
                newCollapsed.add(paneId);
            }
            setCollapsedPanes(newCollapsed);
        } catch (e) {
            console.warn('Error collapsing pane:', e);
        }
    }, [chartRef, indicatorPanesMap, collapsedPanes, maximizedPane]);

    // Move pane up
    const handleMovePaneUp = useCallback((paneId) => {
        // Use the passed callback to reorder indicators in the parent state
        if (onIndicatorMoveUp) {
            onIndicatorMoveUp(paneId);
        } else if (chartRef.current && chartRef.current.movePane) {
            // Fallback for theoretical future support or if used in context where movePane exists
            try {
                const allPanes = chartRef.current.panes ? chartRef.current.panes() : [];
                const pane = indicatorPanesMap.current.get(paneId);
                if (!pane) return;
                const currentIndex = allPanes.indexOf(pane);
                if (currentIndex > 1) {
                    chartRef.current.movePane(currentIndex, currentIndex - 1);
                }
            } catch (e) { console.warn(e); }
        }
    }, [chartRef, indicatorPanesMap, onIndicatorMoveUp]);

    // Delete pane (uses existing onIndicatorRemove)
    const handleDeletePane = useCallback((paneId) => {
        if (onIndicatorRemove) {
            onIndicatorRemove(paneId);
        }
    }, [onIndicatorRemove]);

    // Check if pane can move up (not first pane after main)
    const canPaneMoveUp = useCallback((paneId) => {
        if (!chartRef.current) return false;
        try {
            const allPanes = chartRef.current.panes ? chartRef.current.panes() : [];
            const pane = indicatorPanesMap.current.get(paneId);
            if (!pane) return false;
            const currentIndex = allPanes.indexOf(pane);
            return currentIndex > 1; // Index 0 is main, index 1 is first indicator pane
        } catch (e) {
            return false;
        }
    }, [chartRef, indicatorPanesMap]);

    return {
        // State
        paneContextMenu,
        maximizedPane,
        collapsedPanes,

        // Handlers
        handlePaneMenu,
        closePaneMenu,
        handleMaximizePane,
        handleCollapsePane,
        handleMovePaneUp,
        handleDeletePane,
        canPaneMoveUp
    };
};

export default usePaneMenu;
