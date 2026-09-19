import { useEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import {
  SessionCommandsContext,
  SessionRequestContextContext,
  SessionViewContext,
} from './session-context';
import { toSessionView } from './session-reducer';
import { createSessionRuntime, type SessionDependencies } from './session-runtime';

type SessionProviderProps = PropsWithChildren<{
  // Composed by the `app` coordinator. Read once, when the provider is created.
  dependencies: SessionDependencies;
}>;

export function SessionProvider({ dependencies, children }: SessionProviderProps) {
  // Creating the runtime has no side effect beyond reading (and possibly deleting) the
  // snapshot, so a discarded StrictMode render is harmless.
  const [runtime] = useState(() => createSessionRuntime(dependencies));
  const state = useSyncExternalStore(runtime.subscribe, runtime.getState);

  // Once per provider: `startInitialRestore` is idempotent across a StrictMode remount.
  useEffect(() => {
    void runtime.startInitialRestore();
  }, [runtime]);

  const commands = useMemo(
    () => ({
      signIn: runtime.signIn,
      signOut: runtime.signOut,
      retryRestore: runtime.retryRestore,
    }),
    [runtime],
  );
  const view = useMemo(() => toSessionView(state), [state]);
  const requestContext = useMemo(() => runtime.requestContextFor(state), [runtime, state]);

  return (
    <SessionCommandsContext.Provider value={commands}>
      <SessionViewContext.Provider value={view}>
        <SessionRequestContextContext.Provider value={requestContext}>
          {children}
        </SessionRequestContextContext.Provider>
      </SessionViewContext.Provider>
    </SessionCommandsContext.Provider>
  );
}
