import { Link } from 'react-router';
import type { Group } from '../model/taxonomy.model';
import type { TopCategoryId } from '../model/ids';
import { categoryGroupPath } from '../../../app/routes/paths';
import { ImageWithFallback } from '../../../shared/ui/ImageWithFallback';

type GroupCardProps = Readonly<{ group: Group; parentTopCategoryId: TopCategoryId }>;

export function GroupCard({ group, parentTopCategoryId }: GroupCardProps) {
  return (
    <Link
      to={categoryGroupPath(parentTopCategoryId, group.id)}
      className="block overflow-hidden rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] shadow-[var(--shadow-sm)] transition hover:shadow-[var(--shadow-md)]"
    >
      <ImageWithFallback
        src={group.imageUrl}
        alt={group.name}
        placeholderCaption="hinhAnh nhóm"
        aspectRatio="16 / 10"
      />
      <div className="p-3">
        <p className="text-sm font-medium text-[color:var(--ink)]">{group.name}</p>
        <p className="text-xs text-[color:var(--muted)]">
          {group.details.length > 0
            ? `${group.details.length} loại chi tiết`
            : 'Chưa có loại chi tiết'}
        </p>
      </div>
    </Link>
  );
}
