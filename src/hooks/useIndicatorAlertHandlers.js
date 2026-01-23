/**
 * Indicator Alert Handlers Hook
 * Manages indicator alert operations: save, update
 */

import { useCallback } from 'react';
import { globalAlertMonitor } from '../services/globalAlertMonitor';

/**
 * Custom hook for indicator alert operations
 * @param {Object} params - Hook parameters
 * @param {Function} params.setAlerts - State setter for alerts
 * @param {Function} params.showToast - Toast notification function
 * @param {Function} params.setIsIndicatorAlertOpen - State setter for dialog visibility
 * @param {Function} params.setIndicatorAlertToEdit - State setter for the alert being edited
 * @param {Object} params.indicatorAlertToEdit - The alert object currently being edited (or null)
 * @returns {Object} Indicator alert handler functions
 */
export const useIndicatorAlertHandlers = ({
    setAlerts,
    showToast,
    setIsIndicatorAlertOpen,
    setIndicatorAlertToEdit,
    indicatorAlertToEdit
}) => {
    // Save (Create or Update) an indicator alert
    const handleSaveIndicatorAlert = useCallback((alertConfig) => {
        setAlerts(prev => {
            const exists = prev.some(a => a.id === alertConfig.id);
            if (exists) {
                return prev.map(a => a.id === alertConfig.id ? alertConfig : a);
            }
            return [...prev, alertConfig];
        });

        showToast(`Indicator alert ${indicatorAlertToEdit ? 'updated' : 'created'}: ${alertConfig.name}`, 'success');

        // Close dialog and reset edit state
        setIsIndicatorAlertOpen(false);
        setIndicatorAlertToEdit(null);

        // Refresh global alert monitor to pick up new/updated alert
        // Use setTimeout to ensure localStorage is updated first
        setTimeout(() => {
            globalAlertMonitor.refresh();
        }, 100);
    }, [setAlerts, showToast, setIsIndicatorAlertOpen, setIndicatorAlertToEdit, indicatorAlertToEdit]);

    return {
        handleSaveIndicatorAlert
    };
};

export default useIndicatorAlertHandlers;
