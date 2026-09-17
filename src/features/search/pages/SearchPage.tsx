import { useSearchParams } from 'react-router';
import { SearchForm } from '../components/SearchForm';
import { SearchResults } from '../components/SearchResults';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawQuery = searchParams.get('q') ?? '';
  const submittedTerm = rawQuery.trim();

  function handleSubmit(term: string) {
    const trimmed = term.trim();
    setSearchParams(trimmed ? { q: trimmed } : {});
  }

  return (
    <section className="mx-auto max-w-[1200px] px-4 py-6 md:px-6">
      {/* Remounts on external `q` changes (back/forward, direct link) so the
          uncontrolled input's text stays in sync with the submitted query. */}
      <SearchForm key={rawQuery} defaultValue={rawQuery} onSubmit={handleSubmit} />
      <SearchResults submittedTerm={submittedTerm} />
    </section>
  );
}
