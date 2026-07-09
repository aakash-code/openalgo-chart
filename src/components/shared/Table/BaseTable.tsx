import React from 'react';
import type { ReactNode, MouseEvent } from 'react';
import styles from './BaseTable.module.css';

type AlignType = 'left' | 'center' | 'right';
type SortDirection = 'asc' | 'desc';

export interface ColumnDefinition<T = Record<string, unknown>> {
    key: string;
    title: ReactNode;
    width?: string;
    align?: AlignType;
    render?: (row: T, value: unknown) => ReactNode;
    sortable?: boolean;
}

export interface SortConfig {
    key: string | null;
    direction: SortDirection;
}

export interface BaseTableProps<T = Record<string, unknown>> {
    columns: ColumnDefinition<T>[];
    data: T[];
    keyField?: string;
    onRowClick?: (row: T, event: MouseEvent<HTMLTableRowElement>) => void;
    onSort?: (key: string) => void;
    sortConfig?: SortConfig;
    isLoading?: boolean;
    emptyState?: ReactNode;
    rowClassName?: (row: T) => string;
    className?: string;
}

/**
 * BaseTable Component
 * A reusable table component for standardizing tables across the application.
 * Supports sorting, custom cell rendering, row clicking, and empty states.
 */
const BaseTable = <T extends Record<string, unknown>>({
    columns,
    data,
    keyField = 'id',
    onRowClick,
    onSort,
    sortConfig = { key: null, direction: 'asc' },
    isLoading = false,
    emptyState,
    rowClassName,
    className = '',
}: BaseTableProps<T>): React.ReactElement | null => {
    // Helper to get alignment class
    const getAlignClass = (align?: AlignType): string => {
        switch (align) {
            case 'right': return styles.alignRight;
            case 'center': return styles.alignCenter;
            default: return styles.alignLeft;
        }
    };

    // Helper to handle sort click
    const handleSortClick = (key: string): void => {
        if (onSort) {
            onSort(key);
        }
    };

    const renderSortIndicator = (columnKey: string): ReactNode => {
        if (sortConfig.key !== columnKey) return null;
        return (
            <span className={`${styles.sortIndicator} ${styles.active}`}>
                {sortConfig.direction === 'asc' ? '↑' : '↓'}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className={`${styles.tableContainer} ${className}`}>
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner}></div>
                    <span>Loading data...</span>
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className={`${styles.tableContainer} ${className}`}>
                {emptyState || (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📊</div>
                        <p className={styles.emptyText}>No data available</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`${styles.tableContainer} ${className}`}>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <colgroup>
                        {columns.map((col, index) => (
                            <col
                                key={col.key || index}
                                style={{ width: col.width || 'auto' }}
                            />
                        ))}
                    </colgroup>
                    <thead>
                        <tr>
                            {columns.map((col, index) => {
                                const isSortable = col.sortable !== false && !!onSort;
                                const isSorted = sortConfig.key === col.key;

                                return (
                                    <th
                                        key={col.key || index}
                                        className={`
                                            ${getAlignClass(col.align)}
                                            ${isSortable ? styles.sortableHeader : ''}
                                            ${isSorted ? styles.sorted : ''}
                                        `}
                                        onClick={isSortable ? () => handleSortClick(col.key) : undefined}
                                        title={isSortable ? 'Click to sort' : undefined}
                                    >
                                        {col.title}
                                        {isSortable && renderSortIndicator(col.key)}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIndex) => {
                            const rowKey = (row[keyField] as string | number) || rowIndex;
                            const customRowClass = rowClassName ? rowClassName(row) : '';

                            return (
                                <tr
                                    key={rowKey}
                                    className={`
                                        ${onRowClick ? styles.clickableRow : ''}
                                        ${customRowClass}
                                    `}
                                    onClick={onRowClick ? (e) => onRowClick(row, e) : undefined}
                                >
                                    {columns.map((col, colIndex) => {
                                        const cellValue = row[col.key];
                                        const cellContent = col.render ? col.render(row, cellValue) : cellValue as ReactNode;

                                        return (
                                            <td
                                                key={`${rowKey}-${col.key || colIndex}`}
                                                className={getAlignClass(col.align)}
                                            >
                                                {cellContent}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export { BaseTable };
