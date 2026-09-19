import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import type { SessionSnapshotStore } from '../../src/infrastructure/session-storage/session-snapshot-store';
import { toSessionView } from '../../src/features/auth/session/session-reducer';
import {
  createSessionRuntime,
  type SessionDependencies,
} from '../../src/features/auth/session/session-runtime';
import { toUserId } from '../../src/shared/models/user-id';
import { mockServer } from '../support/server';
import {
  PATHS,
  USER_ID,
  USER_TOKEN,
  deferred,
  makeToken,
  recordRequests,
  seedSnapshot,
  signinBody,
  stopRecordingRequests,
} from '../support/session-kit';

vi.mock('../../src/infrastructure/http/client', async () => {
  const kit = await import('../support/session-kit');
  return { getHttpClient: () => kit.currentTestClient() };
});

afterEach(() => stopRecordingRequests());

const credentials = { email: 'thu@example.invalid', password: 'synthetic-typed-secret' };
const PROFILE = { userId: toUserId(USER_ID), role: 'USER' as const, displayName: 'Tên' };

function memoryStore(order: string[] = [], writable = true) {
  let value: string | null = window.sessionStorage.getItem('servio-session');
  const store: SessionSnapshotStore = {
    read: () => ({ available: true, raw: value }),
    write: (raw) => {
      order.push('write');
      if (!writable) return false;
      value = raw;
      return true;
    },
    remove: () => {
      order.push('remove');
      value = null;
    },
  };
  return { store, current: () => value };
}

function build(overrides: Partial<SessionDependencies> = {}, order: string[] = []) {
  const memory = memoryStore(order);
  const deps: SessionDependencies = {
    store: memory.store,
    onSessionBoundary: () => void order.push('boundary'),
    readAdmission: vi.fn(() => Promise.resolve({ admitted: true })),
    readProfile: vi.fn(() => Promise.resolve(PROFILE)),
    ...overrides,
  };
  return { runtime: createSessionRuntime(deps), deps, memory, order };
}

function serveSignin(body = signinBody()) {
  mockServer.use(http.post(PATHS.signin, () => HttpResponse.json(body)));
}

