/**
 * Toast Manager Hook
 *
 * Manages toast notifications with queue management and auto-dismiss.
 * Extracted from App.jsx for better code organization.
 */

import { useState, useRef, useCallback } from 'react';

// ==================== TYPES ====================

/** Toast type variants */
export type ToastType = 'error' | 'success' | 'info' | 'warning';

/** Toast action button configuration */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

/** Toast notification */
export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  action: ToastAction | null;
}

/** Hook return type */
export interface UseToastManagerReturn {
  toasts: Toast[];
  snapshotToast: string | null;
  showToast: (message: string, type?: ToastType, action?: ToastAction | null) => void;
  removeToast: (id: number) => void;
  showSnapshotToast: (message: string) => void;
  clearSnapshotToast: () => void;
  cleanup: () => void;
}

// ==================== HOOK ====================

/**
 * useToastManager Hook
 * @param maxToasts - Maximum number of toasts to display at once (default: 3)
 * @returns Toast management functions and state
 */
export function useToastManager(maxToasts: number = 3): UseToastManagerReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);
  const toastIdCounter = useRef(0);
  const snapshotToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Show a toast notification
   * @param message - Toast message
   * @param type - Toast type ('error', 'success', 'info', 'warning')
   * @param action - Optional action button config { label, onClick }
   */
  const showToast = useCallback(
    (message: string, type: ToastType = 'error', action: ToastAction | null = null) => {
      const id = ++toastIdCounter.current;
      const newToast: Toast = { id, message, type, action };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        if (updated.length > maxToasts) {
          return updated.slice(-maxToasts);
        }
        return updated;
      });

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    [maxToasts]
  );

  /**
   * Remove a specific toast by ID
   */
  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Show a snapshot success toast (brief, auto-dismisses in 3s)
   */
  const showSnapshotToast = useCallback((message: string) => {
    if (snapshotToastTimeoutRef.current) {
      clearTimeout(snapshotToastTimeoutRef.current);
    }
    setSnapshotToast(message);
    snapshotToastTimeoutRef.current = setTimeout(() => setSnapshotToast(null), 3000);
  }, []);

  /**
   * Clear the snapshot toast immediately
   */
  const clearSnapshotToast = useCallback(() => {
    if (snapshotToastTimeoutRef.current) {
      clearTimeout(snapshotToastTimeoutRef.current);
    }
    setSnapshotToast(null);
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
    clearSnapshotToast,
    cleanup,
  };
}

export default useToastManager;
