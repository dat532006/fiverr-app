import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { QueryClient } from '@tanstack/react-query';
import { BootstrapApp } from '../../src/app/bootstrap/BootstrapApp';
import { useSessionCommands } from '../../src/features/auth/public';
import { mockServer } from '../support/server';
import { renderBootstrap } from '../support/render';
import {
  PATHS,
  SYNTHETIC_PASSWORD_FIELD,
  USER_TOKEN,
  deferred,
  enter,
  okHires,
  okUser,
  seedSnapshot,
  signinBody,
  stopRecordingRequests,
} from '../support/session-kit';

vi.mock('../../src/infrastructure/http/client', async () => {
  const kit = await import('../support/session-kit');
  return { getHttpClient: () => kit.currentTestClient() };
});

vi.setConfig({ testTimeout: 20_000 });

afterEach(() => stopRecordingRequests());

const EMAIL = 'thu@example.invalid';
const PASSWORD = 'synthetic-typed-secret';
const NAME = 'Người Dùng Thử';

function SignOutProbe() {
  const { signOut } = useSessionCommands();
  return (
    <button type="button" onClick={signOut}>
      probe-sign-out
    </button>
  );
}

function mount(path: string) {
  return renderBootstrap(
    <>
      <BootstrapApp />
      <SignOutProbe />
    </>,
    path,
  );
}

// Everything a previous session could have left behind: server data, an in-flight read and
// a mutation.
function seedPreviousSession(queryClient: QueryClient) {
  queryClient.setQueryData(['private', 'previous-user-data'], { secret: 'previous session' });
  queryClient.setQueryData(['admin', 'rows'], [{ id: 1 }]);
  const slow = deferred<string>();
  const inFlight = queryClient
    .fetchQuery({ queryKey: ['private', 'slow-read'], queryFn: () => slow.promise })
    .catch(() => undefined);
  queryClient.getMutationCache().build(queryClient, { mutationFn: () => Promise.resolve(1) });
  return { slow, inFlight };
}

function expectNothingFromBefore(queryClient: QueryClient) {
  expect(queryClient.getQueryData(['private', 'previous-user-data'])).toBeUndefined();
  expect(queryClient.getQueryData(['admin', 'rows'])).toBeUndefined();
  expect(queryClient.getQueryData(['private', 'slow-read'])).toBeUndefined();
  expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
  // Any query object that remains (a mounted observer re-registering its key) is empty.
  for (const query of queryClient.getQueryCache().getAll()) {
    expect(query.state.data).toBeUndefined();
  }
}

function everyKeyAndVariable(queryClient: QueryClient): string {
  return JSON.stringify([
    queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey),
    queryClient
      .getMutationCache()
      .getAll()
      .map((mutation) => [mutation.options.mutationKey, mutation.state.variables]),
  ]);
}

describe('TASK-013 T22 session boundaries clear and cancel the whole client', () => {
  it('sign-in: the query and mutation caches hold nothing from before, and an in-flight read cannot land afterwards', async () => {
    mockServer.use(http.post(PATHS.signin, () => HttpResponse.json(signinBody())));
    const user = userEvent.setup();
    const { queryClient } = mount('/login?returnTo=%2Fjob%2F7');
    const previous = seedPreviousSession(queryClient);
    expect(queryClient.getQueryData(['private', 'previous-user-data'])).toBeDefined();

    await enter(user, await screen.findByLabelText('Email'), EMAIL);
    await enter(user, screen.getByLabelText('Mật khẩu'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(await screen.findByRole('button', { name: NAME })).toBeTruthy();

    expectNothingFromBefore(queryClient);
    // The old read finishing later must not repopulate the new session's cache.
    previous.slow.resolve('late data from the previous session');
    await previous.inFlight;
    await new Promise((done) => setTimeout(done, 20));
    expect(queryClient.getQueryData(['private', 'slow-read'])).toBeUndefined();
  });

  it('sign-out: everything cached for the session is gone at once', async () => {
    seedSnapshot();
    mockServer.use(okHires(), okUser());
    const user = userEvent.setup();
    const { queryClient } = mount('/job/1');
    await screen.findByRole('button', { name: NAME });
    const previous = seedPreviousSession(queryClient);

    await user.click(screen.getByRole('button', { name: 'probe-sign-out' }));
    expect(await screen.findByRole('link', { name: 'Đăng nhập' })).toBeTruthy();
    expectNothingFromBefore(queryClient);

    previous.slow.resolve('late data after sign-out');
    await previous.inFlight;
    await new Promise((done) => setTimeout(done, 20));
    expect(queryClient.getQueryData(['private', 'slow-read'])).toBeUndefined();
  });

  it('sign-out during a restore also clears the caches', async () => {
    seedSnapshot();
    const gate = deferred();
    mockServer.use(
      http.get(PATHS.myHires, async () => {
        await gate.promise;
        return HttpResponse.json({ statusCode: 200, content: [] });
      }),
      okUser(),
    );
    const { queryClient } = mount('/job/1');
    seedPreviousSession(queryClient);
    await userEvent.setup().click(screen.getByRole('button', { name: 'probe-sign-out' }));
    expectNothingFromBefore(queryClient);
    gate.resolve();
  });

  it('no query key, mutation variable, DOM text or storage value carries the token or the password', async () => {
    mockServer.use(http.post(PATHS.signin, () => HttpResponse.json(signinBody())));
    const user = userEvent.setup();
    const { queryClient } = mount('/login?returnTo=%2Fjob%2F7');
    await enter(user, await screen.findByLabelText('Email'), EMAIL);
    await enter(user, screen.getByLabelText('Mật khẩu'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    await screen.findByRole('button', { name: NAME });

    const cached = everyKeyAndVariable(queryClient);
    expect(cached).not.toContain(USER_TOKEN);
    expect(cached).not.toContain(PASSWORD);
    expect(cached).not.toContain(SYNTHETIC_PASSWORD_FIELD);

    const html = document.documentElement.outerHTML;
    expect(html).not.toContain(USER_TOKEN);
    expect(html).not.toContain(PASSWORD);
    expect(html).not.toContain(SYNTHETIC_PASSWORD_FIELD);

    // The token lives only in the sessionStorage snapshot, never in localStorage.
    expect(window.localStorage.getItem('servio-session')).toBeNull();
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index) ?? '';
      expect(window.localStorage.getItem(key)).not.toContain(USER_TOKEN);
    }
  });

  it('a restored session is not seeded into the query cache (TASK-018/023 own those keys)', async () => {
    seedSnapshot();
    mockServer.use(okHires([{ id: 1 }]), okUser());
    const { queryClient } = mount('/job/1');
    await screen.findByRole('button', { name: NAME });
    for (const query of queryClient.getQueryCache().getAll()) {
      expect(query.state.data).toBeUndefined();
    }
    expect(everyKeyAndVariable(queryClient)).not.toContain(USER_TOKEN);
  });
});
