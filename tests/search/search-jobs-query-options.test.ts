import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/shared/models/app-error';
import {
  isForbiddenAppError,
  isTransientAppError,
  searchJobsQueryOptions,
  SEARCH_JOBS_QUERY_KEY_PREFIX,
} from '../../src/features/search/queries/search-jobs.query-options';

describe('search jobs query options', () => {
  it('keys the query by the submitted term so A and B never share a cache entry (T18)', () => {
    expect(searchJobsQueryOptions('a').queryKey).toEqual([...SEARCH_JOBS_QUERY_KEY_PREFIX, 'a']);
    expect(searchJobsQueryOptions('b').queryKey).toEqual([...SEARCH_JOBS_QUERY_KEY_PREFIX, 'b']);
    expect(searchJobsQueryOptions('a').queryKey).not.toEqual(searchJobsQueryOptions('b').queryKey);
  });

  it('retries transient network/timeout errors at most once (T07)', () => {
    const { retry } = searchJobsQueryOptions('logo');
    if (typeof retry !== 'function') throw new Error('retry must be a function');
    expect(retry(0, new AppError('network'))).toBe(true);
    expect(retry(1, new AppError('network'))).toBe(false);
    expect(retry(0, new AppError('timeout'))).toBe(true);
  });

  it('never retries decode/configuration/server/forbidden/unknown errors (T07: no inappropriate retry)', () => {
    const { retry } = searchJobsQueryOptions('logo');
    if (typeof retry !== 'function') throw new Error('retry must be a function');
    expect(retry(0, new AppError('decode'))).toBe(false);
    expect(retry(0, new AppError('configuration'))).toBe(false);
    expect(retry(0, new AppError('server'))).toBe(false);
    expect(retry(0, new AppError('forbidden'))).toBe(false);
    expect(retry(0, new AppError('unknown'))).toBe(false);
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
    expect(isForbiddenAppError(null)).toBe(false);
  });
});
