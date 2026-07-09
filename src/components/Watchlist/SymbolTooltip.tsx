import React from 'react';
import { createPortal } from 'react-dom';
import styles from './SymbolTooltip.module.css';
import classNames from 'classnames';

interface TooltipContent {
    fullName?: string;
    symbol: string;
    exchange: string;
    dataType?: string;
    isMarketOpen?: boolean;
}

interface Position {
    x: number;
    y: number;
}

export interface SymbolTooltipProps {
    isVisible: boolean;
    content: TooltipContent | null;
    position: Position;
}

/**
 * SymbolTooltip - TradingView-style tooltip for watchlist symbols
 *
 * Shows:
 * - Full symbol name (e.g., "Nifty 50 Index")
 * - Exchange (e.g., "NSE")
 * - Data type (e.g., "Real-time")
 * - Market status (e.g., "Market open" / "Market closed")
 */

const SymbolTooltip: React.FC<SymbolTooltipProps> = ({
    isVisible,
    content,
    position,
}) => {
    if (!isVisible || !content) return null;

    const {
        fullName,
        symbol,
        exchange,
        dataType = 'Real-time',
        isMarketOpen = false,
    } = content;

    // Calculate tooltip position to avoid going off-screen
    const tooltipStyle: React.CSSProperties = {
        left: Math.min(position.x, window.innerWidth - 250),
        top: position.y + 20, // Below the cursor
    };

    // Ensure tooltip doesn't go below viewport
    if ((tooltipStyle.top as number) + 80 > window.innerHeight) {
        tooltipStyle.top = position.y - 80; // Above the cursor instead
    }

    const tooltipContent = (
        <div
            className={styles.tooltip}
            style={tooltipStyle}
        >
            <div className={styles.tooltipName}>
                {fullName || symbol}
            </div>
            <div className={classNames(styles.tooltipDetails, {
                [styles.marketOpen]: isMarketOpen
            })}>
                <span>{exchange}</span>
                <span className={styles.tooltipDot} />
                <span>{dataType}</span>
                <span className={styles.tooltipDot} />
                <span className={styles.marketStatus}>
                    {isMarketOpen ? 'Market open' : 'Market closed'}
                </span>
            </div>
        </div>
    );

    // Render to body via portal to avoid z-index issues
    return createPortal(tooltipContent, document.body);
};

export default React.memo(SymbolTooltip);
