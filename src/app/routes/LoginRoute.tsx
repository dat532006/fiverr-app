import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { LoginPage, useSessionView, type SessionStatus } from '../../features/auth/public';
import { sanitizeReturnTo } from './return-to';

const GUEST_STATUSES: readonly SessionStatus[] = ['anonymous', 'expired', 'restore-unavailable'];

// `/login`: the route, the redirect and `returnTo` belong to `app`; the page body belongs
// to `auth`. It renders inside `PublicLayout` like every other public route.
export function LoginRoute() {
  const [searchParams] = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'));
  const view = useSessionView();
  // Captured at arrival: was a sign-in form on screen, or was the visitor already signed in?
  const [arrivedAsGuest] = useState(() => GUEST_STATUSES.includes(view.status));

  if (view.status === 'authenticated') {
    // A session that could not be saved first tells the visitor (the page's "Tiếp tục"
    // interstitial). Anyone who arrived signed in is redirected at once, replacing the entry.
    if (arrivedAsGuest && view.persistence === 'memory-only') {
      return <LoginPage returnTo={returnTo} />;
    }
    return <Navigate to={returnTo} replace />;
  }
  return <LoginPage returnTo={returnTo} />;
}
