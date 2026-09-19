import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { useSessionCommands, useSessionView } from '../../features/auth/public';
import { Button } from '../../shared/ui/Button';
import { loginPath } from './paths';

type RequireSessionProps = Readonly<{ children: ReactNode }>;

// Guard for later private routes (none uses it yet). It is a client navigation aid, not a
// security boundary: the server decides what a token may do.
export function RequireSession({ children }: RequireSessionProps) {
  const view = useSessionView();
  const { retryRestore } = useSessionCommands();
  const location = useLocation();

  switch (view.status) {
    case 'booting':
    case 'restoring':
      // Wait: no redirect and no children until the restore has settled.
      return (
        <p role="status" className="mx-auto max-w-[1200px] px-4 py-10 text-sm md:px-6">
          Đang khôi phục phiên đăng nhập…
        </p>
      );
    case 'anonymous':
    case 'expired':
      return <Navigate to={loginPath(`${location.pathname}${location.search}`)} replace />;
    case 'restore-unavailable':
      return (
        <div
          role="status"
          className="mx-auto flex max-w-[1200px] flex-col items-start gap-3 px-4 py-10 text-sm md:px-6"
        >
          <p>Chưa khôi phục được phiên đăng nhập. Bạn có thể thử lại hoặc đăng nhập lại.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => void retryRestore()}>
              Thử lại
            </Button>
            <Link
              to={loginPath(`${location.pathname}${location.search}`)}
              className="inline-flex min-h-11 items-center px-3 py-2 text-[color:var(--ink)] underline"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      );
    case 'authenticated':
      return children;
  }
}
