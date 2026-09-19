// Snapshot I/O only: no JSON, no React, no network. The value is an opaque string that the
// owning feature decodes as untrusted input. Every storage access can throw (blocked
// storage, quota, privacy modes), so each one is wrapped and reported instead of thrown.
const SESSION_SNAPSHOT_KEY = 'servio-session';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type SnapshotRead =
  Readonly<{ available: true; raw: string | null }> | Readonly<{ available: false }>;

export type SessionSnapshotStore = Readonly<{
  read: () => SnapshotRead;
  write: (raw: string) => boolean;
  remove: () => void;
}>;

// `resolveStorage` is a function because merely touching `window.sessionStorage` can throw.
export function createSessionSnapshotStore(
  resolveStorage: () => StorageLike,
): SessionSnapshotStore {
  return {
    read() {
      try {
        return { available: true, raw: resolveStorage().getItem(SESSION_SNAPSHOT_KEY) };
      } catch {
        return { available: false };
      }
    },
    write(raw) {
      try {
        resolveStorage().setItem(SESSION_SNAPSHOT_KEY, raw);
        return true;
      } catch {
        return false;
      }
    },
    remove() {
      try {
        resolveStorage().removeItem(SESSION_SNAPSHOT_KEY);
      } catch {
        // Nothing to clear when storage is unavailable.
      }
    },
  };
}

export function createBrowserSessionSnapshotStore(): SessionSnapshotStore {
  return createSessionSnapshotStore(() => window.sessionStorage);
}
