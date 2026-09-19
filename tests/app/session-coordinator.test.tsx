import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { BootstrapApp } from '../../src/app/bootstrap/BootstrapApp';
import { BootstrapProviders } from '../../src/app/bootstrap/BootstrapProviders';
import { createBootstrapQueryClient } from '../../src/app/bootstrap/query-client';
import { useSessionCommands } from '../../src/features/auth/public';
import { mockServer } from '../support/server';
import { renderBootstrap } from '../support/render';
import {
  PATHS,
  SHARED_TOKEN,
  USER_ID,
  USER_TOKEN,
  deferred,
  makeToken,
  okHires,
  okUser,
  readSnapshotRaw,
  recordRequests,
  seedSnapshot,
  stopRecordingRequests,
  userRecord,
} from '../support/session-kit';

vi.mock('../../src/infrastructure/http/client', async () => {
  const kit = await import('../support/session-kit');
  return { getHttpClient: () => kit.currentTestClient() };
});

vi.setConfig({ testTimeout: 20_000 });

afterEach(() => stopRecordingRequests());

const NAME = 'Người Dùng Thử';
// A route that fetches nothing, so only the session requests are observable.
const QUIET_PATH = '/job/1';

function SignOutProbe() {
  const { signOut } = useSessionCommands();
  return (
    <button type="button" onClick={signOut}>
      probe-sign-out
    </button>
  );
}

function mount(path = QUIET_PATH) {
  return renderBootstrap(
    <>
      <BootstrapApp />
      <SignOutProbe />
    </>,
    path,
  );
}

const hits = (requests: ReturnType<typeof recordRequests>, url: string) =>
  requests.filter((request) => request.url === url);

const accountButton = () => screen.findByRole('button', { name: NAME });
const guestSignIn = () => screen.findByRole('link', { name: 'Đăng nhập' });

async function flush() {
  // Let any in-flight promise chain settle before asserting that nothing else happened.
  await new Promise((done) => setTimeout(done, 30));
}

