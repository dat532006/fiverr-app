import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ConfigurationError, readApiConfig } from '../src/infrastructure/http/config';
import { createHttpClient } from '../src/infrastructure/http/create-http-client';
import { mockServer } from './support/server';

// Synthetic, non-resolving target. No captured credential or CyberSoft endpoint.
const origin = 'https://bootstrap.invalid';
const synthetic = {
  VITE_APP_ENV: 'development',
  VITE_API_BASE_URL: `${origin}/api`,
  VITE_CYBERSOFT_TOKEN: 'synthetic-bootstrap-value',
};

describe('TASK-005 configuration and mock transport', () => {
  it.each([
    undefined,
    {},
    { ...synthetic, VITE_API_BASE_URL: '' },
    { ...synthetic, VITE_CYBERSOFT_TOKEN: '  ' },
    { ...synthetic, VITE_APP_ENV: 'invalid' },
    { ...synthetic, VITE_API_BASE_URL: 'http://bootstrap.invalid/api' },
    { ...synthetic, VITE_API_BASE_URL: 'https://different.invalid/api' },
    { ...synthetic, VITE_API_BASE_URL: 'https://example@bootstrap.invalid/api' },
    { ...synthetic, VITE_API_BASE_URL: `${origin}/api?untrusted=value` },
  ])('rejects missing or invalid configuration before creating a request', (input) => {
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'send');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(() => createHttpClient(input, [origin])).toThrow(ConfigurationError);
    expect(xhrSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('keeps configuration errors independent of supplied values', () => {
    const malformed = { ...synthetic, VITE_API_BASE_URL: 'synthetic-sensitive-input' };
    try {
      readApiConfig(malformed, [origin]);
      throw new Error('Expected rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect(String(error)).not.toContain('synthetic-sensitive-input');
      expect(String(error)).not.toContain(synthetic.VITE_CYBERSOFT_TOKEN);
    }
  });

  it('denies construction without an explicit origin allowlist', () => {
    expect(() => createHttpClient(synthetic)).toThrow(ConfigurationError);
  });

  it('sends one intercepted Axios request with the configured header', async () => {
    let calls = 0;
    mockServer.use(
      http.get(`${origin}/api/ping`, ({ request }) => {
        calls += 1;
        expect(request.headers.get('tokenCybersoft')).toBe(synthetic.VITE_CYBERSOFT_TOKEN);
        expect(request.headers.has('token')).toBe(false);
        return HttpResponse.json({ bootstrap: true });
      }),
    );
    const client = createHttpClient(synthetic, [origin]);
    const response = await client.get<unknown>('/ping');
    expect(response.data).toEqual({ bootstrap: true });
    expect(calls).toBe(1);
  });

  it('rejects a destination override before the adapter can send', async () => {
    const client = createHttpClient(synthetic, [origin]);
    const adapter = vi.fn(() => Promise.reject(new Error('Adapter must not run')));
    await expect(client.get('https://different.invalid/ping', { adapter })).rejects.toThrow(
      ConfigurationError,
    );
    expect(adapter).not.toHaveBeenCalled();
  });

  it('fails an unhandled request instead of allowing a network fallback', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(fetch(`${origin}/unhandled-policy-probe`)).rejects.toThrow();
    expect(errors.mock.calls.some((call) => String(call[0]).includes('[MSW]'))).toBe(true);
  });
});
