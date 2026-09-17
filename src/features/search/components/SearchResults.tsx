import { JobCard } from '../../jobs/public';
import { Skeleton } from '../../../shared/ui/Skeleton';
import { InlineErrorState } from '../../../shared/ui/InlineErrorState';
import { useSearchJobs } from '../hooks/useSearchJobs';
import { isForbiddenAppError } from '../queries/search-jobs.query-options';

type SearchResultsProps = Readonly<{ submittedTerm: string }>;

export function SearchResults({ submittedTerm }: SearchResultsProps) {
  const query = useSearchJobs(submittedTerm);

  if (submittedTerm === '') {
    return (
      <p className="mx-auto max-w-[1200px] px-4 py-12 text-center text-sm text-[color:var(--muted)] md:px-6">
        Nhập từ khóa để tìm dịch vụ.
      </p>
    );
  }

  if (query.status === 'pending') {
    return (
      <div
        aria-busy="true"
        className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 px-4 py-8 sm:grid-cols-2 md:px-6 lg:grid-cols-3 xl:grid-cols-4"
      >
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-64" />
        ))}
      </div>
    );
  }

  if (query.status === 'error') {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-6">
        <InlineErrorState
          message={
            isForbiddenAppError(query.error)
              ? 'Kết quả tìm kiếm hiện không truy cập được.'
              : 'Không tải được kết quả tìm kiếm.'
          }
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  if (query.data.length === 0) {
    return (
      <p className="mx-auto max-w-[1200px] px-4 py-12 text-center text-sm text-[color:var(--muted)] md:px-6">
        Không tìm thấy dịch vụ phù hợp với "{submittedTerm}".
      </p>
    );
  }

  return (
    <div
      aria-label={`Kết quả tìm kiếm cho "${submittedTerm}"`}
      className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 px-4 py-8 sm:grid-cols-2 md:px-6 lg:grid-cols-3 xl:grid-cols-4"
    >
      {query.data.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
