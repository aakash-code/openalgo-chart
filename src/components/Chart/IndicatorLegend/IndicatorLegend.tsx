import React from 'react';
import type { FC, MouseEvent } from 'react';
import styles from './IndicatorLegend.module.css';

interface PivotValues {
    pivot?: number;
    r1?: number;
    r2?: number;
    r3?: number;
    s1?: number;
    s2?: number;
    s3?: number;
    [key: string]: number | undefined;
}

interface PivotColors {
    pivot?: string;
    r1?: string;
    r2?: string;
    r3?: string;
    s1?: string;
    s2?: string;
    s3?: string;
    [key: string]: string | undefined;
}

interface PivotLabeledValue {
    _pivotLabeled: true;
    values: PivotValues;
    colors: PivotColors;
}

type IndicatorValue = number | string | PivotLabeledValue | Record<string, number | string> | undefined;

interface Indicator {
    id?: string;
    type: string;
    name: string;
    params?: string;
    value?: IndicatorValue;
    color?: string;
    isHidden?: boolean;
    pane?: string;
}

interface IndicatorRowProps {
    indicator: Indicator;
    onVisibilityToggle?: (id: string) => void;
    onRemove?: (id: string) => void;
    onSettings?: (id: string) => void;
    onPaneMenu?: (id: string, x: number, y: number) => void;
    onAddAlert?: (indicatorType: string) => void;
    isPaneIndicator?: boolean;
}

/**
 * IndicatorRow - Renders a single indicator with name, params, value, and action buttons
 */
