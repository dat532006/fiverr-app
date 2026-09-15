import axios from 'axios';
import { ConfigurationError, readApiConfig } from './config';

// No default origin: app composition must supply a reviewed origin allowlist.
// TASK-005 mounts no live transport. Tests use intercepted synthetic origins only.
export function createHttpClient(input: unknown, allowedOrigins: readonly string[] = []) {
  const config = readApiConfig(input, allowedOrigins);
  const client = axios.create({
    baseURL: config.baseUrl,
    timeout: 15_000,
    withCredentials: false,
  });

  client.interceptors.request.use((request) => {
    let destination: URL;
    try {
      destination = new URL(client.getUri(request));
    } catch {
      throw new ConfigurationError();
    }
    if (destination.origin !== config.origin || destination.username || destination.password) {
      throw new ConfigurationError();
    }
    request.headers.set('tokenCybersoft', config.cybersoftToken);
    return request;
  });

  return client;
}
