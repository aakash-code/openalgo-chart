/**
 * ChartContextMenu Component
 * Displays the right-click context menu for chart interactions
 * TradingView-style comprehensive context menu
 */

import React, { useCallback } from 'react';
import { useUser } from '../../context/UserContext';
import logger from '../../utils/logger';
import { BaseContextMenu, MenuItem, MenuDivider } from '../shared';
import { formatCurrency, formatPrice } from '../../utils/shared/formatters';

// Icons for menu items
const ResetIcon: React.FC = () => (
    <svg viewBox="0 0 18 18" width="18" height="18" fill="currentColor">
        <path d="M9 3.5V1L5.5 4.5 9 8V5.5c2.49 0 4.5 2.01 4.5 4.5s-2.01 4.5-4.5 4.5S4.5 12.49 4.5 10H3c0 3.31 2.69 6 6 6s6-2.69 6-6-2.69-6-6-6z" />
    </svg>
);

const AlertIcon: React.FC = () => (
    <svg viewBox="0 0 18 18" width="18" height="18" fill="currentColor">
        <path d="M9 16c.83 0 1.5-.67 1.5-1.5h-3c0 .83.67 1.5 1.5 1.5zm4.5-4.5V8c0-2.43-1.72-4.44-4-4.9V2.5c0-.55-.45-1-1-1s-1 .45-1 1v.6c-2.28.46-4 2.47-4 4.9v3.5L2 13v.5h14V13l-1.5-1.5z" />
    </svg>
);

const SellIcon: React.FC = () => (
    <svg viewBox="0 0 18 18" width="18" height="18" fill="currentColor">
        <path d="M9 4l-4 4h3v6h2V8h3z" transform="rotate(180 9 9)" />
    </svg>
);

const BuyIcon: React.FC = () => (
    <svg viewBox="0 0 18 18" width="18" height="18" fill="currentColor">
        <path d="M9 4l-4 4h3v6h2V8h3z" />
    </svg>
);

const OrderIcon: React.FC = () => (
    <svg viewBox="0 0 18 18" width="18" height="18" fill="currentColor">
        <path d="M3 3h12v2H3V3zm0 4h12v2H3V7zm0 4h8v2H3v-2zm10 0h2v4h-2v-4zm-2 2h6v2h-6v-2z" />
    </svg>
);

const LockIcon: React.FC = () => (
    <svg viewBox="0 0 18 18" width="18" height="18" fill="currentColor">
        <path d="M14 8h-1V6c0-2.21-1.79-4-4-4S5 3.79 5 6v2H4c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1h10c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zM6.5 6c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v2h-5V6zM14 17H4V9h10v8zm-5-3c.83 0 1.5-.67 1.5-1.5S9.83 11 9 11s-1.5.67-1.5 1.5S8.17 14 9 14z" />
    </svg>
);

const ObjectTreeIcon: React.FC = () => (
    <svg viewBox="0 0 18 18" width="18" height="18" fill="currentColor">
        <path d="M3 3h4v4H3V3zm0 6h4v4H3V9zm6-6h6v4H9V3zm0 6h6v4H9V9z" />
    </svg>
);

const RemoveIcon: React.FC = () => (
    <svg viewBox="0 0 18 18" width="18" height="18" fill="currentColor">
        <path d="M14 5H4v10h10V5zm-2 7H6v-1h6v1zM5 4h8v1H5V4z" />
    </svg>
);

const SettingsIcon: React.FC = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
);

const CopyIcon: React.FC = () => (
    <svg viewBox="0 0 18 18" width="18" height="18" fill="currentColor">
        <path d="M12 1H4c-1.1 0-2 .9-2 2v10h2V3h8V1zm3 4H8c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h7c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 12H8V7h7v10z" />
    </svg>
);

type OrderType = 'LIMIT' | 'SL';

export interface ChartContextMenuProps {
    show: boolean;
    x: number;
    y: number;
    orderId?: string | null;
    symbol: string;
    exchange: string;
    price: number | null;
    ltp?: number | null;
    indicatorCount?: number;
    isVerticalCursorLocked?: boolean;
    onCancelOrder?: (orderId: string) => void;
    onOpenOptionChain?: (symbol: string, exchange: string) => void;
    onResetChartView?: () => void;
    onCopyPrice?: (price: number) => void;
    onAddAlert?: (price: number) => void;
    onPlaceSellOrder?: (price: number, type: OrderType) => void;
    onPlaceBuyOrder?: (price: number, type: OrderType) => void;
    onAddOrder?: (price: number) => void;
    onToggleCursorLock?: () => void;
    onOpenObjectTree?: () => void;
    onRemoveIndicator?: () => void;
    onOpenSettings?: () => void;
    onClose: () => void;
}

