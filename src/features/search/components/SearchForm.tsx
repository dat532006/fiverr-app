import { Search } from 'lucide-react';
import { useId, useRef, type FormEvent } from 'react';
import { Button } from '../../../shared/ui/Button';

type SearchFormProps = Readonly<{
  defaultValue: string;
  onSubmit: (term: string) => void;
}>;

export function SearchForm({ defaultValue, onSubmit }: SearchFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(inputRef.current?.value ?? '');
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-lg border border-[color:var(--line-strong)] bg-[color:var(--panel)] px-4 py-3"
    >
      <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-[color:var(--muted)]" />
      <label htmlFor={inputId} className="sr-only">
        Tìm kiếm dịch vụ
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Bạn đang tìm dịch vụ gì?"
        className="w-full min-w-0 bg-transparent text-sm text-[color:var(--ink)] placeholder:text-[color:var(--muted)] focus:outline-none"
      />
      <Button type="submit" variant="primary" className="shrink-0">
        Tìm kiếm
      </Button>
    </form>
  );
}
