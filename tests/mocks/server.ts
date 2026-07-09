/**
 * MSW Server Setup
 * Mock Service Worker server for testing
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

export default server;