const IndicatorRow: FC<IndicatorRowProps> = ({
    indicator,
    onVisibilityToggle,
    onRemove,
    onSettings,
    onPaneMenu,
    onAddAlert,
    isPaneIndicator
}) => {
    const handleContextMenu = (e: MouseEvent<HTMLDivElement>): void => {
        e.preventDefault();
        // Right-click toggles visibility
        if (onVisibilityToggle) {
            onVisibilityToggle(indicator.id || indicator.type);
        }
    };

    const handlePaneMenuClick = (e: MouseEvent<HTMLButtonElement>): void => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        if (onPaneMenu) {
            onPaneMenu(indicator.id || indicator.type, rect.left, rect.bottom + 4);
        }
    };

    const handleVisibilityClick = (e: MouseEvent<HTMLButtonElement>): void => {
        e.stopPropagation();
        if (onVisibilityToggle) {
            onVisibilityToggle(indicator.id || indicator.type);
        }
    };

    const handleAddAlertClick = (e: MouseEvent<HTMLButtonElement>): void => {
        e.stopPropagation();
        const indicatorType = indicator.type || (typeof indicator.id === 'string' ? indicator.id.split('-')[0] : String(indicator.id));
        if (onAddAlert) {
            onAddAlert(indicatorType);
        }
    };

    const handleSettingsClick = (e: MouseEvent<HTMLButtonElement>): void => {
        e.stopPropagation();
        if (onSettings) {
            onSettings(indicator.id || indicator.type);
        }
    };

    const handleRemoveClick = (e: MouseEvent<HTMLButtonElement>): void => {
        e.stopPropagation();
        if (onRemove) {
            onRemove(indicator.id || indicator.type);
        }
    };

    const renderValue = (): React.ReactNode => {
        if (indicator.value === undefined) return '--';

        if (typeof indicator.value === 'number') {
            return indicator.value.toFixed(2);
        }

        if (typeof indicator.value === 'object' && indicator.value !== null) {
            const val = indicator.value as PivotLabeledValue | Record<string, number | string>;

            if ('_pivotLabeled' in val && val._pivotLabeled) {
                // Special rendering for Pivot Points with labels and colors
                const { colors, values } = val;
                const order: (keyof PivotValues)[] = ['pivot', 'r1', 'r2', 'r3', 's1', 's2', 's3'];
                const labels: Record<string, string> = { pivot: 'P', r1: 'R1', r2: 'R2', r3: 'R3', s1: 'S1', s2: 'S2', s3: 'S3' };

                return order.map((key, idx) => {
                    const v = values?.[key];
                    const color = colors?.[key] || indicator.color;
                    const label = labels[key];
                    const valStr = typeof v === 'number' ? v.toFixed(2) : (v ?? '--');
                    return (
                        <span key={key} style={{ marginRight: idx < order.length - 1 ? '6px' : 0 }}>
                            <span style={{ color, fontWeight: 500 }}>{label}:</span>
                            <span style={{ color, marginLeft: '2px' }}>{valStr}</span>
                        </span>
                    );
                });
            }

            // Default object rendering
            return Object.values(val).map(v => typeof v === 'number' ? v.toFixed(2) : v).join(' / ');
        }

        return indicator.value as React.ReactNode;
    };

    return (
        <div
            className={`${styles.indicatorRow} ${indicator.isHidden ? styles.indicatorHidden : ''}`}
            onContextMenu={handleContextMenu}
        >
            {/* Name with params - like TradingView: "EMA 20 close 0" */}
            <span className={styles.indicatorName}>
                {indicator.name} {indicator.params}
            </span>

            {/* Pane Menu Button - only for pane indicators */}
            {isPaneIndicator && onPaneMenu && (
                <button
                    className={styles.paneMenuBtn}
                    onClick={handlePaneMenuClick}
                    title="Pane options"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18">
                        <circle fill="currentColor" cx="9" cy="4" r="1.5" />
                        <circle fill="currentColor" cx="9" cy="9" r="1.5" />
                        <circle fill="currentColor" cx="9" cy="14" r="1.5" />
                    </svg>
                </button>
            )}

            {/* Action buttons - hidden by default, visible on hover */}
            <div className={styles.indicatorActions}>
                {/* Eye - Show/Hide toggle */}
                <button
                    className={`${styles.indicatorActionBtn} ${indicator.isHidden ? styles.eyeHidden : ''}`}
                    onClick={handleVisibilityClick}
                    title={indicator.isHidden ? "Show" : "Hide"}
                >
                    {indicator.isHidden ? (
                        /* Crossed-out eye icon */
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18">
                            <path fill="currentColor" d="M3.7 15 15 3.7l-.7-.7L3 14.3l.7.7ZM9 3c1.09 0 2.17.23 3.19.7l-.77.76C10.64 4.16 9.82 4 9 4 6.31 4 3.58 5.63 2.08 9a9.35 9.35 0 0 0 1.93 2.87l-.7.7A10.44 10.44 0 0 1 1.08 9.2L1 9l.08-.2C2.69 4.99 5.82 3 9 3Z" />
                            <path fill="currentColor" d="M9 6a3 3 0 0 1 .78.1l-.9.9A2 2 0 0 0 7 8.87l-.9.9A3 3 0 0 1 9 6ZM11.9 8.22l-.9.9A2 2 0 0 1 9.13 11l-.9.9a3 3 0 0 0 3.67-3.68Z" />
                            <path fill="currentColor" d="M9 14c-.82 0-1.64-.15-2.43-.45l-.76.76c1.02.46 2.1.7 3.19.7 3.18 0 6.31-1.98 7.92-5.81L17 9l-.08-.2a10.44 10.44 0 0 0-2.23-3.37l-.7.7c.75.76 1.41 1.71 1.93 2.87-1.5 3.37-4.23 5-6.92 5Z" />
                        </svg>
                    ) : (
                        /* Normal eye icon */
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18">
                            <path fill="currentColor" fillRule="evenodd" d="M12 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-1 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
                            <path fill="currentColor" d="M16.91 8.8C15.31 4.99 12.18 3 9 3 5.82 3 2.7 4.98 1.08 8.8L1 9l.08.2C2.7 13.02 5.82 15 9 15c3.18 0 6.3-1.97 7.91-5.8L17 9l-.09-.2ZM9 14c-2.69 0-5.42-1.63-6.91-5 1.49-3.37 4.22-5 6.9-5 2.7 0 5.43 1.63 6.92 5-1.5 3.37-4.23 5-6.91 5Z" />
                        </svg>
                    )}
                </button>

                {/* Add Alert */}
                {onAddAlert && (
                    <button
                        className={styles.indicatorActionBtn}
                        onClick={handleAddAlertClick}
                        title="Add Alert on Indicator"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18">
                            <path fill="currentColor" d="M3.5 9a5.5 5.5 0 1 1 11 0v4.5l1.5 1.5v.5h-14v-.5l1.5-1.5V9zm1.5 4.5h8V9a4 4 0 1 0-8 0v4.5zM9 16.5a1.5 1.5 0 0 1-1.5-1.5h3a1.5 1.5 0 0 1-1.5 1.5z" />
                        </svg>
                    </button>
                )}

                {/* Settings */}
                <button
                    className={styles.indicatorActionBtn}
                    onClick={handleSettingsClick}
                    title="Settings"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18">
                        <path fill="currentColor" fillRule="evenodd" d="m3.1 9 2.28-5h7.24l2.28 5-2.28 5H5.38L3.1 9Zm1.63-6h8.54L16 9l-2.73 6H4.73L2 9l2.73-6Zm5.77 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm1 0a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" />
                    </svg>
                </button>

                {/* Delete */}
                <button
                    className={`${styles.indicatorActionBtn} ${styles.delete}`}
                    onClick={handleRemoveClick}
                    title="Remove"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18">
                        <path fill="currentColor" d="M7.5 4a.5.5 0 0 0-.5.5V5h4v-.5a.5.5 0 0 0-.5-.5h-3ZM12 5h3v1h-1.05l-.85 7.67A1.5 1.5 0 0 1 11.6 15H6.4a1.5 1.5 0 0 1-1.5-1.33L4.05 6H3V5h3v-.5C6 3.67 6.67 3 7.5 3h3c.83 0 1.5.67 1.5 1.5V5ZM5.06 6l.84 7.56a.5.5 0 0 0 .5.44h5.2a.5.5 0 0 0 .5-.44L12.94 6H5.06Z" />
                    </svg>
                </button>
            </div>

            {/* Value - colored, shown by default */}
            <span className={styles.indicatorValue} style={{ color: indicator.color }}>
                {renderValue()}
            </span>
        </div>
    );
};

