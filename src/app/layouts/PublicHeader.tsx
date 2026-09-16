import { Link } from 'react-router';
import { TaxonomyMenu } from '../../features/taxonomy/public';
import { ThemeToggleButton } from '../../shared/ui/theme/ThemeToggleButton';

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--line)] bg-[color:var(--panel)]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link to="/" className="text-lg font-semibold text-[color:var(--ink)]">
          Servio.
        </Link>
        <TaxonomyMenu />
        <div className="hidden flex-1 md:block" />
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/login" className="px-3 py-2 text-[color:var(--ink)]">
            Đăng nhập
          </Link>
          <Link
            to="/register"
            className="rounded-md bg-[color:var(--accent)] px-3 py-2 font-medium text-white"
          >
            Đăng ký
          </Link>
          <ThemeToggleButton />
        </nav>
      </div>
    </header>
  );
}
