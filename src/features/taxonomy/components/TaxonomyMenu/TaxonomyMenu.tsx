import { useEffect, useId, useRef, useState } from 'react';
import { useTaxonomyMenu } from '../../hooks/useTaxonomyMenu';
import { TaxonomyMenuTrigger } from './TaxonomyMenuTrigger';
import { TaxonomyMenuDesktopPanel } from './TaxonomyMenuDesktopPanel';
import { TaxonomyMenuMobileAccordion } from './TaxonomyMenuMobileAccordion';
import { InlineErrorState } from '../../../../shared/ui/InlineErrorState';
import { Skeleton } from '../../../../shared/ui/Skeleton';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), summary';

// Picks the first focusable element that actually has visible layout, so
// auto-focus lands in whichever variant (desktop panel vs. mobile accordion)
// is really shown at the current viewport. jsdom has no layout engine, so
// every candidate reports a zero-size rect there; falling back to plain DOM
// order keeps the behavior deterministic for component tests, while a real
// browser at a real viewport gets the visually-correct target.
function pickFirstVisibleFocusable(container: HTMLElement | null): HTMLElement | null {
  if (!container) return null;
  const candidates = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  const visible = candidates.find((element) => element.getBoundingClientRect().width > 0);
  return visible ?? candidates[0] ?? null;
}

export function TaxonomyMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  // Defers the fetch until the panel is actually opened, so mounting the
  // header on any page never starts a request by itself.
  const query = useTaxonomyMenu({ enabled: isOpen });

  const close = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;
    pickFirstVisibleFocusable(panelRef.current)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative">
      <TaxonomyMenuTrigger
        ref={triggerRef}
        isOpen={isOpen}
        controls={panelId}
        onToggle={() => setIsOpen((open) => !open)}
      />
      {isOpen ? (
        <div
          id={panelId}
          ref={panelRef}
          className="fixed inset-0 z-40 md:absolute md:inset-auto md:top-full md:left-0 md:mt-2 md:w-[720px]"
        >
          {query.status === 'pending' ? (
            <div className="space-y-2 bg-[color:var(--panel)] p-4 shadow-[var(--shadow-lg)]">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          ) : query.status === 'error' ? (
            <div className="bg-[color:var(--panel)] p-6 shadow-[var(--shadow-lg)]">
              <InlineErrorState
                message="Không tải được danh mục."
                onRetry={() => void query.refetch()}
              />
            </div>
          ) : query.data.length === 0 ? (
            <p className="bg-[color:var(--panel)] p-6 text-sm text-[color:var(--muted)] shadow-[var(--shadow-lg)]">
              Danh mục hiện chưa có dữ liệu.
            </p>
          ) : (
            <>
              <TaxonomyMenuDesktopPanel
                menu={query.data}
                onNavigate={close}
                className="hidden md:flex"
              />
              <TaxonomyMenuMobileAccordion
                menu={query.data}
                onNavigate={close}
                className="md:hidden"
              />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