describe('TASK-013 T09/T22 sign-in controller', () => {
  it('runs boundary → snapshot replace → publish, in that order, and persists a minimal snapshot', async () => {
    const order: string[] = [];
    const { runtime, memory } = build({}, order);
    const seen: string[] = [];
    runtime.subscribe(() => seen.push(runtime.getState().status));
    serveSignin();

    const outcome = await runtime.signIn(credentials);
    expect(outcome).toEqual({ kind: 'signed-in', persistence: 'session-storage' });
    expect(order).toEqual(['boundary', 'remove', 'write']);
    // Anonymous (boundary) is the last thing seen before the new session is published.
    expect(seen.at(-1)).toBe('authenticated');
    expect(seen.indexOf('authenticated')).toBeGreaterThan(-1);
    expect(JSON.parse(memory.current() ?? '{}')).toEqual({
      v: 1,
      token: USER_TOKEN,
      userId: USER_ID,
      role: 'USER',
    });
  });

  it('never exposes the token through the view, and keeps the epoch consistent', async () => {
    const { runtime } = build();
    serveSignin();
    await runtime.signIn(credentials);
    const state = runtime.getState();
    expect(state.epoch).toBe(1);
    expect(state.credentials?.token).toBe(USER_TOKEN);
    const view = toSessionView(state);
    expect(JSON.stringify(view)).not.toContain(USER_TOKEN);
    expect(view.identity).toEqual({ userId: '4242', role: 'USER', displayName: 'Người Dùng Thử' });
    const ctx = runtime.requestContextFor(state);
    expect(ctx).toMatchObject({ userId: '4242', accessToken: USER_TOKEN, epoch: 1 });
    expect(ctx?.isCurrent()).toBe(true);
  });

  it('stores the token exp hint when there is one, and no client-invented TTL when there is not', async () => {
    const withExp = build();
    const token = makeToken({ id: String(USER_ID), exp: 4_000_000_000 });
    serveSignin(signinBody({}, token));
    await withExp.runtime.signIn(credentials);
    expect(JSON.parse(withExp.memory.current() ?? '{}').exp).toBe(4_000_000_000);

    const withoutExp = build();
    serveSignin();
    await withoutExp.runtime.signIn(credentials);
    expect(JSON.parse(withoutExp.memory.current() ?? '{}')).not.toHaveProperty('exp');
  });

  it('falls back to memory-only when the snapshot cannot be written, and still signs in', async () => {
    const memory = memoryStore([], false);
    const { runtime } = build({ store: memory.store });
    serveSignin();
    expect(await runtime.signIn(credentials)).toEqual({
      kind: 'signed-in',
      persistence: 'memory-only',
    });
    expect(runtime.getState()).toMatchObject({
      status: 'authenticated',
      persistence: 'memory-only',
    });
  });

  it('is single-flight: two concurrent calls send one E02', async () => {
    const requests = recordRequests();
    const { runtime } = build();
    const gate = deferred();
    mockServer.use(
      http.post(PATHS.signin, async () => {
        await gate.promise;
        return HttpResponse.json(signinBody());
      }),
    );
    const first = runtime.signIn(credentials);
    const second = await runtime.signIn(credentials);
    expect(second).toEqual({ kind: 'busy' });
    gate.resolve();
    expect((await first).kind).toBe('signed-in');
    expect(requests.filter((request) => request.url === PATHS.signin)).toHaveLength(1);
  });

  it('refuses to sign in while restoring or already authenticated: nothing sent', async () => {
    seedSnapshot();
    const requests = recordRequests();
    const gate = deferred<unknown>();
    const { runtime } = build({ readAdmission: () => gate.promise });
    runtime.startInitialRestore();
    expect(runtime.getState().status).toBe('restoring');
    expect(await runtime.signIn(credentials)).toEqual({ kind: 'busy' });
    expect(requests).toHaveLength(0);

    gate.resolve({ admitted: true });
    await vi.waitFor(() => expect(runtime.getState().status).toBe('authenticated'));
    expect(await runtime.signIn(credentials)).toEqual({ kind: 'busy' });
    expect(requests).toHaveLength(0);
  });

  it('is not sent at all while the browser is offline', async () => {
    const requests = recordRequests();
    const { runtime } = build({ isOnline: () => false });
    expect(await runtime.signIn(credentials)).toEqual({ kind: 'offline' });
    expect(requests).toHaveLength(0);
    expect(runtime.getState().phase).toBe('idle');
  });

  it('may sign in from expired and from restore-unavailable', async () => {
    seedSnapshot({ exp: 1 });
    const expired = build();
    expect(expired.runtime.getState().status).toBe('expired');
    serveSignin();
    expect((await expired.runtime.signIn(credentials)).kind).toBe('signed-in');

    seedSnapshot();
    const unavailable = build({
      readAdmission: () => Promise.reject(new Error('boom')),
    });
    unavailable.runtime.startInitialRestore();
    await vi.waitFor(() =>
      expect(unavailable.runtime.getState().status).toBe('restore-unavailable'),
    );
    serveSignin();
    expect((await unavailable.runtime.signIn(credentials)).kind).toBe('signed-in');
    expect(unavailable.runtime.getState().epoch).toBe(1);
  });

  it('a token whose id claim disagrees with the user record publishes nothing and writes nothing', async () => {
    const order: string[] = [];
    const { runtime, memory } = build({}, order);
    serveSignin(signinBody({}, makeToken({ id: '1' })));
    const outcome = await runtime.signIn(credentials);
    expect(outcome).toMatchObject({ kind: 'failed', error: { kind: 'decode' } });
    expect(order).toEqual([]);
    expect(memory.current()).toBeNull();
    expect(runtime.getState()).toMatchObject({ status: 'anonymous', phase: 'idle', epoch: 0 });
  });

  it('a failed sign-in leaves the session anonymous and sends no other request', async () => {
    const requests = recordRequests();
    const { runtime } = build();
    mockServer.use(http.post(PATHS.signin, () => new HttpResponse(null, { status: 401 })));
    expect(await runtime.signIn(credentials)).toEqual({ kind: 'rejected' });
    expect(runtime.getState()).toMatchObject({ status: 'anonymous', phase: 'idle', epoch: 0 });
    expect(requests).toHaveLength(1);
  });

  it('discards a sign-in result that arrives after sign-out: nothing published, nothing written', async () => {
    const order: string[] = [];
    const { runtime, memory } = build({}, order);
    const gate = deferred();
    mockServer.use(
      http.post(PATHS.signin, async () => {
        await gate.promise;
        return HttpResponse.json(signinBody());
      }),
    );
    const pending = runtime.signIn(credentials);
    runtime.signOut();
    order.length = 0;
    gate.resolve();
    expect(await pending).toEqual({ kind: 'stale' });
    expect(order).toEqual([]);
    expect(memory.current()).toBeNull();
    expect(runtime.getState()).toMatchObject({ status: 'anonymous', phase: 'idle' });
  });
});

