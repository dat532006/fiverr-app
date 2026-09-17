import { queryOptions } from '@tanstack/react-query';
import { AppError } from '../../../shared/models/app-error';
import { mapTransportError } from '../../../infrastructure/http/map-transport-error';
import { fetchSearchJobs } from '../api/search-jobs.endpoint';
import { SearchJobsDecodeError } from '../api/search-jobs.dto';
import { mapSearchJobs } from '../model/map-search-jobs';
import type { Job } from '../../jobs/public';

export const SEARCH_JOBS_QUERY_KEY_PREFIX = ['public', 'search', 'jobs'] as const;

async function loadSearchJobs(term: string, signal: AbortSignal): Promise<readonly Job[]> {
  try {
    const dtos = await fetchSearchJobs(term, { signal });
    return mapSearchJobs(dtos);
  } catch (error) {
    if (error instanceof SearchJobsDecodeError) {
      throw new AppError('decode');
    }
    throw mapTransportError(error);
  }
}

export function isTransientAppError(error: unknown): boolean {
  return error instanceof AppError && (error.kind === 'network' || error.kind === 'timeout');
}

export function isForbiddenAppError(error: unknown): boolean {
  return error instanceof AppError && error.kind === 'forbidden';
}

// `term` must already be the submitted (trimmed, non-empty) query — callers
// gate on that via `enabled` so an empty/blank submission issues no request.
export function searchJobsQueryOptions(term: string) {
  return queryOptions({
    queryKey: [...SEARCH_JOBS_QUERY_KEY_PREFIX, term] as const,
    queryFn: ({ signal }) => loadSearchJobs(term, signal),
    retry: (failureCount: number, error: unknown) => failureCount < 1 && isTransientAppError(error),
  });
}
