import type { AppError } from '../../../shared/models/app-error';
import type { UserId } from '../../../shared/models/user-id';
import type { SessionSnapshotStore } from '../../../infrastructure/session-storage/session-snapshot-store';
import { SigninDecodeError } from '../api/signin.dto';
import { postSignin, type SigninCredentials } from '../api/signin.endpoint';
import { readTokenHints } from '../api/token-hints';
import { classifySigninFailure } from '../model/map-signin-failure';
import { mapSigninIdentity } from '../model/map-signin';
import type { PersistenceMode, SessionRequestContext, SessionRole } from '../model/session';
import { encodeSnapshot } from '../model/snapshot';
import { SessionRejectedError } from './errors';
import {
  initializeSession,
  reduceSession,
  type SessionAction,
  type SessionCredentials,
  type SessionState,
} from './session-reducer';

// What the app coordinator's E39 read must hand back. Kept structural so `auth` imports no
// other feature: the concrete type is `profile`'s `SessionProfile`.
export interface RestoredProfile {
  readonly userId: UserId;
  readonly role: SessionRole;
  readonly displayName: string;
}

export interface SessionDependencies {
  readonly store: SessionSnapshotStore;
  // Cancels in-flight queries and clears every cached server response. Called at each
  // session boundary (sign-in, sign-out).
  readonly onSessionBoundary: () => void;
  // E50 admission read. Resolves when the token is admitted; rejects otherwise.
  readonly readAdmission: (ctx: SessionRequestContext) => Promise<unknown>;
  // E39 consistency read for the same captured context.
  readonly readProfile: (userId: UserId, ctx: SessionRequestContext) => Promise<RestoredProfile>;
  readonly now?: () => number;
  readonly isOnline?: () => boolean;
}

export type SignInOutcome =
  | Readonly<{ kind: 'signed-in'; persistence: PersistenceMode }>
  | Readonly<{ kind: 'rejected' }>
  | Readonly<{ kind: 'failed'; error: AppError }>
  | Readonly<{ kind: 'offline' }>
  // Not allowed in the current state (already in flight, restoring, signed in): nothing sent.
  | Readonly<{ kind: 'busy' }>
  // The session changed while the request was in flight: the result was discarded.
  | Readonly<{ kind: 'stale' }>;

export interface SessionCommands {
  signIn(credentials: SigninCredentials): Promise<SignInOutcome>;
  signOut(): void;
  retryRestore(): Promise<void>;
}

export interface SessionRuntime extends SessionCommands {
  getState(): SessionState;
  subscribe(listener: () => void): () => void;
  requestContextFor(state: SessionState): SessionRequestContext | null;
  startInitialRestore(): void;
}

const SIGN_IN_STATUSES = new Set(['anonymous', 'expired', 'restore-unavailable']);

// Only a 401 (or an explicit invalid-session signal) expires the snapshot. Every other
// failure, including an ambiguous 403 or a network error, keeps it for a retry.
function isSessionRejection(error: unknown): boolean {
  return error instanceof SessionRejectedError;
}

