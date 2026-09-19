import { useState, type PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SessionProvider } from '../../features/auth/public';
import { readMineAdmission } from '../../features/hires/public';
import { readProfileForSession } from '../../features/profile/public';
import { createBrowserSessionSnapshotStore } from '../../infrastructure/session-storage/session-snapshot-store';

// The session coordinator. `auth` owns the session state and the restore steps but imports
// no other feature; this is where its narrow dependencies are composed: the snapshot store,
// the query-cache boundary, and the two public reads (E50 admission, E39 consistency).
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
    readAdmission: readMineAdmission,
    readProfile: readProfileForSession,
  }));

  return <SessionProvider dependencies={dependencies}>{children}</SessionProvider>;
}
