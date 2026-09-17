import { Outlet } from 'react-router';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--ground)] text-[color:var(--ink)]">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
