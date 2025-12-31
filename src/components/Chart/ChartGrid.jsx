import React from 'react';
import styles from './ChartGrid.module.css';
import ChartComponent from './ChartComponent';

const ChartGrid = ({
    charts,
    layout,
    activeChartId,
    onActiveChartChange,
    chartRefs,
    onAlertsSync,
    onAlertTriggered,
    onReplayModeChange,
    isSyncEnabled = false,
    ...chartProps
}) => {
    const getGridClass = () => {
        switch (layout) {
            case '2': return styles.grid2;
            case '3': return styles.grid3;
            case '4': return styles.grid4;
            case '5': return styles.grid5;
            case '6': return styles.grid6;
            case '7': return styles.grid7;
            case '8': return styles.grid8;
            case '9': return styles.grid9;
            case '10': return styles.grid10;
            default: return styles.grid1;
        }
    };

    return (
        <div className={`${styles.gridContainer} ${getGridClass()}`}>
            {charts.map((chart) => (
                <div
                    key={chart.id}
                    className={`${styles.chartWrapper} ${activeChartId === chart.id && layout !== '1' ? styles.active : ''}`}
                    onClick={() => onActiveChartChange(chart.id)}
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
                        onAlertsSync={onAlertsSync ? (alerts) => onAlertsSync(chart.id, chart.symbol, chart.exchange || 'NSE', alerts) : undefined}
                        onAlertTriggered={onAlertTriggered ? (evt) => onAlertTriggered(chart.id, chart.symbol, chart.exchange || 'NSE', evt) : undefined}
                        onReplayModeChange={onReplayModeChange ? (isActive) => onReplayModeChange(chart.id, isActive) : undefined}
                        {...chartProps}
                        indicators={chart.indicators}
                        comparisonSymbols={chart.comparisonSymbols}
                        strategyConfig={chart.strategyConfig}
                        showTodayOnly={isSyncEnabled}
                    />
                </div>
            ))}
        </div>
    );
};

export default ChartGrid;