const ChartContextMenu: React.FC<ChartContextMenuProps> = ({
    show,
    x,
    y,
    orderId,
    symbol,
    exchange,
    price,
    ltp = null,
    indicatorCount = 0,
    isVerticalCursorLocked = false,
    onCancelOrder,
    onOpenOptionChain,
    onResetChartView,
    onCopyPrice,
    onAddAlert,
    onPlaceSellOrder,
    onPlaceBuyOrder,
    onAddOrder,
    onToggleCursorLock,
    onOpenObjectTree,
    onRemoveIndicator,
    onOpenSettings,
    onClose
}) => {
    const { isAuthenticated } = useUser();

    // Determine if clicked price is above or below LTP
    const isAboveLTP = ltp != null && price != null && price > ltp;
    const isBelowLTP = ltp != null && price != null && price < ltp;

    // Format price for display
    const formattedPrice = price != null ? formatCurrency(price, { showSymbol: false, decimals: 2 }) : '—';

    const handleCopyPrice = useCallback((): void => {
        if (price != null) {
            // Copy price with exactly 2 decimal places
            const formattedPriceToCopy = price.toFixed(2);
            navigator.clipboard.writeText(formattedPriceToCopy);
            onCopyPrice?.(price);
        }
        onClose();
    }, [price, onCopyPrice, onClose]);

    const handlePaste = useCallback((): void => {
        navigator.clipboard.readText().then(text => {
            logger.debug('Pasted:', text);
        }).catch(err => {
            logger.warn('Failed to read clipboard:', err);
        });
        onClose();
    }, [onClose]);

    return (
        <BaseContextMenu
            isVisible={show}
            position={{ x, y }}
            onClose={onClose}
            width={280}
        >
            {/* Reset Chart View */}
            <MenuItem
                icon={ResetIcon}
                label="Reset chart view"
                onClick={onResetChartView}
                shortcut="Alt + R"
            />

            <MenuDivider />

            {/* Copy Price */}
            <MenuItem
                icon={CopyIcon}
                label={`Copy price ${formattedPrice}`}
                onClick={handleCopyPrice}
            />

            {/* Paste */}
            <MenuItem
                label="Paste"
                onClick={handlePaste}
                shortcut="Ctrl + V"
            />

            <MenuDivider />

            {/* Add Alert */}
            <MenuItem
                icon={AlertIcon}
                label={`Add alert on ${symbol} at ${formattedPrice}...`}
                onClick={() => onAddAlert?.(price ?? 0)}
                shortcut="Alt + A"
            />

            {/* Trading options - only show when authenticated */}
            {isAuthenticated && (
                <>
                    {/* Trade Option 1: Limit Order */}
                    <MenuItem
                        icon={isAboveLTP || !isBelowLTP ? SellIcon : BuyIcon}
                        label={isAboveLTP || !isBelowLTP
                            ? `Sell 1 ${symbol} @ ${formattedPrice} limit`
                            : `Buy 1 ${symbol} @ ${formattedPrice} limit`
                        }
                        onClick={() => {
                            if (price != null) {
                                if (isAboveLTP || !isBelowLTP) {
                                    onPlaceSellOrder?.(price, 'LIMIT');
                                } else {
                                    onPlaceBuyOrder?.(price, 'LIMIT');
                                }
                            }
                            onClose();
                        }}
                        shortcut={isAboveLTP || !isBelowLTP ? 'Alt + Shift + S' : 'Alt + Shift + B'}
                    />

                    {/* Trade Option 2: Stop Order */}
                    <MenuItem
                        icon={isAboveLTP || !isBelowLTP ? BuyIcon : SellIcon}
                        label={isAboveLTP || !isBelowLTP
                            ? `Buy 1 ${symbol} @ ${formattedPrice} stop`
                            : `Sell 1 ${symbol} @ ${formattedPrice} stop`
                        }
                        onClick={() => {
                            if (price != null) {
                                if (isAboveLTP || !isBelowLTP) {
                                    onPlaceBuyOrder?.(price, 'SL');
                                } else {
                                    onPlaceSellOrder?.(price, 'SL');
                                }
                            }
                            onClose();
                        }}
                    />

                    {/* Add Order */}
                    <MenuItem
                        icon={OrderIcon}
                        label={`Add order on ${symbol} at ${formattedPrice}...`}
                        onClick={() => onAddOrder?.(price ?? 0)}
                        shortcut="Shift + T"
                    />
                </>
            )}

            <MenuDivider />

            {/* Lock Vertical Cursor Line */}
            <MenuItem
                icon={LockIcon}
                label={isVerticalCursorLocked ? "Unlock vertical cursor line" : "Lock vertical cursor line by time"}
                onClick={onToggleCursorLock}
            />

            <MenuDivider />

            {/* Object Tree */}
            <MenuItem
                icon={ObjectTreeIcon}
                label="Object Tree..."
                onClick={onOpenObjectTree}
            />

            {/* Remove Indicator */}
            {indicatorCount > 0 && (
                <MenuItem
                    icon={RemoveIcon}
                    label={`Remove ${indicatorCount} indicator${indicatorCount > 1 ? 's' : ''}`}
                    onClick={onRemoveIndicator}
                />
            )}

            {/* Cancel Order */}
            {orderId && (
                <>
                    <MenuDivider />
                    <MenuItem
                        label="Cancel Order"
                        onClick={() => onCancelOrder?.(orderId)}
                        danger
                    />
                </>
            )}

            <MenuDivider />

            {/* View Option Chain */}
            <MenuItem
                label="View Option Chain"
                onClick={() => onOpenOptionChain?.(symbol, exchange)}
            />

            {/* Settings */}
            <MenuItem
                icon={SettingsIcon}
                label="Settings..."
                onClick={onOpenSettings}
            />
        </BaseContextMenu>
    );
};

export default ChartContextMenu;
