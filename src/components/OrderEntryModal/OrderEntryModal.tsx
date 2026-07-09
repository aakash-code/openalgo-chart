import React from 'react';
import type { FC } from 'react';
import styles from './OrderEntryModal.module.css';
import TradingPanel from '../TradingPanel/TradingPanel';
import { BaseModal } from '../shared';

type OrderAction = 'BUY' | 'SELL';
type OrderType = 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';

export interface OrderEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    symbol: string;
    exchange: string;
    showToast?: (message: string, type?: string) => void;
    initialAction?: OrderAction;
    initialPrice?: string;
    initialOrderType?: OrderType;
}

const OrderEntryModal: FC<OrderEntryModalProps> = ({
    isOpen,
    onClose,
    symbol,
    exchange,
    showToast,
    initialAction,
    initialPrice,
    initialOrderType
}) => {
    // Esc key handled by BaseModal

    if (!isOpen) return null;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            showHeader={false}
            noPadding={true}
            size="small"
        >
            <TradingPanel
                symbol={symbol}
                exchange={exchange}
                isOpen={true}
                onClose={onClose}
                showToast={showToast}
                initialAction={initialAction}
                initialPrice={initialPrice}
                initialOrderType={initialOrderType}
            />
        </BaseModal>
    );
};

export default OrderEntryModal;
