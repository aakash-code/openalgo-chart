/**
 * Order Service
 * Order management operations - place, modify, cancel orders
 */

import logger from '@/utils/logger';
import { getApiKey, getApiBase } from '../api/config';
import type {
  OrderDetails,
  ModifyOrderDetails,
  CancelOrderDetails,
  OrderResult,
  Order,
} from '@/types/api';

/**
 * Place a new order
 */
export async function placeOrder(orderDetails: OrderDetails): Promise<OrderResult> {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API Key not found');
    }

    const quantityNum = parseInt(String(orderDetails.quantity), 10);
    if (!Number.isInteger(quantityNum) || quantityNum <= 0) {
      throw new Error(
        `Invalid quantity: ${orderDetails.quantity}. Must be a positive integer.`
      );
    }

    const pricetype = orderDetails.pricetype ?? 'MARKET';
    let price = 0;
    if (pricetype === 'LIMIT' || pricetype === 'SL') {
      price = parseFloat(String(orderDetails.price));
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error(
          `Invalid price: ${orderDetails.price}. Must be a positive number for ${pricetype} orders.`
        );
      }
    }

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
      strategy: orderDetails.strategy ?? 'MANUAL',
      exchange: orderDetails.exchange ?? 'NSE',
      symbol: orderDetails.symbol,
      action: orderDetails.action,
      quantity: quantityNum,
      product: orderDetails.product ?? 'MIS',
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as { message?: string }).message ?? `Order failed: ${response.status}`
      );
    }

    const data = (await response.json()) as {
      status: string;
      orderid?: string;
      message?: string;
    };
    logger.debug('[OpenAlgo] Place Order response:', data);

    if (data.status === 'success') {
      const result: OrderResult = {
        status: 'success',
        message: data.message ?? 'Order placed successfully',
      };
      if (data.orderid) {
        result.orderid = data.orderid;
      }
      return result;
    }

    return {
      status: 'error',
      message: data.message ?? 'Unknown error',
    };
  } catch (error) {
    logger.error('[OpenAlgo] Place Order error:', error);
    return {
      status: 'error',
      message: (error as Error).message,
    };
  }
}

/**
 * Modify an existing order
 */
export async function modifyOrder(
  orderDetails: ModifyOrderDetails
): Promise<OrderResult> {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API Key not found');
    }

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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as { message?: string }).message ??
          `Modify order failed: ${response.status}`
      );
    }

    const data = (await response.json()) as {
      status: string;
      orderid?: string;
      message?: string;
    };
    logger.debug('[OpenAlgo] Modify Order response:', data);

    if (data.status === 'success') {
      const result: OrderResult = {
        status: 'success',
        message: data.message ?? 'Order modified successfully',
      };
      if (data.orderid) {
        result.orderid = data.orderid;
      }
      return result;
    }

    return {
      status: 'error',
      message: data.message ?? 'Unknown error',
    };
  } catch (error) {
    logger.error('[OpenAlgo] Modify Order error:', error);
    return {
      status: 'error',
      message: (error as Error).message,
    };
  }
}

/**
 * Cancel an existing order
 */
export async function cancelOrder(
  orderDetails: CancelOrderDetails | string
): Promise<OrderResult> {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API Key not found');
    }

    let orderid: string;
    let strategy = 'MANUAL';

    if (typeof orderDetails === 'string') {
      orderid = orderDetails;
    } else {
      const order = orderDetails.order ?? orderDetails;
      orderid =
        typeof order === 'string'
          ? order
          : (order as Order).orderid ?? orderDetails.orderid ?? '';
      strategy = orderDetails.strategy ?? 'MANUAL';
    }

    logger.info('[OrderService] Cancel Order Request:', {
      orderid,
      timestamp: new Date().toISOString(),
    });

    const requestBody = {
      apikey: apiKey,
      orderid,
      strategy,
    };

    logger.debug('[OpenAlgo] Cancel Order request:', requestBody);

    const response = await fetch(`${getApiBase()}/cancelorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('[OrderService] Cancel Order HTTP Error:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      throw new Error(
        (errorData as { message?: string }).message ??
          `Cancel order failed: ${response.status}`
      );
    }

    const data = (await response.json()) as {
      status: string;
      message?: string;
    };

    logger.info('[OrderService] Cancel Order Response:', {
      status: response.status,
      data,
      success: data.status === 'success',
      timestamp: new Date().toISOString(),
    });

    if (data.status === 'success') {
      return {
        status: 'success',
        message: data.message ?? 'Order cancelled successfully',
      };
    }

    logger.error('[OrderService] Cancel failed:', data.message);
    return {
      status: 'error',
      message: data.message ?? 'Unknown error',
      brokerResponse: data,
    };
  } catch (error) {
    logger.error('[OpenAlgo] Cancel Order error:', error);
    return {
      status: 'error',
      message: (error as Error).message,
      errorType: 'network',
    };
  }
}

export default {
  placeOrder,
  modifyOrder,
  cancelOrder,
};
