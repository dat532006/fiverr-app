import { useQuery } from '@tanstack/react-query';
import { searchJobsQueryOptions } from '../queries/search-jobs.query-options';

// `term` must be the submitted query (already trimmed by the caller), never
// transient input state — a blank term disables the query so zero requests
// are issued.
export function useSearchJobs(term: string) {
  return useQuery({ ...searchJobsQueryOptions(term), enabled: term !== '' });
}
