import type { UserId } from '../../../shared/models/user-id';
import { readTokenHints } from '../api/token-hints';
import type { SessionSnapshotStore } from '../../../infrastructure/session-storage/session-snapshot-store';
import type {
  PersistenceMode,
  SessionPhase,
  SessionRole,
  SessionStatus,
  SessionView,
} from '../model/session';
import { decodeSnapshot } from '../model/snapshot';

// The token lives here, in memory, and nowhere a display hook can reach: `SessionView`
// (derived below) has no token. While `status` is `restoring` or `restore-unavailable` the
// credentials are an untrusted snapshot copy; only `authenticated` means admitted.
export interface SessionCredentials {
  readonly userId: UserId;
  readonly role: SessionRole;
  readonly token: string;
}

export interface SessionState {
  readonly status: SessionStatus;
  readonly phase: SessionPhase;
  readonly epoch: number;
  readonly persistence: PersistenceMode;
  readonly credentials: SessionCredentials | null;
  readonly displayName: string;
}

// Actions from asynchronous flows carry the epoch they started in; a late action from an
// obsolete session is ignored here, so it can never reactivate that session.
export type SessionAction =
  | Readonly<{ type: 'sign-in-started' }>
  | Readonly<{ type: 'sign-in-failed'; epoch: number }>
  | Readonly<{ type: 'boundary' }>
  | Readonly<{
      type: 'signed-in';
      credentials: SessionCredentials;
      displayName: string;
      persistence: PersistenceMode;
    }>
  | Readonly<{ type: 'signed-out' }>
  | Readonly<{ type: 'restore-started' }>
  | Readonly<{ type: 'restore-completed'; epoch: number; displayName: string }>
  | Readonly<{ type: 'restore-unavailable'; epoch: number }>
  | Readonly<{ type: 'restore-expired'; epoch: number }>
  | Readonly<{ type: 'restore-rejected'; epoch: number }>;

function settled(status: SessionStatus, persistence: PersistenceMode, epoch: number): SessionState {
  return { status, phase: 'idle', epoch, persistence, credentials: null, displayName: '' };
}

export function reduceSession(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'sign-in-started':
      return { ...state, phase: 'signing-in' };
    case 'sign-in-failed':
      return action.epoch === state.epoch ? { ...state, phase: 'idle' } : state;
    case 'boundary':
      // A session boundary: every previous credential is dropped before anything new exists.
      return { ...settled('anonymous', state.persistence, state.epoch + 1), phase: state.phase };
    case 'signed-in':
      return {
        status: 'authenticated',
        phase: 'idle',
        epoch: state.epoch,
        persistence: action.persistence,
        credentials: action.credentials,
        displayName: action.displayName,
      };
    case 'signed-out':
      return settled('anonymous', state.persistence, state.epoch + 1);
    case 'restore-started':
      return state.status === 'restore-unavailable' && state.credentials
        ? { ...state, status: 'restoring' }
        : state;
    case 'restore-completed':
      return action.epoch === state.epoch && state.status === 'restoring' && state.credentials
        ? { ...state, status: 'authenticated', displayName: action.displayName }
        : state;
    case 'restore-unavailable':
      return action.epoch === state.epoch && state.status === 'restoring'
        ? { ...state, status: 'restore-unavailable' }
        : state;
    case 'restore-expired':
      return action.epoch === state.epoch && state.status === 'restoring'
        ? settled('expired', state.persistence, state.epoch)
        : state;
    case 'restore-rejected':
      return action.epoch === state.epoch && state.status === 'restoring'
        ? settled('anonymous', state.persistence, state.epoch)
        : state;
  }
}

// Runs synchronously when the provider is created, so the first render is already settled
// for guests and never flashes a loading state. Reads the snapshot as untrusted input:
// every failure deletes it (there is no repair) and ends anonymous or expired.
export function initializeSession(store: SessionSnapshotStore, now: () => number): SessionState {
  const read = store.read();
  if (!read.available) return settled('anonymous', 'memory-only', 0);
  if (read.raw === null) return settled('anonymous', 'session-storage', 0);

  const snapshot = decodeSnapshot(read.raw);
  if (!snapshot) {
    store.remove();
    return settled('anonymous', 'session-storage', 0);
  }

  // The hints may only deny. A client clock that is ahead can expire a token the server
  // would still accept; that is accepted, the reverse is never assumed.
  const hints = readTokenHints(snapshot.token);
  const nowSeconds = now() / 1000;
  const expiries = [snapshot.exp, hints.exp].filter((value) => value !== undefined);
  if (expiries.some((exp) => exp <= nowSeconds)) {
    store.remove();
    return settled('expired', 'session-storage', 0);
  }
  if (hints.id !== undefined && hints.id !== snapshot.userId) {
    store.remove();
    return settled('anonymous', 'session-storage', 0);
  }

  return {
    status: 'restoring',
    phase: 'idle',
    epoch: 0,
    persistence: 'session-storage',
    credentials: { userId: snapshot.userId, role: snapshot.role, token: snapshot.token },
    displayName: '',
  };
}

export function toSessionView(state: SessionState): SessionView {
  return {
    status: state.status,
    phase: state.phase,
    persistence: state.persistence,
    identity:
      state.status === 'authenticated' && state.credentials
        ? {
            userId: state.credentials.userId,
            role: state.credentials.role,
            displayName: state.displayName,
          }
        : null,
  };
}