describe('TASK-013 T09 sign-out and late restore results', () => {
  it('sign-out sends no request of any kind and clears the snapshot and the caches', async () => {
    const requests = recordRequests();
    const order: string[] = [];
    const { runtime, memory } = build({}, order);
    serveSignin();
    await runtime.signIn(credentials);
    requests.length = 0;
    order.length = 0;

    runtime.signOut();
    expect(requests).toHaveLength(0);
    expect(order).toEqual(['boundary', 'remove']);
    expect(memory.current()).toBeNull();
    expect(runtime.getState()).toMatchObject({ status: 'anonymous', epoch: 2, credentials: null });
  });

  it('a request context captured before sign-out is no longer current afterwards', async () => {
    const { runtime } = build();
    serveSignin();
    await runtime.signIn(credentials);
    const ctx = runtime.requestContextFor(runtime.getState());
    expect(ctx?.isCurrent()).toBe(true);
    runtime.signOut();
    expect(ctx?.isCurrent()).toBe(false);
  });

  it('sign-out then sign-in DURING a restore: the old restore’s late results never reach the new session', async () => {
    seedSnapshot();
    const admission = deferred<unknown>();
    const readProfile = vi.fn(() => Promise.resolve(PROFILE));
    const contexts: Array<{ isCurrent(): boolean }> = [];
    const { runtime } = build({
      readAdmission: (ctx) => {
        contexts.push(ctx);
        return admission.promise;
      },
      readProfile,
    });
    runtime.startInitialRestore();
    expect(runtime.getState().status).toBe('restoring');

    runtime.signOut();
    // A different user signs in on the same tab.
    const other = 9001;
    const otherToken = makeToken({ id: String(other) });
    serveSignin(signinBody({ id: other, name: 'Người Khác' }, otherToken));
    expect((await runtime.signIn(credentials)).kind).toBe('signed-in');
    const before = runtime.getState();
    expect(before).toMatchObject({ status: 'authenticated', epoch: 2 });

    // Session A's E50 finally answers.
    admission.resolve({ admitted: true });
    await new Promise((done) => setTimeout(done, 20));
    expect(readProfile).not.toHaveBeenCalled();
    expect(contexts[0]?.isCurrent()).toBe(false);
    expect(runtime.getState()).toBe(before);
    expect(toSessionView(runtime.getState()).identity).toMatchObject({
      userId: String(other),
      displayName: 'Người Khác',
    });
  });

  it('a late E39 result from an obsolete epoch is dropped', async () => {
    seedSnapshot();
    const profile = deferred<typeof PROFILE>();
    const { runtime } = build({ readProfile: () => profile.promise });
    runtime.startInitialRestore();
    await vi.waitFor(() => expect(runtime.getState().status).toBe('restoring'));
    await new Promise((done) => setTimeout(done, 10));

    runtime.signOut();
    profile.resolve(PROFILE);
    await new Promise((done) => setTimeout(done, 20));
    expect(runtime.getState()).toMatchObject({ status: 'anonymous', credentials: null });
  });

  it('startInitialRestore is idempotent: a second call issues no second admission', async () => {
    seedSnapshot();
    const readAdmission = vi.fn(() => Promise.resolve({ admitted: true }));
    const { runtime } = build({ readAdmission });
    runtime.startInitialRestore();
    runtime.startInitialRestore();
    await vi.waitFor(() => expect(runtime.getState().status).toBe('authenticated'));
    expect(readAdmission).toHaveBeenCalledTimes(1);
  });

  it('retryRestore does nothing unless the session is restore-unavailable', async () => {
    const readAdmission = vi.fn(() => Promise.resolve({ admitted: true }));
    const { runtime } = build({ readAdmission });
    await runtime.retryRestore();
    expect(readAdmission).not.toHaveBeenCalled();
    expect(runtime.getState().status).toBe('anonymous');
  });
});
