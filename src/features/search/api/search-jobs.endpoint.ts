import type { AxiosInstance } from 'axios';
import { getHttpClient } from '../../../infrastructure/http/client';
import { decodeSearchJobsResponse, type CongViecDto } from './search-jobs.dto';

const SEARCH_JOBS_PATH_PREFIX = '/api/cong-viec/lay-danh-sach-cong-viec-theo-ten/';

type FetchSearchJobsOptions = Readonly<{
  client?: AxiosInstance;
  signal?: AbortSignal;
}>;

export async function fetchSearchJobs(
  term: string,
  { client = getHttpClient(), signal }: FetchSearchJobsOptions = {},
): Promise<readonly CongViecDto[]> {
  // `term` is a path segment, not a query parameter — encodeURIComponent runs
  // exactly once here and nowhere else on this value.
  const path = `${SEARCH_JOBS_PATH_PREFIX}${encodeURIComponent(term)}`;
  const response = await client.get<unknown>(path, signal ? { signal } : {});
  return decodeSearchJobsResponse(response.data);
}
