/**
 * CancelOrderModal Component
 * Modal for confirming order cancellation
 */
import React, { memo } from 'react';
import styles from '../AccountPanel.module.css';
import { DangerDialog } from '../../shared';

interface Order {
    symbol: string;
    action: string;
    quantity: string | number;
    price: string | number;
    order_status: string;
    orderid?: string;
}

export interface CancelOrderModalProps {
    isOpen: boolean;
    order: Order | null;
    onClose: () => void;
    onConfirm: () => void;
    isCancelling: boolean;
}

const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
    isOpen,
    order,
    onClose,
    onConfirm,
    isCancelling
}) => {
    if (!isOpen || !order) return null;

    return (
        <DangerDialog
            isOpen={isOpen}
            onCancel={onClose}
            onConfirm={onConfirm}
            title="Cancel Order"
            message="Are you sure you want to cancel this order?"
            confirmText={isCancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
            cancelText="No, Keep Order"
            loading={isCancelling}
        >
            {/* Order Details */}
            <div className={styles.cancelOrderDetails}>
                <div className={styles.orderDetails}>
                    <div className={styles.orderDetailRow}>
                        <span className={styles.orderDetailLabel}>Symbol:</span>
                        <span className={styles.orderDetailValue}>{order.symbol}</span>
                    </div>
                    <div className={styles.orderDetailRow}>
                        <span className={styles.orderDetailLabel}>Action:</span>
                        <span className={`${styles.orderDetailValue} ${order.action === 'BUY' ? styles.positive : styles.negative}`}>
                            {order.action}
                        </span>
                    </div>
                    <div className={styles.orderDetailRow}>
                        <span className={styles.orderDetailLabel}>Quantity:</span>
                        <span className={styles.orderDetailValue}>{order.quantity}</span>
                    </div>
                    <div className={styles.orderDetailRow}>
                        <span className={styles.orderDetailLabel}>Price:</span>
                        <span className={styles.orderDetailValue}>₹{order.price}</span>
                    </div>
                    <div className={styles.orderDetailRow}>
                        <span className={styles.orderDetailLabel}>Status:</span>
                        <span className={styles.orderDetailValue}>{order.order_status}</span>
                    </div>
                    <div className={styles.orderDetailRow}>
                        <span className={styles.orderDetailLabel}>Order ID:</span>
                        <span className={styles.orderDetailValue}>{order.orderid}</span>
                    </div>
                </div>
            </div>
        </DangerDialog>
    );
};

export default memo(CancelOrderModal);