// The session controller: owns the epoch, the single-flight rules and the restore steps.
// It is plain TypeScript (state in a closure, published through `subscribe`) so it can be
// tested without React and never depends on render timing. Its dependencies are injected by
// the `app` coordinator, so `auth` imports no other feature.
export function createSessionRuntime(dependencies: SessionDependencies): SessionRuntime {
  const { store, onSessionBoundary, readAdmission, readProfile } = dependencies;
  const now = dependencies.now ?? Date.now;
  const isOnline = dependencies.isOnline ?? (() => navigator.onLine !== false);

  let state = initializeSession(store, now);
  let initialRestoreStarted = false;
  const listeners = new Set<() => void>();

  function dispatch(action: SessionAction) {
    const next = reduceSession(state, action);
    if (next === state) return;
    state = next;
    listeners.forEach((listener) => listener());
  }

  function contextFor(credentials: SessionCredentials, epoch: number): SessionRequestContext {
    return {
      userId: credentials.userId,
      accessToken: credentials.token,
      epoch,
      isCurrent: () => state.epoch === epoch,
    };
  }

  // One admission attempt: E50 admits the token, then E39 confirms the same identity. A
  // late result is dropped by the epoch, never by unmount, so a StrictMode remount cannot
  // strand the restore in `restoring`.
  async function attemptRestore(): Promise<void> {
    const credentials = state.credentials;
    if (state.status !== 'restoring' || !credentials) return;
    const e0 = state.epoch;
    const ctx = contextFor(credentials, e0);

    let profile: RestoredProfile;
    try {
      await readAdmission(ctx);
      if (state.epoch !== e0) return;
      profile = await readProfile(credentials.userId, ctx);
    } catch (error) {
      // A late failure from an obsolete session is dropped, whatever it was.
      if (state.epoch !== e0) return;
      if (isSessionRejection(error)) {
        store.remove();
        dispatch({ type: 'restore-expired', epoch: e0 });
      } else {
        dispatch({ type: 'restore-unavailable', epoch: e0 });
      }
      return;
    }
    if (state.epoch !== e0) return;

    // An E39 success alone never authenticates: the identity and role must match the
    // snapshot exactly. A mismatch deletes the snapshot; the role is never raised here.
    if (profile.userId !== credentials.userId || profile.role !== credentials.role) {
      store.remove();
      dispatch({ type: 'restore-rejected', epoch: e0 });
      return;
    }
    dispatch({ type: 'restore-completed', epoch: e0, displayName: profile.displayName });
  }

  async function signIn(credentials: SigninCredentials): Promise<SignInOutcome> {
    if (state.phase !== 'idle' || !SIGN_IN_STATUSES.has(state.status)) return { kind: 'busy' };
    if (!isOnline()) return { kind: 'offline' };

    const e0 = state.epoch;
    dispatch({ type: 'sign-in-started' });

    let dto;
    try {
      dto = await postSignin(credentials);
    } catch (error) {
      if (state.epoch !== e0) return { kind: 'stale' };
      dispatch({ type: 'sign-in-failed', epoch: e0 });
      return classifySigninFailure(error);
    }
    if (state.epoch !== e0) return { kind: 'stale' };

    let identity;
    try {
      identity = mapSigninIdentity(dto.user);
    } catch (error) {
      dispatch({ type: 'sign-in-failed', epoch: e0 });
      return classifySigninFailure(error);
    }

    // The token's `id` claim is only a hint, but a present claim that disagrees with the
    // user record means the response is inconsistent: nothing is published.
    const hints = readTokenHints(dto.token);
    if (hints.id !== undefined && hints.id !== String(dto.user.id)) {
      dispatch({ type: 'sign-in-failed', epoch: e0 });
      return classifySigninFailure(new SigninDecodeError());
    }

    // Session boundary: drop the previous session and everything cached under it, replace
    // the snapshot, and only then publish the new state.
    dispatch({ type: 'boundary' });
    onSessionBoundary();
    store.remove();
    const persisted = store.write(
      encodeSnapshot({
        token: dto.token,
        userId: identity.userId,
        role: identity.role,
        ...(hints.exp !== undefined && { exp: hints.exp }),
      }),
    );
    const persistence: PersistenceMode = persisted ? 'session-storage' : 'memory-only';
    dispatch({
      type: 'signed-in',
      credentials: { userId: identity.userId, role: identity.role, token: dto.token },
      displayName: identity.displayName,
      persistence,
    });
    return { kind: 'signed-in', persistence };
  }

  function signOut() {
    // Local only: there is no logout endpoint, so no request of any kind is sent.
    dispatch({ type: 'signed-out' });
    onSessionBoundary();
    store.remove();
  }

  async function retryRestore(): Promise<void> {
    if (state.phase !== 'idle' || state.status !== 'restore-unavailable') return;
    dispatch({ type: 'restore-started' });
    await attemptRestore();
  }

  return {
    signIn,
    signOut,
    retryRestore,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    // The context of an authenticated state; `isCurrent()` always reads the live epoch.
    requestContextFor(snapshot) {
      return snapshot.status === 'authenticated' && snapshot.credentials
        ? contextFor(snapshot.credentials, snapshot.epoch)
        : null;
    },
    // Idempotent: a StrictMode effect that runs twice still starts exactly one restore.
    startInitialRestore() {
      if (initialRestoreStarted) return;
      initialRestoreStarted = true;
      void attemptRestore();
    },
  };
}
