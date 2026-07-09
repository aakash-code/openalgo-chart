import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { FC, ChangeEvent, MouseEvent, UIEvent } from 'react';
import { BaseModal } from '../shared';
import { Search, X, Check, Star } from 'lucide-react';
import styles from './SymbolSearch.module.css';
import { searchSymbols } from '../../services/openalgo';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useKeyboardNav, useListNavigation } from '../../hooks/useKeyboardNav';
import { useSymbolHistory } from '../../hooks/useSymbolHistory';
import logger from '../../utils/logger';

// Import extracted components, constants, and utils
import { HighlightText } from './components';
import { FILTER_TABS } from './constants';
import { getSymbolIcon, getInstrumentTypeLabel, getExchangeBadge } from './utils';

interface SymbolData {
    symbol: string;
    exchange: string;
    instrumenttype?: string;
    name?: string;
    description?: string;
    expiry?: string | null;
    strike?: number | null;
}

interface AddedSymbol {
    symbol: string;
    exchange?: string;
    description?: string;
    instrumenttype?: string;
}

interface SelectedSymbol {
    symbol: string;
    exchange: string;
}

interface FilterTab {
    id: string;
    label: string;
    exchange?: string;
    instrumenttype?: string;
}

export interface SymbolSearchProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (symbol: SelectedSymbol) => void;
    addedSymbols?: (AddedSymbol | string)[];
    isCompareMode?: boolean;
    initialValue?: string;
    onInitialValueUsed?: () => void;
}

