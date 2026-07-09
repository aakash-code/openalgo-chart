import React, { useState, useEffect, useRef, memo } from 'react';
import type { ChangeEvent } from 'react';
import { Briefcase, X, Plus, Minus } from 'lucide-react';
import styles from './TradingPanel.module.css';
import { subscribeToTicker, placeOrder, getLotSize } from '../../services/openalgo';
import { validateOrder, createOrderPayload } from '../../utils/shared/orderUtils';
import { PRODUCTS, FNO_EXCHANGES } from '../../constants/orderConstants';
import { useOrders } from '../../context/OrderContext';
import logger from '../../utils/logger';

type OrderAction = 'BUY' | 'SELL';
type OrderType = 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';
type ProductType = 'MIS' | 'CNC' | 'NRML';

interface TickerData {
    close: number;
    [key: string]: unknown;
}

interface TickerSubscription {
    close: () => void;
}

interface OrderResult {
    status: 'success' | 'error';
    orderid?: string;
    message?: string;
}

export interface TradingPanelProps {
    symbol: string;
    exchange?: string;
    isOpen: boolean;
    onClose: () => void;
    showToast?: (message: string, type?: string) => void;
    initialAction?: OrderAction;
    initialPrice?: string;
    initialOrderType?: OrderType;
}

const TradingPanel: React.FC<TradingPanelProps> = ({
    symbol,
    exchange = 'NSE',
    isOpen,
    onClose,
    showToast,
    initialAction = 'BUY',
    initialPrice = '',
    initialOrderType = 'MARKET'
}) => {
    // Get refresh function from OrderContext for event-driven updates
    const { refresh: refreshOrders } = useOrders();

    // Local State - use initial values from props
    const [action, setAction] = useState<OrderAction>(initialAction);
    const [orderType, setOrderType] = useState<OrderType>(initialOrderType);
    const [product, setProduct] = useState<ProductType>(PRODUCTS.MIS as ProductType);
    const [quantity, setQuantity] = useState('1');
    const [price, setPrice] = useState(initialPrice);
    const [triggerPrice, setTriggerPrice] = useState('');

    // Lot Size State
    const [lotSize, setLotSize] = useState(1);
    const [isLoadingLotSize, setIsLoadingLotSize] = useState(false);

    // Market Data State
    const [ltp, setLtp] = useState(0);
    const [isSubscribed, setIsSubscribed] = useState(false);

    // UI State
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Check if F&O instrument (requires lot size handling)
    const isFnO = FNO_EXCHANGES.includes(exchange as any);

    // Refs
    const unsubscribeRef = useRef<(() => void) | null>(null);

    // Subscribe to Ticker when panel is open and symbol changes
    useEffect(() => {
        if (!isOpen || !symbol) return;

        // Reset subscription
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        setIsSubscribed(true);
        const sub = subscribeToTicker(symbol, exchange, '1d', ((data: TickerData) => {
            setLtp(data.close);
        }) as any) as TickerSubscription;

        unsubscribeRef.current = sub.close;

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
            setIsSubscribed(false);
        };
    }, [isOpen, symbol, exchange]);

    // Sync state when initial values change (from context menu)
    useEffect(() => {
        if (isOpen) {
            setAction(initialAction);
            setOrderType(initialOrderType);
            if (initialPrice) {
                setPrice(initialPrice);
            }
        }
    }, [isOpen, initialAction, initialOrderType, initialPrice]);

    // Fetch lot size when symbol/exchange changes
    useEffect(() => {
        if (!isOpen || !symbol) return;

        const fetchLotSize = async (): Promise<void> => {
            setIsLoadingLotSize(true);
            try {
                const fetchedLotSize = await getLotSize(symbol, exchange);
                setLotSize(fetchedLotSize);
                // Auto-fill quantity with lot size for F&O instruments
                if (fetchedLotSize > 1) {
                    setQuantity(String(fetchedLotSize));
                } else {
                    setQuantity('1');
                }
            } catch (error) {
                logger.error('Error fetching lot size:', error);
                setLotSize(1);
                setQuantity('1');
            } finally {
                setIsLoadingLotSize(false);
            }
        };

        fetchLotSize();
    }, [isOpen, symbol, exchange]);

    // Quantity adjustment functions
    const incrementQuantity = (): void => {
        const currentQty = parseInt(quantity, 10) || 0;
        setQuantity(String(currentQty + lotSize));
    };

    const decrementQuantity = (): void => {
        const currentQty = parseInt(quantity, 10) || 0;
        const newQty = currentQty - lotSize;
        if (newQty >= lotSize) {
            setQuantity(String(newQty));
        }
    };

    // Handle Order Placement
    const handleSubmit = async (): Promise<void> => {
        // Use centralized validation
        const validation = validateOrder({
            symbol,
            exchange,
            action,
            quantity,
            orderType,
            price,
            triggerPrice,
            lotSize,
        });

        if (!validation.isValid) {
            // Show first error
            const firstError = Object.values(validation.errors)[0];
            if (showToast) showToast(firstError, 'error');
            return;
        }

        setIsSubmitting(true);

        // Use centralized payload creation
        const orderDetails = createOrderPayload({
            symbol,
            exchange,
            action,
            quantity,
            product,
            orderType,
            price,
            triggerPrice,
            strategy: 'MANUAL_PANEL',
        });

        try {
            const result = await placeOrder(orderDetails as any) as OrderResult;
            if (result.status === 'success') {
                if (showToast) showToast(`Order Placed: ${result.orderid}`, 'success');
                // Event-driven: Refresh orders immediately after successful placement
                refreshOrders();
            } else {
                if (showToast) showToast(`Order Failed: ${result.message}`, 'error');
            }
        } catch (error) {
            if (showToast) showToast('Failed to place order', 'error');
            logger.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // Helper to render price input availability
    const showPrice = orderType === 'LIMIT' || orderType === 'SL';
    const showTrigger = orderType === 'SL' || orderType === 'SL-M';

    const ORDER_TYPE_OPTIONS: OrderType[] = ['MARKET', 'LIMIT', 'SL', 'SL-M'];

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.title}>
                    <Briefcase size={16} />
                    <span>Order Panel</span>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.iconBtn} onClick={onClose} title="Close">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Symbol Info */}
            <div className={styles.symbolSection}>
                <div className={styles.symbolInfo}>
                    <div>
                        <span className={styles.symbolName}>{symbol}</span>
                        <span className={styles.exchange}>{exchange}</span>
                    </div>
                    <div className={styles.priceDisplay}>
                        <div className={styles.ltp}>{ltp > 0 ? ltp.toFixed(2) : '--.--'}</div>
                    </div>
                </div>
            </div>

            {/* Order Type Tabs */}
            <div className={styles.paddingH}>
                <div className={styles.tabs}>
                    <div className={`${styles.tab} ${styles.activeTab}`}>Order</div>
                    <div className={styles.tab} onClick={() => { if (showToast) showToast('DOM View available in dedicated panel', 'info'); }}>DOM</div>
                </div>
            </div>

            {/* Action Toggles */}
            <div className={styles.actionToggles}>
                <button
                    className={`${styles.actionBtn} ${action === 'BUY' ? styles.activeBuy : ''}`}
                    onClick={() => setAction('BUY')}
                >
                    Buy
                </button>
                <button
                    className={`${styles.actionBtn} ${action === 'SELL' ? styles.activeSell : ''}`}
                    onClick={() => setAction('SELL')}
                >
                    Sell
                </button>
            </div>

            {/* Form */}
            <div className={styles.form}>

                {/* Order Type Selection */}
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Order Type</label>
                    <div className={styles.typeTabs}>
                        {ORDER_TYPE_OPTIONS.map(t => (
                            <button
                                key={t}
                                className={`${styles.typeTab} ${orderType === t ? styles.activeType : ''}`}
                                onClick={() => setOrderType(t)}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quantity */}
                <div className={styles.inputGroup}>
                    <label className={styles.label}>
                        Quantity
                        {lotSize > 1 && (
                            <span className={styles.lotSizeLabel}>
                                {isLoadingLotSize ? ' (Loading...)' : ` (Lot: ${lotSize})`}
                            </span>
                        )}
                    </label>
                    <div className={styles.quantityWrapper}>
                        <button
                            type="button"
                            className={styles.qtyBtn}
                            onClick={decrementQuantity}
                            disabled={parseInt(quantity, 10) <= lotSize}
                            title={`Decrease by ${lotSize}`}
                        >
                            <Minus size={14} />
                        </button>
                        <input
                            type="number"
                            className={styles.quantityInput}
                            value={quantity}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setQuantity(e.target.value)}
                            min={lotSize}
                            step={lotSize}
                        />
                        <button
                            type="button"
                            className={styles.qtyBtn}
                            onClick={incrementQuantity}
                            title={`Increase by ${lotSize}`}
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    {lotSize > 1 && (
                        <div className={styles.lotsInfo}>
                            {Math.floor(parseInt(quantity, 10) / lotSize) || 0} lot(s) = {quantity} qty
                        </div>
                    )}
                </div>

                {/* Price (Conditional) */}
                {showPrice && (
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Price</label>
                        <div className={styles.inputWrapper}>
                            <input
                                type="number"
                                className={styles.input}
                                value={price}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setPrice(e.target.value)}
                                placeholder={ltp > 0 ? ltp.toFixed(2) : "0.00"}
                            />
                        </div>
                    </div>
                )}

                {/* Trigger Price (Conditional) */}
                {showTrigger && (
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Trigger Price</label>
                        <div className={styles.inputWrapper}>
                            <input
                                type="number"
                                className={styles.input}
                                value={triggerPrice}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setTriggerPrice(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                )}

                {/* Product */}
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Product</label>
                    <select
                        className={styles.select}
                        value={product}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setProduct(e.target.value as ProductType)}
                    >
                        <option value="MIS">Intraday (MIS)</option>
                        <option value="CNC">Longterm (CNC)</option>
                        <option value="NRML">Overnight (NRML)</option>
                    </select>
                </div>
            </div>

            {/* Margin Info - Outside scrollable form */}
            <div className={styles.marginInfo}>
                <span>Required Margin</span>
                <span>--</span>
            </div>

            {/* LTP Info */}
            <div className={styles.marginInfo}>
                <span>LTP</span>
                <span className={styles.ltpValue}>{ltp > 0 ? ltp.toFixed(2) : '--.--'}</span>
            </div>

            {/* Submit Button */}
            <div className={styles.footer}>
                <button
                    className={`${styles.submitBtn} ${action === 'BUY' ? styles.btnBuy : styles.btnSell}`}
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                >
                    {isSubmitting ? 'Sending...' : `${action} ${symbol} ${orderType}`}
                </button>
            </div>
        </div>
    );
};

export default memo(TradingPanel);