export interface IndicatorLegendProps {
    indicators?: Indicator[];
    panePositions?: Record<string, number>;
    isToolbarVisible?: boolean;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    onVisibilityToggle?: (id: string) => void;
    onRemove?: (id: string) => void;
    onSettings?: (id: string) => void;
    onPaneMenu?: (id: string, x: number, y: number) => void;
    onAddAlert?: (indicatorType: string) => void;
    maximizedPane?: string | null;
}

/**
 * IndicatorLegend - Main component that renders legends for all indicators
 */
const IndicatorLegend: FC<IndicatorLegendProps> = ({
    indicators = [],
    panePositions = {},
    isToolbarVisible = true,
    isCollapsed = false,
    onToggleCollapse,
    onVisibilityToggle,
    onRemove,
    onSettings,
    onPaneMenu,
    onAddAlert,
    maximizedPane = null
}) => {
    // Separate indicators into main chart and pane indicators
    const mainIndicators = indicators.filter(ind => ind.pane === 'main');
    const paneIndicators = indicators.filter(ind => ind.pane && ind.pane !== 'main');

    // If a pane is maximized, we only show that specific pane's legend at the top
    const showingMaximized = maximizedPane !== null;

    // If a pane is maximized, finding the indicators causing it
    const maximizedPaneIndicators = showingMaximized
        ? indicators.filter(ind => ind.id === maximizedPane || ind.pane === maximizedPane)
        : [];

    const leftOffset = isToolbarVisible ? '55px' : '10px';

    // RENDER LOGIC WITH MAXIMIZED PANE
    if (showingMaximized) {
        return (
            <div className={styles.indicatorLegend} style={{ left: leftOffset }}>
                <div className={styles.indicatorSources}>
                    {maximizedPaneIndicators.map(indicator => (
                        <IndicatorRow
                            key={indicator.id || indicator.type}
                            indicator={indicator}
                            onVisibilityToggle={onVisibilityToggle}
                            onRemove={onRemove}
                            onSettings={onSettings}
                            onPaneMenu={onPaneMenu}
                            onAddAlert={onAddAlert}
                            isPaneIndicator={true}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Main chart indicators legend */}
            <div className={styles.indicatorLegend} style={{ left: leftOffset }}>
                {!isCollapsed && mainIndicators.length > 0 && (
                    <div className={styles.indicatorSources}>
                        {mainIndicators.map((indicator) => (
                            <IndicatorRow
                                key={indicator.id || indicator.type}
                                indicator={indicator}
                                onVisibilityToggle={onVisibilityToggle}
                                onRemove={onRemove}
                                onSettings={onSettings}
                                onAddAlert={onAddAlert}
                            />
                        ))}
                    </div>
                )}

                {/* Collapse/Expand Toggle - small chevron at bottom */}
                {mainIndicators.length > 0 && (
                    <div
                        className={`${styles.indicatorToggle} ${isCollapsed ? styles.collapsed : ''}`}
                        onClick={onToggleCollapse}
                        title={isCollapsed ? "Show indicator legend" : "Hide indicator legend"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15" width="15" height="15">
                            <path fill="currentColor" d="M3.5 5.58c.24-.28.65-.3.92-.07L7.5 8.14l3.08-2.63a.65.65 0 1 1 .84.98L7.5 9.86 3.58 6.49a.65.65 0 0 1-.07-.91z" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Pane indicators - positioned at each pane's vertical offset */}
            {paneIndicators.map((indicator) => {
                const paneTop = panePositions[indicator.id || ''] || panePositions[indicator.pane || ''];
                if (paneTop === undefined) return null;

                return (
                    <div
                        key={`pane-legend-${indicator.id || indicator.type}`}
                        className={styles.indicatorLegend}
                        style={{
                            left: leftOffset,
                            top: `${paneTop + 4}px`
                        }}
                    >
                        <div className={styles.indicatorSources}>
                            <IndicatorRow
                                indicator={indicator}
                                onVisibilityToggle={onVisibilityToggle}
                                onRemove={onRemove}
                                onSettings={onSettings}
                                onPaneMenu={onPaneMenu}
                                onAddAlert={onAddAlert}
                                isPaneIndicator={true}
                            />
                        </div>
                    </div>
                );
            })}
        </>
    );
};

export default IndicatorLegend;
