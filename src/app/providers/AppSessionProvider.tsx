import { useState, type PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SessionProvider } from '../../features/auth/public';
import { createBrowserSessionSnapshotStore } from '../../infrastructure/session-storage/session-snapshot-store';
import { createRestoreSession } from './restore-session';

// App composes its restore coordinator with auth's guarded session lifecycle and storage.
export function AppSessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [dependencies] = useState(() => ({
    store: createBrowserSessionSnapshotStore(),
    // At every session boundary the whole client is cleared, so nothing from the previous
    // session (or any admin/private read) can be shown to the next one.
    onSessionBoundary: () => {
      void queryClient.cancelQueries();
      queryClient.clear();
    },
    restoreSession: createRestoreSession(),
  }));

  return <SessionProvider dependencies={dependencies}>{children}</SessionProvider>;
}
