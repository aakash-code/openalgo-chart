/**
 * Services Index
 * Central export for all services
 */

// API Services
export * from './api';

// Trading Services
export * from './trading';

// Re-export legacy services for backward compatibility
// These will be migrated to TypeScript in subsequent phases
export { makeApiRequest, batchApiRequests } from './api/client';
export {
  getApiBase,
  getApiKey,
  getHostUrl,
  getWebSocketUrl,
  getLoginUrl,
  checkAuth,
  convertInterval,
} from './api/config';
