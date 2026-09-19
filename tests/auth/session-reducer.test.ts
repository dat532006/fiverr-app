import { describe, expect, it, vi } from 'vitest';
import type { SessionSnapshotStore } from '../../src/infrastructure/session-storage/session-snapshot-store';
import {
  initializeSession,
  reduceSession,
  toSessionView,
  type SessionState,
} from '../../src/features/auth/session/session-reducer';
import { toUserId } from '../../src/shared/models/user-id';
import { USER_ID, USER_TOKEN, makeToken } from '../support/session-kit';

const NOW_MS = 1_800_000_000_000;
const NOW_S = NOW_MS / 1000;

function fakeStore(raw: string | null | 'unavailable') {
  const remove = vi.fn();
  const store: SessionSnapshotStore = {
    read: () => (raw === 'unavailable' ? { available: false } : { available: true, raw }),
    write: () => true,
    remove,
  };
  return { store, remove };
}

function snapshot(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({ v: 1, token: USER_TOKEN, userId: USER_ID, role: 'USER', ...overrides });
}

const init = (raw: string | null | 'unavailable') => {
  const { store, remove } = fakeStore(raw);
  return { state: initializeSession(store, () => NOW_MS), remove };
};

describe('TASK-013 T10 initializeSession — every restore branch', () => {
  it('storage unavailable → anonymous, memory-only, nothing to delete', () => {
    const { state, remove } = init('unavailable');
    expect(state).toMatchObject({ status: 'anonymous', persistence: 'memory-only' });
    expect(state.credentials).toBeNull();
    expect(remove).not.toHaveBeenCalled();
  });

  it('no snapshot → anonymous (and the caller sends zero requests)', () => {
    const { state, remove } = init(null);
    expect(state).toMatchObject({ status: 'anonymous', persistence: 'session-storage' });
    expect(remove).not.toHaveBeenCalled();
  });

  it.each([
    ['malformed', 'not json'],
    ['an unknown schema version', snapshot({ v: 9 })],
    ['an extra key', snapshot({ password: 'x' })],
  ])('%s → deleted and anonymous', (_label, raw) => {
    const { state, remove } = init(raw);
    expect(state.status).toBe('anonymous');
    expect(state.credentials).toBeNull();
    expect(remove).toHaveBeenCalledOnce();
  });

  it('a snapshot exp that has passed → deleted and expired', () => {
    const { state, remove } = init(snapshot({ exp: NOW_S - 1 }));
    expect(state.status).toBe('expired');
    expect(remove).toHaveBeenCalledOnce();
  });

  it('exp equal to now counts as passed', () => {
    expect(init(snapshot({ exp: NOW_S })).state.status).toBe('expired');
  });

  it('the token itself carrying a passed exp expires it even if the snapshot omits exp', () => {
    const token = makeToken({ id: String(USER_ID), exp: NOW_S - 10 });
    const { state, remove } = init(snapshot({ token }));
    expect(state.status).toBe('expired');
    expect(remove).toHaveBeenCalledOnce();
  });

  it('a token id claim that differs from the stored userId → deleted and anonymous', () => {
    const token = makeToken({ id: '1' });
    const { state, remove } = init(snapshot({ token }));
    expect(state.status).toBe('anonymous');
    expect(state.credentials).toBeNull();
    expect(remove).toHaveBeenCalledOnce();
  });

  it('a token without readable hints proceeds to restoring', () => {
    const { state } = init(snapshot({ token: 'opaque-token' }));
    expect(state.status).toBe('restoring');
    expect(state.credentials?.token).toBe('opaque-token');
  });

  it('a valid snapshot → restoring, untrusted until admission', () => {
    const { state, remove } = init(snapshot({ exp: NOW_S + 3600 }));
    expect(state).toMatchObject({
      status: 'restoring',
      phase: 'idle',
      epoch: 0,
      persistence: 'session-storage',
      displayName: '',
    });
    expect(state.credentials).toEqual({
      userId: toUserId(USER_ID),
      role: 'USER',
      token: USER_TOKEN,
    });
    expect(remove).not.toHaveBeenCalled();
    expect(toSessionView(state).identity).toBeNull();
  });
});

const restoring = init(snapshot()).state;

describe('TASK-013 reducer transitions and epoch guards', () => {
  it('a session view never carries the token', () => {
    const authenticated = reduceSession(restoring, {
      type: 'restore-completed',
      epoch: 0,
      displayName: 'Tên',
    });
    const view = toSessionView(authenticated);
    expect(view.identity).toEqual({ userId: '4242', role: 'USER', displayName: 'Tên' });
    expect(JSON.stringify(view)).not.toContain(USER_TOKEN);
  });

  it('restore completion needs the same epoch and the restoring status', () => {
    const stale = reduceSession(restoring, {
      type: 'restore-completed',
      epoch: 5,
      displayName: 'x',
    });
    expect(stale).toBe(restoring);
    const anonymous = reduceSession(restoring, { type: 'signed-out' });
    expect(
      reduceSession(anonymous, { type: 'restore-completed', epoch: 0, displayName: 'x' }),
    ).toBe(anonymous);
  });

  it.each(['restore-unavailable', 'restore-expired', 'restore-rejected'] as const)(
    'a late %s from an obsolete epoch is ignored',
    (type) => {
      expect(reduceSession(restoring, { type, epoch: 9 })).toBe(restoring);
    },
  );

  it('restore-unavailable keeps the credentials for a retry, and retry restarts restoring', () => {
    const unavailable = reduceSession(restoring, { type: 'restore-unavailable', epoch: 0 });
    expect(unavailable.status).toBe('restore-unavailable');
    expect(unavailable.credentials).not.toBeNull();
    expect(reduceSession(unavailable, { type: 'restore-started' }).status).toBe('restoring');
  });

  it('expired and rejected drop the credentials', () => {
    const expired = reduceSession(restoring, { type: 'restore-expired', epoch: 0 });
    expect(expired).toMatchObject({ status: 'expired', credentials: null });
    const rejected = reduceSession(restoring, { type: 'restore-rejected', epoch: 0 });
    expect(rejected).toMatchObject({ status: 'anonymous', credentials: null });
  });

  it('sign-out bumps the epoch and clears identity from any state', () => {
    const out = reduceSession(restoring, { type: 'signed-out' });
    expect(out).toMatchObject({ status: 'anonymous', epoch: 1, credentials: null, phase: 'idle' });
  });

  it('a sign-in boundary bumps the epoch and drops old credentials before the new session', () => {
    const inFlight: SessionState = { ...restoring, status: 'restore-unavailable', phase: 'idle' };
    const started = reduceSession(inFlight, { type: 'sign-in-started' });
    const boundary = reduceSession(started, { type: 'boundary' });
    expect(boundary).toMatchObject({ status: 'anonymous', epoch: 1, phase: 'signing-in' });
    expect(boundary.credentials).toBeNull();
    const published = reduceSession(boundary, {
      type: 'signed-in',
      credentials: { userId: toUserId(9), role: 'ADMIN', token: 'new-session-token' },
      displayName: 'B',
      persistence: 'memory-only',
    });
    expect(published).toMatchObject({
      status: 'authenticated',
      phase: 'idle',
      epoch: 1,
      persistence: 'memory-only',
    });
  });

  it('a late sign-in failure from an earlier epoch does not change the phase', () => {
    const later = reduceSession(reduceSession(restoring, { type: 'sign-in-started' }), {
      type: 'signed-out',
    });
    expect(reduceSession(later, { type: 'sign-in-failed', epoch: 0 })).toBe(later);
  });
});
