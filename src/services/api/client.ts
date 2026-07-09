/**
 * API Client
 * Centralized API request utility with TypeScript support
 */

import logger from '@/utils/logger';
import { getApiKey, getApiBase } from './config';
import type { ApiResponse } from '@/types/api';

/** Request options for API calls */
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  context?: string;
  defaultValue?: unknown;
  requiresAuth?: boolean;
  extraHeaders?: Record<string, string>;
  rawResponse?: boolean;
  signal?: AbortSignal;
}

/** Batch request configuration */
export interface BatchRequestConfig {
  endpoint: string;
  body?: Record<string, unknown>;
  options?: ApiRequestOptions;
}

/**
 * Make an authenticated API request with standardized error handling
 *
 * @param endpoint - API endpoint (e.g., '/funds', '/positionbook')
 * @param body - Request body (apikey will be added automatically)
 * @param options - Request options
 * @returns Response data or default value on error
 *
 * @example
 * const funds = await makeApiRequest<Funds>('/funds', {}, { context: 'Funds', defaultValue: null });
 */
export async function makeApiRequest<T>(
  endpoint: string,
  body: Record<string, unknown> = {},
  options: ApiRequestOptions = {}
): Promise<T | null> {
  const {
    method = 'POST',
    context = 'API',
    defaultValue = null,
    requiresAuth = true,
    extraHeaders = {},
    rawResponse = false,
    signal,
  } = options;

  try {
    const requestBody = { ...body };

    if (requiresAuth) {
      const apiKey = getApiKey();
      if (!apiKey) {
        logger.warn(`[${context}] No API key available`);
        return defaultValue as T | null;
      }
      if (method === 'POST' || method === 'PUT') {
        requestBody['apikey'] = apiKey;
      }
    }

    const url = `${getApiBase()}${endpoint}`;
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      credentials: 'include',
      ...(signal ? { signal } : {}),
    };

    if (method === 'POST' || method === 'PUT') {
      fetchOptions.body = JSON.stringify(requestBody);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      logger.warn(`[${context}] API failed:`, response.status);
      return defaultValue as T | null;
    }

    const data = (await response.json()) as ApiResponse<T>;

    if (rawResponse) {
      return data as unknown as T;
    }

    if (data.status === 'success') {
      return (data.data ?? defaultValue) as T | null;
    }

    if (data.status === 'error') {
      logger.warn(`[${context}] API error:`, data.message ?? 'Unknown error');
    }

    return defaultValue as T | null;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      logger.debug(`[${context}] Request aborted`);
    } else {
      logger.error(`[${context}] Request error:`, error);
    }
    return defaultValue as T | null;
  }
}

/**
 * Make a GET request (convenience wrapper)
 */
export async function makeGetRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T | null> {
  return makeApiRequest<T>(endpoint, {}, { ...options, method: 'GET' });
}

/**
 * Make a POST request (convenience wrapper)
 */
export async function makePostRequest<T>(
  endpoint: string,
  body: Record<string, unknown> = {},
  options: ApiRequestOptions = {}
): Promise<T | null> {
  return makeApiRequest<T>(endpoint, body, { ...options, method: 'POST' });
}

/**
 * Batch multiple API requests with Promise.allSettled for resilience
 */
export async function batchApiRequests<T extends unknown[]>(
  requests: BatchRequestConfig[]
): Promise<T> {
  const promises = requests.map(({ endpoint, body = {}, options = {} }) =>
    makeApiRequest(endpoint, body, options)
  );

  const results = await Promise.allSettled(promises);

  return results.map((result, index) => {
    if (result.status === 'rejected') {
      logger.warn(`[BatchAPI] Request ${index} failed:`, result.reason);
      return requests[index]?.options?.defaultValue ?? null;
    }
    return result.value;
  }) as T;
}

/** API Client class for object-oriented usage */
export class ApiClient {
  constructor(_baseUrl?: string) {
    // baseUrl stored for future use with custom endpoints
  }

  async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T | null> {
    return makeApiRequest<T>(endpoint, {}, options);
  }

  async post<T>(
    endpoint: string,
    body: Record<string, unknown> = {},
    options: ApiRequestOptions = {}
  ): Promise<T | null> {
    return makePostRequest<T>(endpoint, body, options);
  }

  async get<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T | null> {
    return makeGetRequest<T>(endpoint, options);
  }
}

export const apiClient = new ApiClient();

export default {
  makeApiRequest,
  makeGetRequest,
  makePostRequest,
  batchApiRequests,
  apiClient,
};
