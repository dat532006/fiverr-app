import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { mockServer } from './server';

beforeAll(() => mockServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  mockServer.resetHandlers();
  // No session snapshot may leak from one test into the next.
  window.sessionStorage.clear();
});
afterAll(() => mockServer.close());
