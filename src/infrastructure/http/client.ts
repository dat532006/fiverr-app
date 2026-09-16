import type { AxiosInstance } from 'axios';
import { createHttpClient } from './create-http-client';
import { PUBLIC_API_ALLOWED_ORIGINS } from './allowed-origins';

let cachedClient: AxiosInstance | undefined;

// Lazily constructed so importing this module never throws ConfigurationError
// before an actual request is attempted.
export function getHttpClient(): AxiosInstance {
  cachedClient ??= createHttpClient(import.meta.env, PUBLIC_API_ALLOWED_ORIGINS);
  return cachedClient;
}
