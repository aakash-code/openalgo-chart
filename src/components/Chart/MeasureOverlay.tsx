/**
 * MeasureOverlay Component
 * Displays the shift+click quick measure tool overlay
 */

import React from 'react';
import styles from './ChartComponent.module.css';

interface LineCoordinates {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

interface Position {
    x: number;
    y: number;
}

interface MeasureData {
    isFirstPoint?: boolean;
    x?: number;
    y?: number;
    position?: Position;
    line?: LineCoordinates;
    priceChange?: number;
    percentChange?: number;
    barCount?: number;
    timeElapsed?: string;
}

export interface MeasureOverlayProps {
    measureData: MeasureData | null;
}

const MeasureOverlay: React.FC<MeasureOverlayProps> = ({ measureData }) => {
    if (!measureData) return null;

    // First point indicator (small dot)
    if (measureData.isFirstPoint) {
        return (
            <div
                className={styles.measureStartPoint}
                style={{
                    left: (measureData.x ?? 0) - 4,
                    top: (measureData.y ?? 0) - 4,
                }}
            />
        );
    }

    // Full measurement overlay with line and details
    if (!measureData.position || !measureData.line) return null;

    const priceChange = measureData.priceChange ?? 0;
    const percentChange = measureData.percentChange ?? 0;

    return (
        <div
            className={styles.measureOverlay}
            style={{
                left: measureData.position.x,
                top: measureData.position.y,
            }}
        >
            {/* Dashed line between points */}
            <svg
                className={styles.measureLine}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 99,
                }}
            >
                <line
                    x1={measureData.line.x1}
                    y1={measureData.line.y1}
                    x2={measureData.line.x2}
                    y2={measureData.line.y2}
                    stroke={priceChange >= 0 ? '#26a69a' : '#ef5350'}
                    strokeWidth="1"
                    strokeDasharray="4,4"
                />
            </svg>
            <div className={styles.measureBox}>
                <div className={priceChange >= 0 ? styles.measureUp : styles.measureDown}>
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}
                    {' '}({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%)
                </div>
                <div className={styles.measureDetails}>
                    {measureData.barCount} bars · {measureData.timeElapsed}
                </div>
            </div>
        </div>
    );
};

export default MeasureOverlay;
