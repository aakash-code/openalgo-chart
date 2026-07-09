/**
 * Order Service
 * Order management operations - place, modify, cancel orders
 */

import logger from '../utils/logger';
import { getApiKey, getApiBase } from './api/config';

/** Order action type */
export type OrderAction = 'BUY' | 'SELL';

/** Order price type */
export type OrderPriceType = 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';

/** Order product type */
export type OrderProduct = 'MIS' | 'CNC' | 'NRML';

/** Order details for placing an order */
export interface OrderDetails {
  symbol: string;
  exchange?: string;
  action: OrderAction;
  quantity: number | string;
  product?: OrderProduct;
  pricetype?: OrderPriceType;
  price?: number | string;
  trigger_price?: number | string;
  strategy?: string;
  disclosed_quantity?: number;
}

/** Order modification details */
export interface ModifyOrderDetails {
  orderid: string;
  exchange?: string;
  symbol?: string;
  quantity?: number;
  price?: number;
  trigger_price?: number;
  pricetype?: OrderPriceType;
  [key: string]: unknown;
}

/** Order for cancellation */
export interface CancelOrderInput {
  orderid?: string;
  order?: {
    orderid: string;
    symbol?: string;
    order_status?: string;
    action?: string;
    quantity?: number;
    strategy?: string;
  };
}

/** Order response */
export interface OrderResponse {
  status: 'success' | 'error';
  orderid?: string | undefined;
  message?: string | undefined;
  brokerResponse?: unknown;
  errorType?: string | undefined;
}

/** API response structure */
interface ApiResponse {
  status: 'success' | 'error';
  orderid?: string;
  message?: string;
}

/**
 * Place a new order
 * @param orderDetails - Order details
 * @returns Order response with status and order ID
 */
export const placeOrder = async (orderDetails: OrderDetails): Promise<OrderResponse> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('API Key not found');

    // Validate and parse quantity with strict error checking
    const quantity = parseInt(String(orderDetails.quantity), 10);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(
        `Invalid quantity: ${orderDetails.quantity}. Must be a positive integer.`
      );
    }

    // Validate and parse price with strict error checking
    const pricetype = orderDetails.pricetype || 'MARKET';
    let price = 0;
    if (pricetype === 'LIMIT' || pricetype === 'SL') {
      price = parseFloat(String(orderDetails.price));
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error(
          `Invalid price: ${orderDetails.price}. Must be a positive number for ${pricetype} orders.`
        );
      }
    }

    // Validate and parse trigger_price with strict error checking
    let trigger_price = 0;
    if (pricetype === 'SL' || pricetype === 'SL-M') {
      trigger_price = parseFloat(String(orderDetails.trigger_price));
      if (!Number.isFinite(trigger_price) || trigger_price <= 0) {
        throw new Error(
          `Invalid trigger_price: ${orderDetails.trigger_price}. Must be a positive number for ${pricetype} orders.`
        );
      }
    }

    const requestBody = {
      apikey: apiKey,
      strategy: orderDetails.strategy || 'MANUAL',
      exchange: orderDetails.exchange || 'NSE',
      symbol: orderDetails.symbol,
      action: orderDetails.action,
      quantity,
      product: orderDetails.product || 'MIS',
      pricetype,
      price,
      trigger_price,
      disclosed_quantity: 0,
    };

    logger.debug('[OpenAlgo] Place Order request:', requestBody);

    const response = await fetch(`${getApiBase()}/placeorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(errorData.message || `Order failed: ${response.status}`);
    }

    const data = (await response.json()) as ApiResponse;
    logger.debug('[OpenAlgo] Place Order response:', data);

    if (data.status === 'success') {
      return {
        orderid: data.orderid,
        status: 'success',
        message: data.message,
      };
    } else {
      return {
        status: 'error',
        message: data.message || 'Unknown error',
      };
    }
  } catch (error) {
    logger.error('[OpenAlgo] Place Order error:', error);
    return {
      status: 'error',
      message: (error as Error).message,
    };
  }
};

/**
 * Modify an existing order
 * @param orderDetails - Order modification details
 * @returns Order response with status
 */
export const modifyOrder = async (orderDetails: ModifyOrderDetails): Promise<OrderResponse> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('API Key not found');

    const requestBody = {
      apikey: apiKey,
      ...orderDetails,
    };

    logger.debug('[OpenAlgo] Modify Order request:', requestBody);

    const response = await fetch(`${getApiBase()}/modifyorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(errorData.message || `Modify order failed: ${response.status}`);
    }

    const data = (await response.json()) as ApiResponse;
    logger.debug('[OpenAlgo] Modify Order response:', data);

    if (data.status === 'success') {
      return {
        orderid: data.orderid,
        status: 'success',
        message: data.message,
      };
    } else {
      return {
        status: 'error',
        message: data.message || 'Unknown error',
      };
    }
  } catch (error) {
    logger.error('[OpenAlgo] Modify Order error:', error);
    return {
      status: 'error',
      message: (error as Error).message,
    };
  }
};

/**
 * Cancel an existing order
 * @param orderDetails - Order ID or object with orderid/order
 * @returns Order response with status
 */
export const cancelOrder = async (
  orderDetails: string | CancelOrderInput
): Promise<OrderResponse> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('API Key not found');

    // Handle multiple input formats: string, { orderid }, or { order: {...} }
    let order: { orderid: string; symbol?: string; order_status?: string; action?: string; quantity?: number; strategy?: string };
    let orderid: string;

    if (typeof orderDetails === 'string') {
      orderid = orderDetails;
      order = { orderid };
    } else if (orderDetails.order) {
      order = orderDetails.order;
      orderid = order.orderid;
    } else {
      orderid = orderDetails.orderid || '';
      order = { orderid };
    }

    // Log the order details being sent for debugging
    logger.info('[OrderService] Cancel Order Request:', {
      orderid: orderid,
      symbol: order.symbol || 'N/A',
      status: order.order_status || 'N/A',
      action: order.action || 'N/A',
      quantity: order.quantity || 'N/A',
      timestamp: new Date().toISOString(),
    });

    const requestBody = {
      apikey: apiKey,
      orderid: orderid,
      strategy: order.strategy || 'MANUAL', // Required by broker API
    };

    logger.debug('[OpenAlgo] Cancel Order request:', requestBody);

    const response = await fetch(`${getApiBase()}/cancelorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { message?: string };

      // Log the full error response
      logger.error('[OrderService] Cancel Order HTTP Error:', {
        status: response.status,
        statusText: response.statusText,
        errorData: errorData,
      });

      throw new Error(errorData.message || `Cancel order failed: ${response.status}`);
    }

    const data = (await response.json()) as ApiResponse;

    // Log the full response for debugging
    logger.info('[OrderService] Cancel Order Response:', {
      status: response.status,
      data: data,
      success: data.status === 'success',
      timestamp: new Date().toISOString(),
    });

    logger.debug('[OpenAlgo] Cancel Order response:', data);

    if (data.status === 'success') {
      return {
        status: 'success',
        message: data.message,
      };
    } else {
      // Include broker response in error for better debugging
      logger.error('[OrderService] Cancel failed:', data.message);
      return {
        status: 'error',
        message: data.message || 'Unknown error',
        brokerResponse: data,
      };
    }
  } catch (error) {
    logger.error('[OpenAlgo] Cancel Order error:', error);
    return {
      status: 'error',
      message: (error as Error).message,
      errorType: 'network',
    };
  }
};

export default {
  placeOrder,
  modifyOrder,
  cancelOrder,
};
