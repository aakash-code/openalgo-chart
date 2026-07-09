/**
 * Order Utilities
 * Centralized order validation and payload construction utilities
 * Eliminates duplicate validation logic across TradingPanel, ModifyOrderModal, ExitPositionModal
 */

import {
    ORDER_TYPES,
    PRODUCTS,
    ORDER_ACTIONS,
    FNO_EXCHANGES,
    PRICE_REQUIRED_ORDER_TYPES,
    TRIGGER_REQUIRED_ORDER_TYPES,
} from '../../constants/orderConstants';

// Import safe parse functions from centralized module (avoid duplication)
import { safeParseFloat, safeParseInt } from '../safeParse';

// Re-export for backward compatibility
export { safeParseFloat, safeParseInt };

/**
 * Validation errors map - field name to error message
 */
export interface ValidationErrors {
    symbol?: string;
    action?: string;
    quantity?: string;
    price?: string;
    triggerPrice?: string;
    [key: string]: string | undefined;
}

/**
 * Validation result type
 */
export interface ValidationResult {
    /** Whether the order is valid */
    isValid: boolean;
    /** Map of field name to error message */
    errors: ValidationErrors;
}

/**
 * Order parameters for validation
 */
export interface OrderValidationParams {
    /** Trading symbol */
    symbol: string;
    /** Exchange code */
    exchange: string;
    /** BUY or SELL */
    action: string;
    /** Order quantity */
    quantity: string | number;
    /** Order type (MARKET, LIMIT, SL, SL-M) */
    orderType: string;
    /** Limit price (required for LIMIT, SL) */
    price?: string | number;
    /** Trigger price (required for SL, SL-M) */
    triggerPrice?: string | number;
    /** Lot size for F&O instruments */
    lotSize?: number;
}

/**
 * Parameters for creating order payload
 */
export interface OrderPayloadParams {
    /** Trading symbol */
    symbol: string;
    /** Exchange code (default: 'NSE') */
    exchange?: string;
    /** BUY or SELL */
    action: string;
    /** Order quantity */
    quantity: string | number;
    /** Product type (default: MIS) */
    product?: string;
    /** Order type (default: MARKET) */
    orderType?: string;
    /** Limit price (default: 0) */
    price?: string | number;
    /** Trigger price (default: 0) */
    triggerPrice?: string | number;
    /** Strategy name (default: 'MANUAL') */
    strategy?: string;
    /** Disclosed quantity (default: 0) */
    disclosedQuantity?: string | number;
    /** Order ID for modify orders */
    orderId?: string | null;
}

/**
 * Order payload structure for API
 */
export interface OrderPayload {
    symbol: string;
    exchange: string;
    action: string;
    quantity: number;
    product: string;
    pricetype: string;
    price: number;
    trigger_price: number;
    strategy: string;
    disclosed_quantity: number;
    orderid?: string;
}

/**
 * Normalize status string for comparison
 * Converts to uppercase and replaces spaces with underscores
 * @param status - Status string to normalize
 * @returns Normalized status
 */
export const normalizeStatus = (status: string | null | undefined): string => {
    return (status || '').toUpperCase().replace(/\s+/g, '_');
};

/**
 * Check if exchange is F&O (requires lot size validation)
 * @param exchange - Exchange code
 * @returns Whether the exchange is F&O
 */
export const isFnOExchange = (exchange: string): boolean => {
    return FNO_EXCHANGES.includes(exchange as any);
};

/**
 * Validate order parameters
 * Centralizes all order validation logic used by TradingPanel, ModifyOrderModal, ExitPositionModal
 *
 * @param order - Order parameters
 * @returns Validation result with isValid flag and errors map
 */
export const validateOrder = ({
    symbol,
    exchange,
    action,
    quantity,
    orderType,
    price,
    triggerPrice,
    lotSize = 1,
}: OrderValidationParams): ValidationResult => {
    const errors: ValidationErrors = {};

    // Symbol validation
    if (!symbol || symbol.trim() === '') {
        errors.symbol = 'Symbol is required';
    }

    // Action validation
    if (!action || !Object.values(ORDER_ACTIONS).includes(action as any)) {
        errors.action = 'Invalid action (must be BUY or SELL)';
    }

    // Quantity validation
    const qtyNum = safeParseInt(quantity, 0);
    if (qtyNum <= 0) {
        errors.quantity = 'Quantity must be greater than 0';
    }

    // Lot size validation for F&O instruments
    if (lotSize > 1 && qtyNum > 0 && qtyNum % lotSize !== 0) {
        errors.quantity = `Quantity must be a multiple of lot size (${lotSize})`;
    }

    // Price validation (for LIMIT and SL orders)
    if (PRICE_REQUIRED_ORDER_TYPES.includes(orderType as any)) {
        const priceNum = safeParseFloat(price, 0);
        if (priceNum <= 0) {
            errors.price = 'Price must be greater than 0';
        }
    }

    // Trigger price validation (for SL and SL-M orders)
    if (TRIGGER_REQUIRED_ORDER_TYPES.includes(orderType as any)) {
        const triggerNum = safeParseFloat(triggerPrice, 0);
        if (triggerNum <= 0) {
            errors.triggerPrice = 'Trigger price must be greater than 0';
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
};

/**
 * Create standardized order payload for API
 * Ensures consistent field naming and types
 *
 * @param params - Order parameters
 * @returns Formatted order payload ready for API
 */
export const createOrderPayload = ({
    symbol,
    exchange = 'NSE',
    action,
    quantity,
    product = PRODUCTS.MIS,
    orderType = ORDER_TYPES.MARKET,
    price = 0,
    triggerPrice = 0,
    strategy = 'MANUAL',
    disclosedQuantity = 0,
    orderId = null,
}: OrderPayloadParams): OrderPayload => {
    const payload: OrderPayload = {
        symbol,
        exchange,
        action,
        quantity: safeParseInt(quantity),
        product,
        pricetype: orderType,
        price: orderType === ORDER_TYPES.MARKET ? 0 : safeParseFloat(price),
        trigger_price: TRIGGER_REQUIRED_ORDER_TYPES.includes(orderType as any)
            ? safeParseFloat(triggerPrice)
            : 0,
        strategy,
        disclosed_quantity: safeParseInt(disclosedQuantity),
    };

    // Add orderId for modify orders
    if (orderId) {
        payload.orderid = orderId;
    }

    return payload;
};

/**
 * Format quantity with lot size information
 * @param qty - Quantity
 * @param lotSize - Lot size
 * @returns Formatted string like "100 (2L)" for 2 lots
 */
export const formatQuantityWithLots = (
    qty: number | string,
    lotSize: number = 1
): string => {
    const quantity = safeParseInt(qty, 0);
    if (lotSize > 1) {
        const lots = Math.floor(quantity / lotSize);
        return `${quantity} (${lots}L)`;
    }
    return String(quantity);
};

export default {
    validateOrder,
    createOrderPayload,
    safeParseFloat,
    safeParseInt,
    isFnOExchange,
    formatQuantityWithLots,
    normalizeStatus,
};
