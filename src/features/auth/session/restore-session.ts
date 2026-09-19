import type { SessionRequestContext, SessionRole } from '../model/session';

// Narrow contract for app's restore coordinator; no endpoint or foreign feature model.
export type RestoreSession = (
  context: SessionRequestContext,
  expectedRole: SessionRole,
) => Promise<
  | Readonly<{ kind: 'completed'; displayName: string }>
  | Readonly<{ kind: 'expired' | 'unavailable' | 'rejected' | 'stale' }>
>;
