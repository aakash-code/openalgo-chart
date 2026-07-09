import React, { useState, useCallback, useEffect } from 'react';
import type { MouseEvent } from 'react';
import styles from './GlobalAlertPopup.module.css';

interface AlertNotification {
    id: string;
    symbol: string;
    exchange: string;
    direction?: 'up' | 'down';
    price?: number;
    timestamp: number;
    // Indicator alert fields
    alertType?: 'price' | 'indicator';
    indicator?: string;
    condition?: string;
    message?: string;
    currentPrice?: number;
}

interface SymbolInfo {
    symbol: string;
    exchange: string;
}

export interface GlobalAlertPopupProps {
    alerts: AlertNotification[];
    onDismiss?: (alertId: string) => void;
    onClick?: (symbolInfo: SymbolInfo) => void;
}

/**
 * GlobalAlertPopup - Shows alert notifications for background alerts
 * Works independently of which chart is currently being viewed
 */
const GlobalAlertPopup: React.FC<GlobalAlertPopupProps> = ({ alerts, onDismiss, onClick }) => {
    const [dismissing, setDismissing] = useState<Record<string, boolean>>({});

    const handleDismiss = useCallback((alertId: string): void => {
        setDismissing(prev => ({ ...prev, [alertId]: true }));
        setTimeout(() => {
            onDismiss?.(alertId);
            setDismissing(prev => {
                const next = { ...prev };
                delete next[alertId];
                return next;
            });
        }, 300);
    }, [onDismiss]);

    // Auto-dismiss after 60 seconds
    useEffect(() => {
        const timers: Record<string, ReturnType<typeof setTimeout>> = {};
        alerts.forEach(alert => {
            timers[alert.id] = setTimeout(() => {
                handleDismiss(alert.id);
            }, 60000);
        });

        return () => {
            Object.values(timers).forEach(t => clearTimeout(t));
        };
    }, [alerts, handleDismiss]);

    const handleClick = useCallback((alert: AlertNotification, e: MouseEvent<HTMLDivElement>): void => {
        // Don't navigate if clicking close button
        if ((e.target as HTMLElement).closest('button')) return;

        if (onClick) {
            onClick({ symbol: alert.symbol, exchange: alert.exchange });
            handleDismiss(alert.id);
        }
    }, [onClick, handleDismiss]);

    const formatTime = (timestamp: number): string => {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };

    if (!alerts || alerts.length === 0) return null;

    return (
        <div className={styles.container}>
            {alerts.map(alert => {
                const isIndicatorAlert = alert.alertType === 'indicator';
                const icon = isIndicatorAlert ? '📊' : '🪙';
                const header = isIndicatorAlert
                    ? `${alert.indicator?.toUpperCase() || 'Indicator'} Alert`
                    : `Alert on ${alert.symbol}`;
                const message = isIndicatorAlert
                    ? (alert.message || `${alert.indicator} ${alert.condition}`)
                    : `${alert.symbol} Crossing ${alert.direction === 'up' ? '↑' : '↓'} ${alert.price}`;

                return (
                    <div
                        key={alert.id}
                        className={`${styles.notification} ${dismissing[alert.id] ? styles.dismissing : ''}`}
                        onClick={(e) => handleClick(alert, e)}
                        style={{ cursor: 'pointer' }}
                        title="Click to view chart"
                    >
                        {/* Icon */}
                        <div className={styles.icon}>{icon}</div>

                        {/* Content */}
                        <div className={styles.content}>
                            <div className={styles.header}>{header}</div>
                            <div className={styles.message}>{message}</div>
                            <div className={styles.footer}>
                                <span className={styles.viewChart}>{alert.symbol} →</span>
                                <span className={styles.timestamp}>{formatTime(alert.timestamp)}</span>
                            </div>
                        </div>

                        {/* Close button */}
                        <button
                            className={styles.closeBtn}
                            onClick={() => handleDismiss(alert.id)}
                        >
                            ×
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default GlobalAlertPopup;
