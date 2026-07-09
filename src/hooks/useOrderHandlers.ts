/**
 * Order Handlers Hook
 * Manages order operations: modify, cancel
 */

import { useCallback } from 'react';
import { modifyOrder, cancelOrder } from '../services/openalgo';
import type { ModifyOrderDetails, CancelOrderInput, OrderResponse, OrderPriceType } from '../services/orderService';
import logger from '../utils/logger';

// ==================== TYPES ====================

/** Order data structure */
export interface Order {
  orderid?: string | undefined;
  order_id?: string | undefined;
  symbol: string;
  exchange: string;
  action: string;
  product: string;
  pricetype: string;
  quantity: string | number;
  price?: string | number | undefined;
  trigger_price?: string | number | undefined;
  disclosed_quantity?: string | number | undefined;
  strategy?: string | undefined;
}

/** Toast function type */
export type ShowToastFn = (
  message: string,
  type: 'success' | 'error' | 'warning' | 'info'
) => void;

/** Hook parameters */
export interface UseOrderHandlersParams {
  activeOrders: Order[];
  showToast: ShowToastFn;
  refreshTradingData: () => void;
}

/** Hook return type */
export interface UseOrderHandlersReturn {
  handleModifyOrder: (orderId: string, newPrice: number) => Promise<void>;
  handleCancelOrder: (orderId: string) => Promise<void>;
}

// ==================== HOOK ====================

/**
 * Custom hook for order operations
 * @param params - Hook parameters
 * @returns Order handler functions
 */
export const useOrderHandlers = ({
  activeOrders,
  showToast,
  refreshTradingData,
}: UseOrderHandlersParams): UseOrderHandlersReturn => {
  // Modify an existing order
  const handleModifyOrder = useCallback(
    async (orderId: string, newPrice: number) => {
      // Debug: Log what we are looking for
      logger.debug('[App] handleModifyOrder called with:', { orderId, newPrice });

      // Find order to get other details
      // Check both orderid and order_id, and handle string/number mismatch
      const order = activeOrders.find(
        (o) => String(o.orderid) === String(orderId) || String(o.order_id) === String(orderId)
      );

      if (!order) {
        logger.error(
          '[App] Order mismatch! Available IDs:',
          activeOrders.map((o) => o.orderid)
        );
        showToast(`Order ${orderId} not found`, 'error');
        return;
      }

      try {
        // Round price to 2 decimal places for Indian markets
        const roundedPrice = parseFloat(newPrice.toFixed(2));

        const payload: ModifyOrderDetails = {
          orderid: orderId,
          strategy: order.strategy || 'MANUAL', // Use order's strategy or default to MANUAL
          exchange: order.exchange,
          symbol: order.symbol,
          action: order.action,
          product: order.product,
          pricetype: order.pricetype as OrderPriceType,
          price: roundedPrice,
          quantity: parseInt(String(order.quantity), 10),
          disclosed_quantity: parseInt(String(order.disclosed_quantity || 0), 10),
          trigger_price:
            order.pricetype === 'SL' || order.pricetype === 'SL-M'
              ? roundedPrice // For SL orders, dragging modifies trigger price
              : parseFloat(String(order.trigger_price)) || 0,
        };

        logger.debug('[App] Modifying order with payload:', payload);

        const result = (await modifyOrder(payload)) as OrderResponse;

        logger.debug('[App] Modify order result:', result);

        if (result.status === 'success') {
          showToast(
            `Modified: ${order.action} ${order.symbol} @ ₹${roundedPrice} (Qty: ${order.quantity})`,
            'success'
          );
          // Refresh trading data to update UI
          refreshTradingData();
        } else {
          logger.error('[App] Modify order failed:', result.message);
          showToast(`Modify failed: ${result.message}`, 'error');
        }
      } catch (e) {
        logger.error('[App] Order modification error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Failed to modify order';
        showToast(errorMessage, 'error');
      }
    },
    [activeOrders, showToast, refreshTradingData]
  );

  // Cancel an existing order
  const handleCancelOrder = useCallback(
    async (orderId: string) => {
      // Find order details
      // Check both orderid and order_id, and handle string/number mismatch
      const order = activeOrders.find(
        (o) => String(o.orderid) === String(orderId) || String(o.order_id) === String(orderId)
      );

      if (!order) {
        logger.error('[App] Cancel Order: Order not found', { orderId });
        showToast(`Order ${orderId} not found`, 'error');
        return;
      }

      try {
        const cancelInput: CancelOrderInput = {
          orderid: orderId,
          order: {
            orderid: orderId,
            symbol: order.symbol,
            action: order.action,
            quantity: parseInt(String(order.quantity), 10),
            strategy: 'Manual',
          },
        };
        const result = (await cancelOrder(cancelInput)) as OrderResponse;

        if (result.status === 'success') {
          showToast(`Cancelled ${order.action} ${order.symbol}`, 'success');
          refreshTradingData();
        } else {
          showToast(result.message || 'Failed to cancel order', 'error');
        }
      } catch (e) {
        if (process.env['NODE_ENV'] === 'development') {
          logger.error('[App] Order cancellation error:', e);
        }
        const errorMessage = e instanceof Error ? e.message : 'Failed to cancel order';
        showToast(errorMessage, 'error');
      }
    },
    [activeOrders, showToast, refreshTradingData]
  );

  return {
    handleModifyOrder,
    handleCancelOrder,
  };
};

export default useOrderHandlers;
