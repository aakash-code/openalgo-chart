import React from 'react';
import type { MouseEvent, MutableRefObject } from 'react';
import styles from './ChartGrid.module.css';
import ChartComponent from './ChartComponent';

type LayoutType = '1' | '2' | '2v' | '3' | '4' | '5' | '6' | '8' | '10';

interface Indicator {
    type: string;
    params?: Record<string, unknown>;
    [key: string]: unknown;
}

interface ComparisonSymbol {
    symbol: string;
    exchange: string;
    color?: string;
    [key: string]: unknown;
}

interface StrategyConfig {
    [key: string]: unknown;
}

interface Alert {
    id: string;
    price: number;
    type: string;
    symbol: string;
    exchange: string;
    [key: string]: unknown;
}

interface AlertEvent {
    price?: number;
    alertPrice?: number;
    timestamp?: number | string;
    type: string;
    [key: string]: unknown;
}

interface Chart {
    id: number;
    symbol: string;
    exchange?: string;
    interval: string;
    indicators?: Indicator[];
    comparisonSymbols?: ComparisonSymbol[];
    strategyConfig?: StrategyConfig;
}

interface ChartRef {
    // Chart component instance methods
    [key: string]: unknown;
}

export interface ChartGridProps {
    charts: Chart[];
    layout: LayoutType;
    activeChartId: number;
    onActiveChartChange: (chartId: number) => void;
    onMaximizeChart?: (chartId: number) => void;
    chartRefs: MutableRefObject<Record<number, ChartRef | null>>;
    onAlertsSync?: (chartId: number, symbol: string, exchange: string, alerts: Alert[]) => void;
    onDrawingsSync?: (drawings: unknown[]) => void;
    onAlertTriggered?: (chartId: number, symbol: string, exchange: string, event: AlertEvent) => void;
    onReplayModeChange?: (chartId: number, isActive: boolean) => void;
    onOHLCDataUpdate?: (symbol: string, exchange: string, interval: string, data: any[]) => void;
    [key: string]: unknown; // Additional chart props
}

const ChartGrid: React.FC<ChartGridProps> = ({
    charts,
    layout,
    activeChartId,
    onActiveChartChange,
    onMaximizeChart,
    chartRefs,
    onAlertsSync,
    onDrawingsSync,
    onAlertTriggered,
    onReplayModeChange,
    onOHLCDataUpdate,
    ...chartProps
}) => {
    const getGridClass = (): string => {
        switch (layout) {
            case '2': return styles.grid2;
            case '2v': return styles.grid2v;
            case '3': return styles.grid3;
            case '4': return styles.grid4;
            case '5': return styles.grid6; // 5 charts uses 6 grid
            case '6': return styles.grid6;
            case '8': return styles.grid8;
            case '10': return styles.grid10;
            default: return styles.grid1;
        }
    };

    const handleChartClick = (e: MouseEvent<HTMLDivElement>, chartId: number): void => {
        console.log('[ChartGrid] Chart clicked:', chartId, 'Active was:', activeChartId);
        if (e.altKey && onMaximizeChart) {
            e.preventDefault();
            e.stopPropagation();
            onMaximizeChart(chartId);
        } else {
            onActiveChartChange(chartId);
        }
    };


    return (
        <div className={`${styles.gridContainer} ${getGridClass()}`}>
            {charts.map((chart) => (
                <div
                    key={chart.id}
                    className={`${styles.chartWrapper} ${activeChartId === chart.id && layout !== '1' ? styles.active : ''}`}
                    onClick={(e) => handleChartClick(e, chart.id)}
                >
                    <ChartComponent
                        ref={(el) => {
                            if (chartRefs.current) {
                                chartRefs.current[chart.id] = el;
                            }
                        }}
                        symbol={chart.symbol}
                        exchange={chart.exchange || 'NSE'}
                        interval={chart.interval}
                        onAlertsSync={onAlertsSync ? (alerts: Alert[]) => onAlertsSync(chart.id, chart.symbol, chart.exchange || 'NSE', alerts) : undefined}
                        onDrawingsSync={onDrawingsSync}
                        onAlertTriggered={onAlertTriggered ? (evt: AlertEvent) => onAlertTriggered(chart.id, chart.symbol, chart.exchange || 'NSE', evt) : undefined}
                        onReplayModeChange={onReplayModeChange ? (isActive: boolean) => onReplayModeChange(chart.id, isActive) : undefined}
                        onOHLCDataUpdate={onOHLCDataUpdate}
                        {...chartProps}
                        indicators={chart.indicators}
                        comparisonSymbols={chart.comparisonSymbols}
                        strategyConfig={chart.strategyConfig}
                    />
                </div>
            ))}
        </div>
    );
};

export default React.memo(ChartGrid);
