import { useContext, useMemo } from 'react';
import type { SessionRequestContext, SessionView } from '../model/session';
import {
  SessionCommandsContext,
  SessionRequestContextContext,
  SessionViewContext,
} from './session-context';
import type { SessionCommands } from './session-runtime';

const MISSING_PROVIDER = 'Session hooks must be used inside a SessionProvider.';

// Display hook: identity, status and persistence mode only. It carries no token.
export function useSessionView(): SessionView {
  const view = useContext(SessionViewContext);
  if (!view) throw new Error(MISSING_PROVIDER);
  return view;
}

// Internal to `auth` (the sign-in form): the full command set.
export function useSessionController(): SessionCommands {
  const commands = useContext(SessionCommandsContext);
  if (!commands) throw new Error(MISSING_PROVIDER);
  return commands;
}

// The commands every consumer may use. `signIn` is reserved for the sign-in form.
export function useSessionCommands(): Pick<SessionCommands, 'signOut' | 'retryRestore'> {
  const { signOut, retryRestore } = useSessionController();
  return useMemo(() => ({ signOut, retryRestore }), [signOut, retryRestore]);
}

// Non-display hook for feature adapters that must send the user token. `null` unless the
// session is authenticated. The token stays out of `useSessionView`.
export function useSessionRequestContext(): SessionRequestContext | null {
  return useContext(SessionRequestContextContext);
}
