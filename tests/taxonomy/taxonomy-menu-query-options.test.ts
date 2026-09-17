import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/shared/models/app-error';
import {
  isForbiddenAppError,
  isTransientAppError,
  taxonomyMenuQueryOptions,
} from '../../src/features/taxonomy/queries/taxonomy-menu.query-options';

describe('taxonomy menu query options', () => {
  it('retries transient network/timeout errors exactly once', () => {
    const { retry } = taxonomyMenuQueryOptions();
    if (typeof retry !== 'function') throw new Error('retry must be a function');
    expect(retry(0, new AppError('network'))).toBe(true);
    expect(retry(1, new AppError('network'))).toBe(false);
    expect(retry(0, new AppError('timeout'))).toBe(true);
  });

  it('never retries decode/configuration/server/forbidden/unknown errors', () => {
    const { retry } = taxonomyMenuQueryOptions();
    if (typeof retry !== 'function') throw new Error('retry must be a function');
    expect(retry(0, new AppError('decode'))).toBe(false);
    expect(retry(0, new AppError('configuration'))).toBe(false);
    expect(retry(0, new AppError('server'))).toBe(false);
    expect(retry(0, new AppError('forbidden'))).toBe(false);
    expect(retry(0, new AppError('unknown'))).toBe(false);
  });

  it('caches the menu for 5 minutes (staleTime and gcTime)', () => {
    const options = taxonomyMenuQueryOptions();
    expect(options.staleTime).toBe(5 * 60_000);
    expect(options.gcTime).toBe(5 * 60_000);
  });
});

describe('isTransientAppError', () => {
  it('is true only for network/timeout AppErrors', () => {
    expect(isTransientAppError(new AppError('network'))).toBe(true);
    expect(isTransientAppError(new AppError('timeout'))).toBe(true);
    expect(isTransientAppError(new AppError('server'))).toBe(false);
    expect(isTransientAppError(new Error('not an AppError'))).toBe(false);
  });
});

describe('isForbiddenAppError', () => {
  it('is true only for forbidden AppErrors', () => {
    expect(isForbiddenAppError(new AppError('forbidden'))).toBe(true);
    expect(isForbiddenAppError(new AppError('unknown'))).toBe(false);
    expect(isForbiddenAppError(new AppError('network'))).toBe(false);
    expect(isForbiddenAppError(new Error('not an AppError'))).toBe(false);
    expect(isForbiddenAppError(null)).toBe(false);
  });
});
