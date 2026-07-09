/**
 * useTablePreferences Hook
 * Manages AccountPanel table preferences in localStorage
 */
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'accountPanel_preferences';

export interface TablePreferences {
    showSearchFilter: boolean;
    [key: string]: any;
}

const DEFAULT_PREFERENCES: TablePreferences = {
    showSearchFilter: true
};

export interface UseTablePreferencesReturn {
    preferences: TablePreferences;
    updatePreference: (key: string, value: any) => void;
}

/**
 * Hook to manage table preferences with localStorage persistence
 */
export const useTablePreferences = (): UseTablePreferencesReturn => {
    const [preferences, setPreferences] = useState<TablePreferences>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : DEFAULT_PREFERENCES;
        } catch (error) {
            console.warn('[useTablePreferences] Failed to load preferences from localStorage:', error);
            return DEFAULT_PREFERENCES;
        }
    });

    // Sync to localStorage whenever preferences change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        } catch (error) {
            console.error('[useTablePreferences] Failed to save preferences to localStorage:', error);
        }
    }, [preferences]);

    /**
     * Update a single preference
     */
    const updatePreference = (key: string, value: any): void => {
        setPreferences(prev => ({ ...prev, [key]: value }));
    };

    return { preferences, updatePreference };
};

export default useTablePreferences;
