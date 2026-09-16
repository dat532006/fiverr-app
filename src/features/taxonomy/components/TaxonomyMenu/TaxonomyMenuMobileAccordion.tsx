import { Link } from 'react-router';
import { ChevronDown } from 'lucide-react';
import type { TaxonomyMenu as TaxonomyMenuData } from '../../model/taxonomy.model';
import { categoryGroupDetailPath } from '../../../../app/routes/paths';

type TaxonomyMenuMobileAccordionProps = Readonly<{
  menu: TaxonomyMenuData;
  onNavigate: () => void;
  className?: string;
}>;

// Mobile: full-screen accordion, top -> group -> detail. Native <details>/<summary>
// gives touch and keyboard open/close for free; navigation happens at the detail leaf.
export function TaxonomyMenuMobileAccordion({
  menu,
  onNavigate,
  className,
}: TaxonomyMenuMobileAccordionProps) {
  return (
    <div
      data-testid="taxonomy-menu-mobile"
      className={`${className ?? ''} h-full overflow-y-auto bg-[color:var(--panel)] p-3`}
    >
      {menu.map((top) => (
        <details key={top.id} className="border-b border-[color:var(--line)] py-2">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between text-sm font-medium text-[color:var(--ink)]">
            <span>{top.name}</span>
            <ChevronDown aria-hidden="true" className="h-4 w-4" />
          </summary>
          <div className="pl-3">
            {top.groups.length === 0 ? (
              <p className="py-2 text-xs text-[color:var(--muted)]">Chưa có nhóm dịch vụ.</p>
            ) : (
              top.groups.map((group) => (
                <details key={group.id} className="py-1">
                  <summary className="min-h-11 cursor-pointer py-2 text-sm text-[color:var(--ink-2)]">
                    {group.name}
                  </summary>
                  <div className="pl-3">
                    {group.details.length === 0 ? (
                      <p className="py-2 text-xs text-[color:var(--muted)]">
                        Chưa có loại chi tiết.
                      </p>
                    ) : (
                      <ul>
                        {group.details.map((occurrence) => (
                          <li key={`${group.id}-${occurrence.detail.id}`}>
                            <Link
                              to={categoryGroupDetailPath(top.id, group.id, occurrence.detail.id)}
                              onClick={onNavigate}
                              className="block min-h-11 py-2 text-sm text-[color:var(--muted)]"
                            >
                              {occurrence.detail.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              ))
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
