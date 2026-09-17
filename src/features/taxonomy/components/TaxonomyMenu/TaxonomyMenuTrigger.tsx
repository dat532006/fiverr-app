import type { Ref } from 'react';
import { ChevronDown, Menu as MenuIcon } from 'lucide-react';

type TaxonomyMenuTriggerProps = Readonly<{
  isOpen: boolean;
  controls: string;
  onToggle: () => void;
  ref?: Ref<HTMLButtonElement>;
}>;

export function TaxonomyMenuTrigger({ isOpen, controls, onToggle, ref }: TaxonomyMenuTriggerProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="true"
      aria-expanded={isOpen}
      aria-controls={controls}
      onClick={onToggle}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-[color:var(--line-strong)] bg-[color:var(--panel)] px-3 py-2 text-sm font-medium text-[color:var(--ink)]"
    >
      <MenuIcon aria-hidden="true" className="h-4 w-4" />
      Danh mục
      <ChevronDown
        aria-hidden="true"
        className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>
  );
}