describe('TASK-013 T10 restore — the DATA FLOW table', () => {
  it('no snapshot → anonymous with ZERO requests', async () => {
    const requests = recordRequests();
    mount();
    expect(await guestSignIn()).toBeTruthy();
    await flush();
    expect(requests).toHaveLength(0);
  });

  it('the first render is already settled for guests: no restoring placeholder ever shows', () => {
    mount();
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toBeTruthy();
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('a valid snapshot → E50 admission, THEN E39, then authenticated', async () => {
    seedSnapshot();
    const requests = recordRequests();
    const gate = deferred();
    mockServer.use(
      http.get(PATHS.myHires, async () => {
        await gate.promise;
        return HttpResponse.json({ statusCode: 200, content: [] });
      }),
      okUser(),
    );
    mount();

    // While E50 is pending: neutral placeholder, no links, no account control, no E39 yet.
    const placeholder = await screen.findByRole('status', {
      name: 'Đang tải trạng thái tài khoản',
    });
    expect(placeholder.getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByRole('link', { name: 'Đăng nhập' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Đăng ký' })).toBeNull();
    expect(screen.queryByRole('button', { name: NAME })).toBeNull();
    await flush();
    expect(hits(requests, PATHS.user(USER_ID))).toHaveLength(0);

    gate.resolve();
    expect(await accountButton()).toBeTruthy();
    expect(requests.map((request) => request.url)).toEqual([PATHS.myHires, PATHS.user(USER_ID)]);
    expect(readSnapshotRaw()).not.toBeNull();
  });

  it('T08: E50 and E39 carry the same captured token; the E39 path id is the snapshot user; no Authorization', async () => {
    seedSnapshot();
    const requests = recordRequests();
    mockServer.use(okHires(), okUser());
    mount();
    await accountButton();
    expect(requests).toHaveLength(2);
    for (const request of requests) {
      expect(request.headers.get('token')).toBe(USER_TOKEN);
      expect(request.headers.get('tokenCybersoft')).toBe(SHARED_TOKEN);
      expect(request.headers.has('authorization')).toBe(false);
    }
    expect(requests[1]?.url).toBe(`${PATHS.user(USER_ID)}`);
  });

  it('E50 401 → snapshot deleted and expired; E39 is never called', async () => {
    seedSnapshot();
    const requests = recordRequests();
    mockServer.use(
      http.get(PATHS.myHires, () => new HttpResponse(null, { status: 401 })),
      okUser(),
    );
    mount('/login');
    expect(
      await screen.findByText('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'),
    ).toBeTruthy();
    expect(readSnapshotRaw()).toBeNull();
    expect(hits(requests, PATHS.user(USER_ID))).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Đăng ký' })).toBeTruthy();
  });

  describe.each([
    ['a 403', () => new HttpResponse(null, { status: 403 })],
    ['a 400', () => new HttpResponse(null, { status: 400 })],
    ['a 5xx', () => new HttpResponse(null, { status: 503 })],
    ['a network failure', () => HttpResponse.error()],
    ['a string content on a 200', () => HttpResponse.json({ statusCode: 200, content: 'oops' })],
    ['the E46 paging object on a 200', () => HttpResponse.json({ content: { data: [] } })],
  ])('E50 answers %s', (_label, respond) => {
    it('→ restore-unavailable with the snapshot KEPT; E39 is never called', async () => {
      seedSnapshot();
      const requests = recordRequests();
      mockServer.use(http.get(PATHS.myHires, respond), okUser());
      mount('/login');
      expect(
        await screen.findByText(
          'Chưa khôi phục được phiên đăng nhập. Bạn có thể thử lại hoặc đăng nhập lại.',
        ),
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy();
      expect(readSnapshotRaw()).not.toBeNull();
      // Guest links while unavailable; the form stays usable ("đăng nhập lại").
      expect(screen.getAllByRole('link', { name: 'Đăng nhập' }).length).toBeGreaterThan(0);
      expect(screen.getByLabelText('Email')).toBeTruthy();
      expect(hits(requests, PATHS.user(USER_ID))).toHaveLength(0);
    });
  });

  it('"Thử lại" runs the same admission again and can then authenticate', async () => {
    seedSnapshot();
    const requests = recordRequests();
    mockServer.use(
      http.get(PATHS.myHires, () => new HttpResponse(null, { status: 403 })),
      okUser(),
    );
    mount('/login?returnTo=/job/1');
    const retry = await screen.findByRole('button', { name: 'Thử lại' });
    expect(hits(requests, PATHS.myHires)).toHaveLength(1);

    mockServer.use(okHires());
    await userEvent.setup().click(retry);
    expect(await accountButton()).toBeTruthy();
    expect(hits(requests, PATHS.myHires)).toHaveLength(2);
    expect(hits(requests, PATHS.user(USER_ID))).toHaveLength(1);
  });

  it('while a retry is in flight the sign-in form is replaced by the pending status', async () => {
    seedSnapshot();
    mockServer.use(http.get(PATHS.myHires, () => new HttpResponse(null, { status: 403 })));
    mount('/login');
    const retry = await screen.findByRole('button', { name: 'Thử lại' });
    const gate = deferred();
    mockServer.use(
      http.get(PATHS.myHires, async () => {
        await gate.promise;
        return new HttpResponse(null, { status: 403 });
      }),
    );
    await userEvent.setup().click(retry);
    expect(await screen.findByText('Đang khôi phục phiên đăng nhập…')).toBeTruthy();
    expect(screen.queryByLabelText('Email')).toBeNull();
    gate.resolve();
    expect(await screen.findByRole('button', { name: 'Thử lại' })).toBeTruthy();
  });

  describe('E39 after an admitted E50', () => {
    it('401 → snapshot deleted and expired', async () => {
      seedSnapshot();
      mockServer.use(
        okHires(),
        http.get(PATHS.user(USER_ID), () => new HttpResponse(null, { status: 401 })),
      );
      mount('/login');
      expect(
        await screen.findByText('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'),
      ).toBeTruthy();
      expect(readSnapshotRaw()).toBeNull();
    });

    it.each([
      ['a 403', () => new HttpResponse(null, { status: 403 })],
      ['a 5xx', () => new HttpResponse(null, { status: 500 })],
      ['a network failure', () => HttpResponse.error()],
      ['a body that does not decode', () => HttpResponse.json({ content: 'oops' })],
    ])('%s → restore-unavailable, snapshot kept, never authenticated', async (_label, respond) => {
      seedSnapshot();
      mockServer.use(okHires(), http.get(PATHS.user(USER_ID), respond));
      mount('/login');
      expect(await screen.findByRole('button', { name: 'Thử lại' })).toBeTruthy();
      expect(readSnapshotRaw()).not.toBeNull();
      expect(screen.queryByRole('button', { name: NAME })).toBeNull();
    });

    it('E39 returning a different id → mismatch: deleted and anonymous (a success alone never authenticates)', async () => {
      seedSnapshot();
      mockServer.use(
        okHires(),
        http.get(PATHS.user(USER_ID), () =>
          HttpResponse.json({ statusCode: 200, content: userRecord({ id: USER_ID + 1 }) }),
        ),
      );
      mount('/login');
      expect(await screen.findByLabelText('Email')).toBeTruthy();
      await waitFor(() => expect(readSnapshotRaw()).toBeNull());
      expect(screen.queryByRole('button', { name: NAME })).toBeNull();
      expect(screen.queryByText('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')).toBeNull();
    });

    it('E39 returning a different role → mismatch: deleted and anonymous; the role is never raised', async () => {
      seedSnapshot({ role: 'USER' });
      mockServer.use(okHires(), okUser({ role: 'ADMIN' }));
      mount('/login');
      expect(await screen.findByLabelText('Email')).toBeTruthy();
      await waitFor(() => expect(readSnapshotRaw()).toBeNull());
      expect(screen.queryByRole('button', { name: NAME })).toBeNull();
    });

    it('a snapshot role of ADMIN authenticates only when E39 says ADMIN too', async () => {
      seedSnapshot({ role: 'ADMIN' });
      mockServer.use(okHires(), okUser({ role: 'ADMIN' }));
      mount();
      expect(await accountButton()).toBeTruthy();
    });
  });

  describe('snapshot rejected before any request', () => {
    it.each([
      ['malformed', () => window.sessionStorage.setItem('servio-session', '{not json')],
      ['an unknown schema version', () => seedSnapshot({ v: 2 })],
      ['carrying an extra key', () => seedSnapshot({ password: 'x' })],
      [
        'a token whose id claim differs from the stored user',
        () => seedSnapshot({ token: makeToken({ id: String(USER_ID + 5) }) }),
      ],
    ])('%s → deleted and anonymous with zero requests', async (_label, seed) => {
      seed();
      const requests = recordRequests();
      mount('/login');
      expect(await screen.findByLabelText('Email')).toBeTruthy();
      expect(readSnapshotRaw()).toBeNull();
      await flush();
      expect(requests).toHaveLength(0);
    });

    it('an exp hint that has passed → deleted and expired with zero requests', async () => {
      seedSnapshot({ exp: Math.floor(Date.now() / 1000) - 60 });
      const requests = recordRequests();
      mount('/login');
      expect(
        await screen.findByText('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'),
      ).toBeTruthy();
      expect(readSnapshotRaw()).toBeNull();
      expect(requests).toHaveLength(0);
    });

    it('sessionStorage that throws → anonymous, memory-only notice, zero requests', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError');
      });
      const requests = recordRequests();
      mount('/login');
      expect(
        await screen.findByText(
          'Trình duyệt không cho lưu phiên đăng nhập. Phiên chỉ giữ đến khi bạn tải lại hoặc đóng trang.',
        ),
      ).toBeTruthy();
      expect(screen.getByLabelText('Email')).toBeTruthy();
      expect(requests).toHaveLength(0);
    });
  });

  it('T22: a StrictMode render with a snapshot issues exactly one E50 and one E39', async () => {
    seedSnapshot();
    const requests = recordRequests();
    mockServer.use(okHires(), okUser());
    render(
      <StrictMode>
        <BootstrapProviders queryClient={createBootstrapQueryClient()}>
          <MemoryRouter initialEntries={[QUIET_PATH]}>
            <BootstrapApp />
          </MemoryRouter>
        </BootstrapProviders>
      </StrictMode>,
    );
    expect(await accountButton()).toBeTruthy();
    await flush();
    expect(hits(requests, PATHS.myHires)).toHaveLength(1);
    expect(hits(requests, PATHS.user(USER_ID))).toHaveLength(1);
    expect(requests).toHaveLength(2);
  });
});

describe('TASK-013 T09 late results never reach a newer session', () => {
  it('sign-out during the E50 read → nothing is published and E39 is never called', async () => {
    seedSnapshot();
    const requests = recordRequests();
    const gate = deferred();
    mockServer.use(
      http.get(PATHS.myHires, async () => {
        await gate.promise;
        return HttpResponse.json({ statusCode: 200, content: [] });
      }),
      okUser(),
    );
    mount();
    await screen.findByRole('status', { name: 'Đang tải trạng thái tài khoản' });

    await userEvent.setup().click(screen.getByRole('button', { name: 'probe-sign-out' }));
    // Signed out at once: guest links, snapshot gone.
    expect(await guestSignIn()).toBeTruthy();
    expect(readSnapshotRaw()).toBeNull();

    gate.resolve();
    await flush();
    expect(hits(requests, PATHS.user(USER_ID))).toHaveLength(0);
    expect(screen.queryByRole('button', { name: NAME })).toBeNull();
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toBeTruthy();
  });

  it('sign-out during the E39 read → the late E39 result is dropped', async () => {
    seedSnapshot();
    const gate = deferred();
    const started = deferred();
    mockServer.use(
      okHires(),
      http.get(PATHS.user(USER_ID), async () => {
        started.resolve();
        await gate.promise;
        return HttpResponse.json({ statusCode: 200, content: userRecord() });
      }),
    );
    mount();
    await started.promise;

    await userEvent.setup().click(screen.getByRole('button', { name: 'probe-sign-out' }));
    gate.resolve();
    await flush();
    expect(screen.queryByRole('button', { name: NAME })).toBeNull();
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toBeTruthy();
  });

  it('a late E50 401 after sign-out does not expire or delete anything of the new state', async () => {
    seedSnapshot();
    const gate = deferred();
    mockServer.use(
      http.get(PATHS.myHires, async () => {
        await gate.promise;
        return new HttpResponse(null, { status: 401 });
      }),
    );
    mount('/login');
    await screen.findByText('Đang khôi phục phiên đăng nhập…');
    await userEvent.setup().click(screen.getByRole('button', { name: 'probe-sign-out' }));
    // The anonymous form shows; a fresh snapshot written afterwards must survive the late 401.
    expect(await screen.findByLabelText('Email')).toBeTruthy();
    seedSnapshot({ userId: USER_ID + 1 });
    gate.resolve();
    await flush();
    expect(readSnapshotRaw()).not.toBeNull();
    expect(screen.queryByText('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')).toBeNull();
  });
});
