import { CategoryCard, isForbiddenAppError, useTaxonomyMenu } from '../../taxonomy/public';
import { Skeleton } from '../../../shared/ui/Skeleton';
import { InlineErrorState } from '../../../shared/ui/InlineErrorState';

export function CategoryStrip() {
  const query = useTaxonomyMenu();

  if (query.status === 'pending') {
    return (
      <section aria-label="Danh mục công việc" className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
        <h2 className="mb-4 text-[24px] font-semibold text-[color:var(--ink)] md:text-[28px]">
          Danh mục công việc
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5 lg:grid-cols-7">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      </section>
    );
  }

  if (query.status === 'error') {
    return (
      <section aria-label="Danh mục công việc" className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
        <h2 className="mb-4 text-[24px] font-semibold text-[color:var(--ink)] md:text-[28px]">
          Danh mục công việc
        </h2>
        <InlineErrorState
          message={
            isForbiddenAppError(query.error)
              ? 'Danh mục công việc hiện không truy cập được.'
              : 'Không tải được danh mục công việc.'
          }
          onRetry={() => void query.refetch()}
        />
      </section>
    );
  }

  // A legitimately empty menu hides the strip entirely instead of showing an
  // empty box (search elsewhere on the page stays usable).
  if (query.data.length === 0) {
    return null;
  }

  return (
    <section aria-label="Danh mục công việc" className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
      <h2 className="mb-4 text-[24px] font-semibold text-[color:var(--ink)] md:text-[28px]">
        Danh mục công việc
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5 lg:grid-cols-7">
        {query.data.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}
