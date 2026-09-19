import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useLocation, useNavigationType } from 'react-router';
import { BootstrapApp } from '../../src/app/bootstrap/BootstrapApp';
import { mockServer } from '../support/server';
import { renderBootstrap } from '../support/render';
import {
  API_ORIGIN,
  PATHS,
  USER_ID,
  deferred,
  enter,
  okHires,
  okUser,
  readSnapshotRaw,
  recordRequests,
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

function LocationProbe() {
  const location = useLocation();
  const type = useNavigationType();
  return (
    <output data-testid="location" data-type={type}>
      {`${location.pathname}${location.search}`}
    </output>
  );
}

function mount(path: string) {
  return renderBootstrap(
    <>
      <BootstrapApp />
      <LocationProbe />
    </>,
    path,
  );
}

const location = () => screen.getByTestId('location');

async function signIn(user: ReturnType<typeof userEvent.setup>) {
  await enter(user, await screen.findByLabelText('Email'), EMAIL);
  await enter(user, screen.getByLabelText('Mật khẩu'), PASSWORD);
  await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
}

function serveSignin() {
  mockServer.use(http.post(PATHS.signin, () => HttpResponse.json(signinBody())));
}

// The taxonomy menu is only read when a page needs it; `/` renders the home strips.
function serveEmptyTaxonomy() {
  mockServer.use(
    http.get(`${API_ORIGIN}/api/cong-viec/lay-menu-loai-cong-viec`, () =>
      HttpResponse.json({ statusCode: 200, content: [] }),
    ),
  );
}

describe('TASK-013 /login — S-06 inside PublicLayout', () => {
  it('renders the page body S-06 inside the existing public chrome: header, main and footer', () => {
    mount('/login');
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('contentinfo')).toBeTruthy();
    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { level: 1, name: 'Đăng nhập' })).toBeTruthy();
    expect(within(main).getByLabelText('Email')).toBeTruthy();
    expect(within(main).getByLabelText('Mật khẩu')).toBeTruthy();
    expect(within(main).getByRole('button', { name: 'Đăng nhập' })).toBeTruthy();
    expect(
      within(main).getByText('Chưa hỗ trợ đăng nhập bằng mạng xã hội hoặc khôi phục mật khẩu.'),
    ).toBeTruthy();
    // No register link in the page body yet (TASK-015 adds it with the route).
    expect(within(main).queryByRole('link')).toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('moves focus to the page h1 on arrival (A4)', () => {
    mount('/login');
    const heading = screen.getByRole('heading', { level: 1, name: 'Đăng nhập' });
    expect(document.activeElement).toBe(heading);
  });

  it('shows the pending status and no form while the session is restoring', async () => {
    seedSnapshot();
    const gate = deferred();
    mockServer.use(
      http.get(PATHS.myHires, async () => {
        await gate.promise;
        return HttpResponse.json({ statusCode: 200, content: [] });
      }),
      okUser(),
    );
    mount('/login?returnTo=/job/7');
    expect(await screen.findByText('Đang khôi phục phiên đăng nhập…')).toBeTruthy();
    expect(screen.queryByLabelText('Email')).toBeNull();
    expect(location().textContent).toBe('/login?returnTo=/job/7');
    gate.resolve();
    await waitFor(() => expect(location().textContent).toBe('/job/7'));
  });
});

describe('TASK-013 T11 sign-in navigation', () => {
  it('returns (replace) to the sanitised returnTo and sends no request other than E02', async () => {
    serveSignin();
    const requests = recordRequests();
    const user = userEvent.setup();
    mount('/login?returnTo=%2Fjob%2F7');
    await signIn(user);

    await waitFor(() => expect(location().textContent).toBe('/job/7'));
    expect(location().getAttribute('data-type')).toBe('REPLACE');
    expect(await screen.findByRole('button', { name: NAME })).toBeTruthy();
    // Nothing is re-run after sign-in: no E50, no E39, no gated action.
    await new Promise((done) => setTimeout(done, 40));
    expect(requests.map((request) => request.url)).toEqual([PATHS.signin]);
  });

  it.each([
    '//evil.example',
    '/\\evil.example',
    'https://evil.example',
    'javascript:alert(1)',
    '/login',
    '/register',
    '',
  ])('a forged returnTo (%s) falls back to /', async (forged) => {
    serveSignin();
    serveEmptyTaxonomy();
    const user = userEvent.setup();
    mount(`/login?returnTo=${encodeURIComponent(forged)}`);
    await signIn(user);
    await waitFor(() => expect(location().textContent).toBe('/'));
    expect(location().getAttribute('data-type')).toBe('REPLACE');
    expect(await screen.findByRole('button', { name: NAME })).toBeTruthy();
  });

  it('defaults to / when there is no returnTo', async () => {
    serveSignin();
    serveEmptyTaxonomy();
    const user = userEvent.setup();
    mount('/login');
    await signIn(user);
    await waitFor(() => expect(location().textContent).toBe('/'));
  });

  it('redirects an authenticated visitor (replace) to the sanitised target', async () => {
    seedSnapshot();
    mockServer.use(okHires(), okUser());
    mount('/login?returnTo=%2Fjob%2F9');
    await waitFor(() => expect(location().textContent).toBe('/job/9'));
    expect(location().getAttribute('data-type')).toBe('REPLACE');
  });

  it('an authenticated visitor with a forged returnTo is sent to /', async () => {
    seedSnapshot();
    serveEmptyTaxonomy();
    mockServer.use(okHires(), okUser());
    mount(`/login?returnTo=${encodeURIComponent('//evil.example')}`);
    await waitFor(() => expect(location().textContent).toBe('/'));
  });

  it('with a session that cannot be saved: shows "Đã đăng nhập." + the storage notice + "Tiếp tục" first', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    serveSignin();
    const requests = recordRequests();
    const user = userEvent.setup();
    mount('/login?returnTo=%2Fjob%2F7');
    await signIn(user);

    expect(await screen.findByText('Đã đăng nhập.')).toBeTruthy();
    expect(
      screen.getByText(
        'Trình duyệt không cho lưu phiên đăng nhập. Phiên chỉ giữ đến khi bạn tải lại hoặc đóng trang.',
      ),
    ).toBeTruthy();
    // No automatic navigation: the visitor continues on purpose.
    expect(location().textContent).toBe('/login?returnTo=%2Fjob%2F7');
    expect(await screen.findByRole('button', { name: NAME })).toBeTruthy();
    expect(readSnapshotRaw()).toBeNull();

    await user.click(screen.getByRole('link', { name: 'Tiếp tục' }));
    expect(location().textContent).toBe('/job/7');
    expect(requests.map((request) => request.url)).toEqual([PATHS.signin]);
  });

  it('a saved session writes exactly the minimal snapshot', async () => {
    serveSignin();
    const user = userEvent.setup();
    mount('/login?returnTo=%2Fjob%2F7');
    await signIn(user);
    await waitFor(() => expect(location().textContent).toBe('/job/7'));
    const stored = JSON.parse(readSnapshotRaw() ?? '{}');
    expect(Object.keys(stored).sort()).toEqual(['role', 'token', 'userId', 'v']);
    expect(stored.userId).toBe(USER_ID);
    expect(readSnapshotRaw()).not.toContain(PASSWORD);
  });
});
