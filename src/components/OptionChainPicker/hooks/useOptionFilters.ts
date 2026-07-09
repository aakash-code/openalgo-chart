/**
 * useOptionFilters Hook
 * Custom hook for option chain filter/add-on state management
 */
import { useState, useEffect, useRef } from 'react';

export interface UseOptionFiltersReturn {
    // Filter states
    showOI: boolean;
    setShowOI: React.Dispatch<React.SetStateAction<boolean>>;
    showOIBars: boolean;
    setShowOIBars: React.Dispatch<React.SetStateAction<boolean>>;
    showPremium: boolean;
    setShowPremium: React.Dispatch<React.SetStateAction<boolean>>;
    showDelta: boolean;
    setShowDelta: React.Dispatch<React.SetStateAction<boolean>>;
    showIV: boolean;
    setShowIV: React.Dispatch<React.SetStateAction<boolean>>;

    // Add-ons dropdown
    addOnsOpen: boolean;
    setAddOnsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    addOnsRef: React.RefObject<HTMLDivElement | null>;

    // Strike count
    strikeCount: number;
    setStrikeCount: (val: number) => void;
    STRIKE_COUNT_OPTIONS: readonly number[];
}

export function useOptionFilters(): UseOptionFiltersReturn {
    // Add-ons visibility state
    const [showOI, setShowOI] = useState<boolean>(true);
    const [showOIBars, setShowOIBars] = useState<boolean>(true);
    const [showPremium, setShowPremium] = useState<boolean>(true);
    const [showDelta, setShowDelta] = useState<boolean>(true);
    const [showIV, setShowIV] = useState<boolean>(false);
    const [addOnsOpen, setAddOnsOpen] = useState<boolean>(false);
    const addOnsRef = useRef<HTMLDivElement | null>(null);

    // Configurable strike count (persisted in localStorage)
    const [strikeCount, setStrikeCountState] = useState<number>(() => {
        const saved = localStorage.getItem('optionChainStrikeCount');
        return saved ? parseInt(saved, 10) : 15;
    });
    const STRIKE_COUNT_OPTIONS = [10, 15, 20, 25, 30, 50] as const;

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (addOnsRef.current && !addOnsRef.current.contains(e.target as Node)) {
                setAddOnsOpen(false);
            }
        };
        if (addOnsOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [addOnsOpen]);

    // Handle strike count change with persistence
    const handleStrikeCountChange = (val: number): void => {
        setStrikeCountState(val);
        localStorage.setItem('optionChainStrikeCount', val.toString());
    };

    return {
        // Filter states
        showOI,
        setShowOI,
        showOIBars,
        setShowOIBars,
        showPremium,
        setShowPremium,
        showDelta,
        setShowDelta,
        showIV,
        setShowIV,

        // Add-ons dropdown
        addOnsOpen,
        setAddOnsOpen,
        addOnsRef,

        // Strike count
        strikeCount,
        setStrikeCount: handleStrikeCountChange,
        STRIKE_COUNT_OPTIONS,
    };
}

export default useOptionFilters;