const SymbolSearch: FC<SymbolSearchProps> = ({
    isOpen,
    onClose,
    onSelect,
    addedSymbols = [],
    isCompareMode = false,
    initialValue = '',
    onInitialValueUsed
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [symbols, setSymbols] = useState<SymbolData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [defaultSymbols, setDefaultSymbols] = useState<SymbolData[]>([]);
    const [activeFilterIndex, setActiveFilterIndex] = useState(0);
    const [activeResultIndex, setActiveResultIndex] = useState(0);

    const activeFilter = FILTER_TABS[activeFilterIndex] as FilterTab;

    // Symbol history for favorites and recents
    const {
        favorites,
        recentSymbols,
        isFavorite,
        toggleFavorite,
        addToRecent,
        getRecentExcludingFavorites,
    } = useSymbolHistory();

    // Focus trap for accessibility
    const focusTrapRef = useFocusTrap(isOpen, { autoFocus: false });

    // Escape key to close
    useKeyboardNav({
        enabled: isOpen,
        onEscape: onClose,
    });

    // Apply initial value when modal opens with a pre-filled character
    useEffect(() => {
        if (isOpen && initialValue) {
            setSearchTerm(initialValue);
            // Clear the initial value after using it
            if (onInitialValueUsed) {
                onInitialValueUsed();
            }
        }
    }, [isOpen, initialValue, onInitialValueUsed]);

    // Load default popular symbols on open
    useEffect(() => {
        let mounted = true;

        if (isOpen && defaultSymbols.length === 0) {
            const defaultList: SymbolData[] = [
                { symbol: 'NIFTY', exchange: 'NSE_INDEX', instrumenttype: 'INDEX', name: 'Nifty 50 Index' },
                { symbol: 'BANKNIFTY', exchange: 'NSE_INDEX', instrumenttype: 'INDEX', name: 'Nifty Bank Index' },
                { symbol: 'CNXSMALLCAP', exchange: 'NSE_INDEX', instrumenttype: 'INDEX', name: 'Nifty SmallCap 100 Index' },
                { symbol: 'NIFTY_MID_SELECT', exchange: 'NSE_INDEX', instrumenttype: 'INDEX', name: 'Nifty MidCap Select Index' },
                { symbol: 'CNXIT', exchange: 'NSE_INDEX', instrumenttype: 'INDEX', name: 'Nifty IT Index' },
                { symbol: 'CNXFINANCE', exchange: 'NSE_INDEX', instrumenttype: 'INDEX', name: 'Nifty Financial Services Index' },
                { symbol: 'RELIANCE', exchange: 'NSE', instrumenttype: 'EQ', name: 'Reliance Industries Ltd' },
                { symbol: 'TCS', exchange: 'NSE', instrumenttype: 'EQ', name: 'Tata Consultancy Services' },
                { symbol: 'INFY', exchange: 'NSE', instrumenttype: 'EQ', name: 'Infosys Ltd' },
                { symbol: 'HDFCBANK', exchange: 'NSE', instrumenttype: 'EQ', name: 'HDFC Bank Ltd' },
            ];
            if (mounted) {
                setDefaultSymbols(defaultList);
            }
        }

        return () => {
            mounted = false;
        };
    }, [isOpen, defaultSymbols.length]);

    // Debounced search with API filters
    useEffect(() => {
        if (!searchTerm || searchTerm.length < 2) {
            setSymbols([]);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsLoading(true);
            try {
                const results = await searchSymbols(searchTerm);

                const transformed: SymbolData[] = (results || []).map((s: any) => ({
                    symbol: (s.symbol || s.tradingsymbol || s.name) as string,
                    exchange: (s.exchange || 'NSE') as string,
                    instrumenttype: (s.instrumenttype || 'EQ') as string,
                    name: (s.name || s.description || s.symbol) as string,
                    expiry: (s.expiry || null) as string | null,
                    strike: (s.strike || null) as number | null,
                }));

                // Apply client-side filtering based on active filter
                let filtered = transformed;
                if (activeFilter.label !== 'All') {
                    filtered = transformed.filter(s => {
                        const instType = s.instrumenttype?.toUpperCase() || '';
                        const exch = s.exchange?.toUpperCase() || '';

                        switch (activeFilter.label) {
                            case 'Stocks':
                                return instType === 'EQ' && (exch === 'NSE' || exch === 'BSE');
                            case 'Futures':
                                return instType === 'FUT';
                            case 'Options':
                                return instType === 'CE' || instType === 'PE';
                            case 'Indices':
                                return exch === 'NSE_INDEX' || exch === 'BSE_INDEX' || exch.includes('INDEX');
                            default:
                                return true;
                        }
                    });
                }

                // Sort results to prioritize exact/closer matches
                const query = searchTerm.toUpperCase().replace(/\s+/g, '');
                const sorted = filtered.sort((a, b) => {
                    const symA = a.symbol.toUpperCase();
                    const symB = b.symbol.toUpperCase();
                    const nameA = (a.name || '').toUpperCase();
                    const nameB = (b.name || '').toUpperCase();

                    // Priority 1: Exact symbol match
                    const exactA = symA === query || symA === query.replace('50', '') || symA === 'NIFTY';
                    const exactB = symB === query || symB === query.replace('50', '') || symB === 'NIFTY';
                    if (exactA && !exactB) return -1;
                    if (exactB && !exactA) return 1;

                    // Priority 2: Symbol starts with query
                    const startsA = symA.startsWith(query.split(' ')[0]);
                    const startsB = symB.startsWith(query.split(' ')[0]);
                    if (startsA && !startsB) return -1;
                    if (startsB && !startsA) return 1;

                    // Priority 3: Name contains "50 Index" for nifty 50 searches
                    if (query.includes('50') || query.includes('NIFTY')) {
                        const is50A = nameA.includes('50') && nameA.includes('INDEX');
                        const is50B = nameB.includes('50') && nameB.includes('INDEX');
                        if (is50A && !is50B) return -1;
                        if (is50B && !is50A) return 1;
                    }

                    // Priority 4: Shorter symbol names first (more specific)
                    return symA.length - symB.length;
                });

                setSymbols(sorted.slice(0, 50));
            } catch (err) {
                logger.error('Error searching symbols:', err);
                setSymbols([]);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, activeFilter]);

    // Filter default symbols based on active filter
    const filteredDefaultSymbols = useMemo(() => {
        if (activeFilter.label === 'All') return defaultSymbols;

        return defaultSymbols.filter(s => {
            if (activeFilter.exchange === 'NSE_INDEX') {
                return s.exchange === 'NSE_INDEX' || s.exchange === 'BSE_INDEX';
            }
            if (activeFilter.instrumenttype) {
                return s.instrumenttype === activeFilter.instrumenttype;
            }
            if (activeFilter.label === 'Options') {
                return s.instrumenttype === 'CE' || s.instrumenttype === 'PE';
            }
            return true;
        });
    }, [defaultSymbols, activeFilter]);

    const displaySymbols = useMemo(() => {
        if (searchTerm && searchTerm.length >= 2) {
            return symbols;
        }
        return filteredDefaultSymbols;
    }, [searchTerm, symbols, filteredDefaultSymbols]);

    // Reset active result index when results change
    useEffect(() => {
        setActiveResultIndex(0);
    }, [displaySymbols]);

    const handleSelect = useCallback((sym: SymbolData) => {
        // Add to recent history
        addToRecent(sym);
        onSelect({ symbol: sym.symbol, exchange: sym.exchange });
        if (!isCompareMode) {
            onClose();
        }
    }, [onSelect, onClose, isCompareMode, addToRecent]);

    // List keyboard navigation (after handleSelect is defined)
    useListNavigation({
        enabled: isOpen && displaySymbols.length > 0,
        itemCount: displaySymbols.length,
        activeIndex: activeResultIndex,
        setActiveIndex: setActiveResultIndex,
        onSelect: (index: number) => {
            const sym = displaySymbols[index];
            if (sym) handleSelect(sym);
        },
    });

    const handleFilterChange = (index: number): void => {
        setActiveFilterIndex(index);
        if (searchTerm && searchTerm.length >= 2) {
            setSymbols([]);
        }
    };

    // Handle favorite toggle with event stop propagation
    const handleFavoriteClick = useCallback((e: MouseEvent<HTMLButtonElement>, sym: SymbolData) => {
        e.stopPropagation();
        toggleFavorite(sym);
    }, [toggleFavorite]);

    // Get recent symbols that aren't in favorites (to avoid duplication)
    const recentExcludingFavorites = useMemo(() => {
        return getRecentExcludingFavorites();
    }, [getRecentExcludingFavorites]);

    // Filter favorites based on active filter
    const filteredFavorites = useMemo(() => {
        if (!isCompareMode && activeFilter.label === 'All') return favorites;

        return favorites.filter((s: SymbolData) => {
            const instType = s.instrumenttype?.toUpperCase() || '';
            const exch = s.exchange?.toUpperCase() || '';

            switch (activeFilter.label) {
                case 'Stocks':
                    return instType === 'EQ' && (exch === 'NSE' || exch === 'BSE');
                case 'Futures':
                    return instType === 'FUT';
                case 'Options':
                    return instType === 'CE' || instType === 'PE';
                case 'Indices':
                    return exch === 'NSE_INDEX' || exch === 'BSE_INDEX' || exch.includes('INDEX');
                default:
                    return true;
            }
        });
    }, [favorites, activeFilter, isCompareMode]);

    // Filter recent symbols based on active filter
    const filteredRecent = useMemo(() => {
        if (!isCompareMode && activeFilter.label === 'All') return recentExcludingFavorites;

        return recentExcludingFavorites.filter((s: SymbolData) => {
            const instType = s.instrumenttype?.toUpperCase() || '';
            const exch = s.exchange?.toUpperCase() || '';

            switch (activeFilter.label) {
                case 'Stocks':
                    return instType === 'EQ' && (exch === 'NSE' || exch === 'BSE');
                case 'Futures':
                    return instType === 'FUT';
                case 'Options':
                    return instType === 'CE' || instType === 'PE';
                case 'Indices':
                    return exch === 'NSE_INDEX' || exch === 'BSE_INDEX' || exch.includes('INDEX');
                default:
                    return true;
            }
        });
    }, [recentExcludingFavorites, activeFilter, isCompareMode]);

    if (!isOpen) return null;

    // Helper to check if a symbol is already added (checks both symbol AND exchange)
    const isSymbolAdded = (sym: SymbolData): boolean => {
        return addedSymbols.some(added => {
            const addedSymbol = typeof added === 'string' ? added : added.symbol;
            const addedExchange = typeof added === 'string' ? null : added.exchange;
            if (addedExchange) {
                return addedSymbol === sym.symbol && addedExchange === sym.exchange;
            }
            return addedSymbol === sym.symbol;
        });
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            showHeader={false}
            noPadding={true}
            className={styles.modalBase}
        >
            {/* Title Header */}
            <div className={styles.titleHeader}>
                <h2 className={styles.title}>
                    {isCompareMode ? 'Compare Symbol' : 'Symbol Search'}
                </h2>
                <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                    <X size={20} />
                </button>
            </div>

            {/* Search Input */}
            <div className={styles.searchRow}>
                <div className={styles.searchContainer}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        ref={focusTrapRef as any}
                        type="text"
                        className={styles.input}
                        placeholder="Search symbol (e.g. NIFTY, RELIANCE, GOLD)"
                        value={searchTerm}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                    {searchTerm && (
                        <X
                            size={16}
                            className={styles.clearIcon}
                            style={{ cursor: 'pointer', color: 'var(--tv-color-text-secondary)' }}
                            onClick={() => setSearchTerm('')}
                        />
                    )}
                </div>
            </div>

            {/* Filter Tabs */}
            <div className={styles.filterTabs}>
                {FILTER_TABS.map((tab, index) => (
                    <button
                        key={tab.id}
                        className={`${styles.filterTab} ${activeFilterIndex === index ? styles.filterTabActive : ''}`}
                        onClick={() => setActiveFilterIndex(index)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Results List */}
            <div className={styles.list}>
                {isLoading && (
                    <div className={styles.loading}>Searching...</div>
                )}

                {/* Compare Mode: Added Symbols Section */}
                {isCompareMode && addedSymbols.length > 0 && !searchTerm && (
                    <div className={styles.addedSection}>
                        <div className={styles.sectionHeader}>Added Symbols</div>
                        {addedSymbols.map((s) => {
                            const sym = typeof s === 'string' ? { symbol: s, exchange: 'NSE' } : s;
                            return (
                                <div key={`added-${sym.symbol}`} className={`${styles.item} ${styles.addedItem}`}>
                                    <div className={styles.symbolIcon} style={{ backgroundColor: '#2962FF', color: '#fff' }}>
                                        {getSymbolIcon(sym.symbol, sym.exchange, sym.instrumenttype).text}
                                    </div>
                                    <div className={styles.itemSymbol}>{sym.symbol}</div>
                                    <div className={styles.itemDesc}>{sym.description}</div>
                                    <div className={styles.checkIcon}>
                                        <Check size={18} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Favorites Section (when not searching) */}
                {!searchTerm && !isCompareMode && filteredFavorites.length > 0 && (
                    <>
                        <div className={styles.sectionLabel}>
                            <Star size={14} fill="#FFB800" color="#FFB800" style={{ marginRight: 6 }} />
                            FAVORITES
                        </div>
                        {filteredFavorites.map((s: SymbolData) => {
                            const icon = getSymbolIcon(s.symbol, s.exchange, s.instrumenttype);
                            const typeLabel = getInstrumentTypeLabel(s.exchange, s.instrumenttype, s.symbol);
                            const exchangeBadge = getExchangeBadge(s.exchange);
                            const symbolIsFavorite = true;

                            return (
                                <div
                                    key={`fav-${s.exchange}-${s.symbol}`}
                                    className={`${styles.item} ${styles.favoriteItem}`}
                                    onClick={() => handleSelect(s)}
                                >
                                    <button
                                        className={`${styles.starButton} ${symbolIsFavorite ? styles.starActive : ''}`}
                                        onClick={(e) => handleFavoriteClick(e, s)}
                                    >
                                        <Star size={16} fill={symbolIsFavorite ? 'currentColor' : 'none'} />
                                    </button>

                                    <div
                                        className={styles.symbolIcon}
                                        style={{ backgroundColor: icon.bgColor, color: icon.color }}
                                    >
                                        {icon.text}
                                    </div>
                                    <div className={styles.itemSymbol}>{s.symbol}</div>
                                    <div className={styles.itemDesc}>{s.name || s.description}</div>
                                    <div className={styles.itemMeta}>
                                        {typeLabel && <span className={styles.typeLabel}>{typeLabel}</span>}
                                        <span className={styles.exchangeBadge}>{exchangeBadge}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}

                {/* Recent Symbols Section */}
                {!searchTerm && !isCompareMode && filteredRecent.length > 0 && (
                    <>
                        <div className={styles.sectionLabel}>RECENT</div>
                        {filteredRecent.map((s: SymbolData) => {
                            const icon = getSymbolIcon(s.symbol, s.exchange, s.instrumenttype);
                            const typeLabel = getInstrumentTypeLabel(s.exchange, s.instrumenttype, s.symbol);
                            const exchangeBadge = getExchangeBadge(s.exchange);
                            const symbolIsFavorite = isFavorite(s);

                            return (
                                <div
                                    key={`recent-${s.exchange}-${s.symbol}`}
                                    className={`${styles.item} ${styles.recentItem}`}
                                    onClick={() => handleSelect(s)}
                                >
                                    <button
                                        className={`${styles.starButton} ${symbolIsFavorite ? styles.starActive : ''}`}
                                        onClick={(e) => handleFavoriteClick(e, s)}
                                    >
                                        <Star size={16} fill={symbolIsFavorite ? 'currentColor' : 'none'} />
                                    </button>

                                    <div
                                        className={styles.symbolIcon}
                                        style={{ backgroundColor: icon.bgColor, color: icon.color }}
                                    >
                                        {icon.text}
                                    </div>
                                    <div className={styles.itemSymbol}>{s.symbol}</div>
                                    <div className={styles.itemDesc}>{s.name || s.description}</div>
                                    <div className={styles.itemMeta}>
                                        {typeLabel && <span className={styles.typeLabel}>{typeLabel}</span>}
                                        <span className={styles.exchangeBadge}>{exchangeBadge}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}

                {/* Popular (Default) List - Only show if no search & filter allows */}
                {!searchTerm && !isCompareMode && activeFilter.id === 'all' && defaultSymbols.length > 0 && (
                    <div className={styles.sectionLabel}>POPULAR</div>
                )}

                {/* Search Results / Default Symbols */}
                {!isLoading && displaySymbols.map((s, index) => {
                    // Skip if already shown in favorites or recent
                    if (!searchTerm && !isCompareMode) {
                        const isInFavorites = filteredFavorites.some((f: SymbolData) => f.symbol === s.symbol && f.exchange === s.exchange);
                        const isInRecent = filteredRecent.some((r: SymbolData) => r.symbol === s.symbol && r.exchange === s.exchange);
                        if (isInFavorites || isInRecent) return null;
                    }

                    const icon = getSymbolIcon(s.symbol, s.exchange, s.instrumenttype);
                    const typeLabel = getInstrumentTypeLabel(s.exchange, s.instrumenttype, s.symbol);
                    const exchangeBadge = getExchangeBadge(s.exchange);
                    const isAdded = isCompareMode && isSymbolAdded(s);
                    const isKeyboardActive = index === activeResultIndex;
                    const symbolIsFavorite = isFavorite(s);

                    return (
                        <div
                            key={`${s.exchange}-${s.symbol}-${index}`}
                            id={`symbol-option-${index}`}
                            role="option"
                            aria-selected={isKeyboardActive}
                            className={`${styles.item} ${isAdded ? styles.addedItem : ''} ${isKeyboardActive ? styles.keyboardActive : ''}`}
                            onClick={() => handleSelect(s)}
                        >
                            {/* Star Button */}
                            <button
                                className={`${styles.starButton} ${symbolIsFavorite ? styles.starActive : ''}`}
                                onClick={(e) => handleFavoriteClick(e, s)}
                                aria-label={symbolIsFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            >
                                <Star size={16} fill={symbolIsFavorite ? 'currentColor' : 'none'} />
                            </button>

                            {/* Symbol Icon */}
                            <div
                                className={styles.symbolIcon}
                                style={{
                                    backgroundColor: icon.bgColor,
                                    color: icon.color
                                }}
                            >
                                {icon.text}
                            </div>

                            {/* Symbol Name */}
                            <div className={styles.itemSymbol}>
                                <HighlightText text={s.symbol} highlight={searchTerm} />
                            </div>

                            {/* Description */}
                            <div className={styles.itemDesc}>
                                <HighlightText text={s.name || ''} highlight={searchTerm} />
                            </div>

                            {/* Type + Exchange + Check */}
                            <div className={styles.itemMeta}>
                                {typeLabel && (
                                    <span className={styles.typeLabel}>{typeLabel}</span>
                                )}
                                <span className={styles.exchangeBadge}>{exchangeBadge}</span>
                                {isAdded && (
                                    <div
                                        className={styles.checkIcon}
                                        onClick={(e: MouseEvent<HTMLDivElement>) => {
                                            e.stopPropagation();
                                            onSelect({ symbol: s.symbol, exchange: s.exchange });
                                        }}
                                    >
                                        <Check size={20} />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {!isLoading && displaySymbols.length === 0 && searchTerm.length >= 2 && (
                    <div className={styles.noResults}>No symbols found</div>
                )}
            </div>
        </BaseModal>
    );
};

export default SymbolSearch;
