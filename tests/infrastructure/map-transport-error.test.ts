import { describe, expect, it } from 'vitest';
import { AxiosError, type AxiosResponse } from 'axios';
import { ConfigurationError } from '../../src/infrastructure/http/config';
import { mapTransportError } from '../../src/infrastructure/http/map-transport-error';

describe('mapTransportError', () => {
  it('classifies a ConfigurationError as configuration', () => {
    expect(mapTransportError(new ConfigurationError()).kind).toBe('configuration');
  });

  it('classifies an ECONNABORTED axios error as timeout', () => {
    const error = new AxiosError('timeout', 'ECONNABORTED');
    expect(mapTransportError(error).kind).toBe('timeout');
  });

  it('classifies a response-less axios error as network', () => {
    const error = new AxiosError('Network Error');
    expect(mapTransportError(error).kind).toBe('network');
  });

  it('classifies a 5xx response as server', () => {
    const response = { status: 503 } as unknown as AxiosResponse;
    const error = new AxiosError('Server Error', undefined, undefined, undefined, response);
    expect(mapTransportError(error).kind).toBe('server');
  });

  it('classifies a 403 response as forbidden, not unknown', () => {
    const response = { status: 403 } as unknown as AxiosResponse;
    const error = new AxiosError('Forbidden', undefined, undefined, undefined, response);
    expect(mapTransportError(error).kind).toBe('forbidden');
  });

  it('classifies anything else as unknown, without leaking the original value', () => {
    const mapped = mapTransportError('some raw sensitive string');
    expect(mapped.kind).toBe('unknown');
    expect(mapped.message).not.toContain('some raw sensitive string');
  });
});
