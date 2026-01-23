import React, { useEffect } from 'react';
import styles from './OrderEntryModal.module.css';
import TradingPanel from '../TradingPanel/TradingPanel';

const OrderEntryModal = ({
    isOpen,
    onClose,
    symbol,
    exchange,
    showToast,
    initialAction,
    initialPrice,
    initialOrderType
}) => {
    // Close on Escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
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
            </div>
        </div>
    );
};

export default OrderEntryModal;
