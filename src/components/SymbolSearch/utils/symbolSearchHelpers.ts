/**
 * Symbol Search Helper Functions
 * Utilities for symbol icons, labels, and badges
 */

export interface SymbolIcon {
    text: string;
    color: string | null;
    bgColor: string;
    isFlag?: boolean;
}

export interface SearchSymbol {
    symbol: string;
    name?: string;
    exchange?: string;
    instrumenttype?: string;
    [key: string]: any;
}

/**
 * Get symbol icon based on symbol name and type
 */
export const getSymbolIcon = (symbol: string, exchange?: string, instrumenttype?: string): SymbolIcon => {
    const sym = (symbol || '').toUpperCase();

    // Nifty 50
    if ((sym === 'NIFTY' || sym.includes('NIFTY50')) && !sym.includes('BANK') && !sym.includes('NXT')) {
        return { text: '50', color: '#2962ff', bgColor: '#e3f2fd' };
    }
    // Bank Nifty
    if (sym.includes('BANKNIFTY') || sym === 'BANKNIFTY') {
        return { text: '🏦', color: null, bgColor: '#fff3e0', isFlag: true };
    }
    // CNX / Other indices with India flag
    if (sym.includes('CNX') || sym.includes('NIFTY_MID') || sym.includes('CNXSMALLCAP')) {
        return { text: '🇮🇳', color: null, bgColor: '#e8f5e9', isFlag: true };
    }
    // General Nifty related
    if (sym.includes('NIFTY')) {
        return { text: '50', color: '#2962ff', bgColor: '#e3f2fd' };
    }
    // IT index
    if (sym.includes('CNXIT') || sym === 'CNXIT') {
        return { text: '💻', color: null, bgColor: '#e3f2fd', isFlag: true };
    }
    // Default - first letter
    return { text: sym.charAt(0) || '?', color: '#607d8b', bgColor: '#eceff1' };
};

/**
 * Get instrument type label for display
 */
export const getInstrumentTypeLabel = (exchange?: string, instrumenttype?: string, symbol?: string): string | null => {
    if (exchange === 'NSE_INDEX' || exchange === 'BSE_INDEX' || (symbol || '').includes('INDEX') || (symbol || '').includes('Index')) {
        return 'index';
    }
    if (instrumenttype === 'FUT' || (symbol || '').includes('-FUT') || (symbol || '').includes('FUTURES')) {
        return 'futures';
    }
    if (instrumenttype === 'CE' || instrumenttype === 'PE') {
        return 'options';
    }
    if (instrumenttype === 'EQ') {
        return 'stock';
    }
    return null;
};

/**
 * Get exchange badge text
 */
export const getExchangeBadge = (exchange?: string): string => {
    const exch = (exchange || '').toUpperCase();

    // BSE exchanges
    if (exch === 'BSE_INDEX' || exch === 'BSE' || exch === 'BFO') {
        return 'BSE';
    }
    // NSE exchanges
    if (exch === 'NSE_INDEX' || exch === 'NSE' || exch === 'NFO') {
        return 'NSE';
    }
    // MCX
    if (exch === 'MCX') {
        return 'MCX';
    }
    return exchange || 'NSE';
};

/**
 * Check if symbol matches filter criteria
 */
export const matchesFilter = (symbol: SearchSymbol, filterLabel: string): boolean => {
    const instType = symbol.instrumenttype?.toUpperCase() || '';
    const exch = symbol.exchange?.toUpperCase() || '';

    switch (filterLabel) {
        case 'Stocks':
            return instType === 'EQ' && (exch === 'NSE' || exch === 'BSE');
        case 'Futures':
            return instType === 'FUT';
        case 'Options':
            return instType === 'CE' || instType === 'PE';
        case 'Indices':
            return exch === 'NSE_INDEX' || exch === 'BSE_INDEX' || exch.includes('INDEX');
        case 'All':
        default:
            return true;
    }
};

/**
 * Sort search results by relevance
 */
export const sortByRelevance = (results: SearchSymbol[], query: string): SearchSymbol[] => {
    const upperQuery = query.toUpperCase().replace(/\s+/g, '');

    return [...results].sort((a, b) => {
        const symA = a.symbol.toUpperCase();
        const symB = b.symbol.toUpperCase();
        const nameA = (a.name || '').toUpperCase();
        const nameB = (b.name || '').toUpperCase();

        // Priority 1: Exact symbol match
        const exactA = symA === upperQuery || symA === upperQuery.replace('50', '') || symA === 'NIFTY';
        const exactB = symB === upperQuery || symB === upperQuery.replace('50', '') || symB === 'NIFTY';
        if (exactA && !exactB) return -1;
        if (exactB && !exactA) return 1;

        // Priority 2: Symbol starts with query
        const startsA = symA.startsWith(upperQuery.split(' ')[0]);
        const startsB = symB.startsWith(upperQuery.split(' ')[0]);
        if (startsA && !startsB) return -1;
        if (startsB && !startsA) return 1;

        // Priority 3: Name contains "50 Index" for nifty 50 searches
        if (upperQuery.includes('50') || upperQuery.includes('NIFTY')) {
            const is50A = nameA.includes('50') && nameA.includes('INDEX');
            const is50B = nameB.includes('50') && nameB.includes('INDEX');
            if (is50A && !is50B) return -1;
            if (is50B && !is50A) return 1;
        }

        // Priority 4: Shorter symbol names first (more specific)
        return symA.length - symB.length;
    });
};

export default {
    getSymbolIcon,
    getInstrumentTypeLabel,
    getExchangeBadge,
    matchesFilter,
    sortByRelevance,
};
