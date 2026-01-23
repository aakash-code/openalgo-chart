import { useState, useRef, useCallback } from 'react';

/**
 * useToastManager Hook
 * 
 * Manages toast notifications with queue management and auto-dismiss.
 * Extracted from App.jsx for better code organization.
 */
export function useToastManager(maxToasts = 3) {
    const [toasts, setToasts] = useState([]);
    const [snapshotToast, setSnapshotToast] = useState(null);
    const toastIdCounter = useRef(0);
    const snapshotToastTimeoutRef = useRef(null);

    /**
     * Show a toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type ('error', 'success', 'info', 'warning')
     * @param {Object} action - Optional action button config { label, onClick }
     */
    const showToast = useCallback((message, type = 'error', action = null) => {
        const id = ++toastIdCounter.current;
        const newToast = { id, message, type, action };

        setToasts(prev => {
            const updated = [...prev, newToast];
            if (updated.length > maxToasts) {
                return updated.slice(-maxToasts);
            }
            return updated;
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, [maxToasts]);

    /**
     * Remove a specific toast by ID
     */
    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    /**
     * Show a snapshot success toast (brief, auto-dismisses in 3s)
     */
    const showSnapshotToast = useCallback((message) => {
        if (snapshotToastTimeoutRef.current) {
            clearTimeout(snapshotToastTimeoutRef.current);
        }
        setSnapshotToast(message);
        snapshotToastTimeoutRef.current = setTimeout(() => setSnapshotToast(null), 3000);
    }, []);

    /**
     * Cleanup function for unmount
     */
    const cleanup = useCallback(() => {
        if (snapshotToastTimeoutRef.current) {
            clearTimeout(snapshotToastTimeoutRef.current);
        }
    }, []);

    return {
        toasts,
        snapshotToast,
        showToast,
        removeToast,
        showSnapshotToast,
        cleanup
    };
}

export default useToastManager;
