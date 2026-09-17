import { GroupCard, isForbiddenAppError, useTaxonomyMenu } from '../../taxonomy/public';
import { Skeleton } from '../../../shared/ui/Skeleton';
import { InlineErrorState } from '../../../shared/ui/InlineErrorState';
import { flattenGroups } from './flatten-groups';

// No ranking endpoint exists, so this is the plain group listing from E24 —
// not a curated/ranked "featured" section (DD-012).
export function GroupStrip() {
  const query = useTaxonomyMenu();

  if (query.status === 'pending') {
    return (
      <section
        aria-label="Nhóm dịch vụ phổ biến"
        className="mx-auto max-w-[1200px] px-4 py-8 md:px-6"
      >
        <h2 className="mb-4 text-[24px] font-semibold text-[color:var(--ink)] md:text-[28px]">
          Nhóm dịch vụ phổ biến
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      </section>
    );
  }

  if (query.status === 'error') {
    return (
      <section
        aria-label="Nhóm dịch vụ phổ biến"
        className="mx-auto max-w-[1200px] px-4 py-8 md:px-6"
      >
        <h2 className="mb-4 text-[24px] font-semibold text-[color:var(--ink)] md:text-[28px]">
          Nhóm dịch vụ phổ biến
        </h2>
        <InlineErrorState
          message={
            isForbiddenAppError(query.error)
              ? 'Nhóm dịch vụ hiện không truy cập được.'
              : 'Không tải được nhóm dịch vụ.'
          }
          onRetry={() => void query.refetch()}
        />
      </section>
    );
  }

  const flattened = flattenGroups(query.data);
  if (flattened.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Nhóm dịch vụ phổ biến"
      className="mx-auto max-w-[1200px] px-4 py-8 md:px-6"
    >
      <h2 className="mb-4 text-[24px] font-semibold text-[color:var(--ink)] md:text-[28px]">
        Nhóm dịch vụ phổ biến
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {flattened.map(({ group, parentTopCategoryId }) => (
          <GroupCard key={group.id} group={group} parentTopCategoryId={parentTopCategoryId} />
        ))}
      </div>
    </section>
  );
}
