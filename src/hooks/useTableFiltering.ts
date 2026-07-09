/**
 * useTableFiltering Hook
 * Consolidates filter, search, and sort logic for AccountPanel tables
 * Eliminates duplicate code across OrdersTable, PositionsTable, TradesTable, HoldingsTable, ClosedPositionsTable
 */

import { useState, useMemo, useCallback, type Dispatch, type SetStateAction } from 'react';

// ==================== TYPES ====================

/** Sort direction */
export type SortDirection = 'asc' | 'desc';

/** Sort configuration */
export interface SortConfig {
  key: string | null;
  direction: SortDirection;
}

/** Filter configuration */
export interface FilterConfig {
  /** The data field to filter on */
  key: string;
  /** Optional different key to read from data (defaults to key) */
  dataKey?: string | undefined;
}

/** Data item with any shape */
export type DataItem = Record<string, unknown>;

/** Filter state object */
export type FiltersState = Record<string, string[]>;

/** Unique filter values by key */
export type UniqueFilterValues = Record<string, unknown[]>;

/** Default sort function */
export type DefaultSortFn = (data: DataItem[]) => DataItem[];

/** Hook options */
export interface UseTableFilteringOptions {
  /** The data array to filter/sort */
  data?: DataItem[] | undefined;
  /** Initial filter state (e.g., { action: [], status: [] }) */
  initialFilters?: FiltersState | undefined;
  /** Array of filter configurations */
  filterConfigs?: FilterConfig[] | undefined;
  /** Field to search on (default: 'symbol') */
  searchField?: string | undefined;
  /** Optional default sort function */
  defaultSort?: DefaultSortFn | null | undefined;
}

/** Hook return type */
export interface UseTableFilteringReturn {
  // State
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  filters: FiltersState;
  showFilters: boolean;
  sortConfig: SortConfig;
  filteredData: DataItem[];
  uniqueFilterValues: UniqueFilterValues;
  hasActiveFilters: boolean;
  activeFilterCount: number;

  // Handlers
  handleFilterToggle: (filterType: string, value: string) => void;
  handleClearFilters: () => void;
  handleSort: (key: string) => void;
  toggleFilters: () => void;
}

// ==================== UTILITIES ====================

/**
 * Sort data array by a specific key
 * @param data - Data array to sort
 * @param sortConfig - Sort configuration
 * @returns Sorted data array
 */
export const sortData = (data: DataItem[], sortConfig: SortConfig): DataItem[] => {
  if (!sortConfig || !sortConfig.key) return data;

  const key = sortConfig.key;

  return [...data].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    // Handle null/undefined values
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    // Numeric comparison
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    }

    // Try to parse as numbers if strings contain numeric values
    const aNum = parseFloat(String(aVal));
    const bNum = parseFloat(String(bVal));
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
    }

    // String comparison
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();

    if (sortConfig.direction === 'asc') {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  });
};

// ==================== HOOK ====================

/**
 * Custom hook for table filtering, searching, and sorting
 *
 * @param options - Hook options
 * @returns Filter state and handlers
 */
const useTableFiltering = ({
  data = [],
  initialFilters = {},
  filterConfigs = [],
  searchField = 'symbol',
  defaultSort = null,
}: UseTableFilteringOptions): UseTableFilteringReturn => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });

  // Generate unique values for each filter
  const uniqueFilterValues = useMemo((): UniqueFilterValues => {
    const result: UniqueFilterValues = {};
    filterConfigs.forEach(({ key, dataKey }) => {
      const fieldKey = dataKey || key;
      result[key] = [...new Set(data.map((item) => item[fieldKey]).filter(Boolean))];
    });
    return result;
  }, [data, filterConfigs]);

  // Filter and sort data
  const filteredData = useMemo((): DataItem[] => {
    let filtered = data.filter((item) => {
      // Search filter
      const searchValue = item[searchField];
      const matchesSearch =
        !searchTerm ||
        (typeof searchValue === 'string' &&
          searchValue.toLowerCase().includes(searchTerm.toLowerCase()));

      // Apply all configured filters
      const matchesFilters = filterConfigs.every(({ key, dataKey }) => {
        const fieldKey = dataKey || key;
        const filterValues = filters[key] || [];
        return filterValues.length === 0 || filterValues.includes(String(item[fieldKey]));
      });

      return matchesSearch && matchesFilters;
    });

    // Apply sorting if configured
    if (sortConfig.key) {
      filtered = sortData(filtered, sortConfig);
    } else if (defaultSort) {
      filtered = defaultSort(filtered);
    }

    return filtered;
  }, [data, searchTerm, filters, sortConfig, filterConfigs, searchField, defaultSort]);

  // Handle filter toggle
  const handleFilterToggle = useCallback((filterType: string, value: string) => {
    setFilters((prev) => {
      const currentFilters = prev[filterType] || [];
      const newFilters = currentFilters.includes(value)
        ? currentFilters.filter((v) => v !== value)
        : [...currentFilters, value];
      return { ...prev, [filterType]: newFilters };
    });
  }, []);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setFilters(initialFilters);
  }, [initialFilters]);

  // Handle column sorting
  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Toggle filter panel visibility
  const toggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo((): boolean => {
    if (searchTerm) return true;
    return Object.values(filters).some((arr) => arr && arr.length > 0);
  }, [searchTerm, filters]);

  // Get active filter count
  const activeFilterCount = useMemo((): number => {
    return Object.values(filters).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  }, [filters]);

  return {
    // State
    searchTerm,
    setSearchTerm,
    filters,
    showFilters,
    sortConfig,
    filteredData,
    uniqueFilterValues,
    hasActiveFilters,
    activeFilterCount,

    // Handlers
    handleFilterToggle,
    handleClearFilters,
    handleSort,
    toggleFilters,
  };
};

export default useTableFiltering;
export { useTableFiltering };
