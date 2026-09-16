import { createElement } from 'react';
import { Link } from 'react-router';
import type { TopCategory } from '../model/taxonomy.model';
import { resolveCategoryIcon } from './category-icon';
import { categoryPath } from '../../../app/routes/paths';

type CategoryCardProps = Readonly<{ category: TopCategory }>;

export function CategoryCard({ category }: CategoryCardProps) {
  // createElement (not JSX) because the icon component is resolved dynamically
  // per category name, not a static tag.
  const icon = createElement(resolveCategoryIcon(category.name), {
    'aria-hidden': true,
    className: 'h-6 w-6 text-[color:var(--accent)]',
  });
  return (
    <Link
      to={categoryPath(category.id)}
      className="flex flex-col items-center gap-2 rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] p-4 text-center shadow-[var(--shadow-sm)] transition hover:shadow-[var(--shadow-md)]"
    >
      {icon}
      <span className="text-sm font-medium text-[color:var(--ink)]">{category.name}</span>
    </Link>
  );
}
