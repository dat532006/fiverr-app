import { useState } from 'react';
import { Link } from 'react-router';
import type { TaxonomyMenu as TaxonomyMenuData } from '../../model/taxonomy.model';
import { categoryGroupDetailPath, categoryPath } from '../../../../app/routes/paths';

type TaxonomyMenuDesktopPanelProps = Readonly<{
  menu: TaxonomyMenuData;
  onNavigate: () => void;
  className?: string;
}>;

// Desktop: two-region panel. Hover previews the right-hand pane as an
// enhancement only — clicking/Enter on a top category always navigates too.
export function TaxonomyMenuDesktopPanel({
  menu,
  onNavigate,
  className,
}: TaxonomyMenuDesktopPanelProps) {
  const [activeTopCategoryId, setActiveTopCategoryId] = useState(menu[0]?.id ?? null);
  const activeTop = menu.find((top) => top.id === activeTopCategoryId) ?? menu[0] ?? null;

  return (
    <div
      data-testid="taxonomy-menu-desktop"
      className={`${className ?? ''} flex max-h-[70vh] overflow-hidden rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] shadow-[var(--shadow-lg)]`}
    >
      <nav
        aria-label="Loại công việc"
        className="w-56 shrink-0 overflow-y-auto border-r border-[color:var(--line)] p-2"
      >
        <ul>
          {menu.map((top) => (
            <li key={top.id}>
              <Link
                to={categoryPath(top.id)}
                onClick={onNavigate}
                onMouseEnter={() => setActiveTopCategoryId(top.id)}
                onFocus={() => setActiveTopCategoryId(top.id)}
                aria-current={top.id === activeTop?.id ? 'true' : undefined}
                className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                  top.id === activeTop?.id
                    ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent-ink)]'
                    : 'text-[color:var(--ink)]'
                }`}
              >
                {top.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex-1 overflow-y-auto p-4">
        {activeTop ? (
          activeTop.groups.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">Chưa có nhóm dịch vụ.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {activeTop.groups.map((group) => (
                <div key={group.id}>
                  <p className="mb-1 text-sm font-semibold text-[color:var(--ink)]">{group.name}</p>
                  {group.details.length === 0 ? (
                    <p className="text-xs text-[color:var(--muted)]">Chưa có loại chi tiết.</p>
                  ) : (
                    <ul className="space-y-1">
                      {group.details.map((occurrence) => (
                        <li key={`${group.id}-${occurrence.detail.id}`}>
                          <Link
                            to={categoryGroupDetailPath(
                              activeTop.id,
                              group.id,
                              occurrence.detail.id,
                            )}
                            onClick={onNavigate}
                            className="text-sm text-[color:var(--muted)] hover:text-[color:var(--accent)]"
                          >
                            {occurrence.detail.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
