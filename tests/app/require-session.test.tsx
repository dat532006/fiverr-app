import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation, useNavigationType } from 'react-router';
import { PublicLayout } from '../../src/app/layouts/PublicLayout';
import { LoginRoute } from '../../src/app/routes/LoginRoute';
import { RequireSession } from '../../src/app/routes/RequireSession';
import { mockServer } from '../support/server';
import { renderBootstrap } from '../support/render';
import {
  PATHS,
  USER_ID,
  deferred,
  enter,
  okHires,
  okUser,
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

function LocationProbe() {
  const location = useLocation();
  const type = useNavigationType();
  return (
    <output data-testid="location" data-type={type}>
      {`${location.pathname}${location.search}`}
    </output>
  );
}

// No route uses the guard yet; this harness stands in for a later private route.
function mount(path: string) {
  return renderBootstrap(
    <>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="login" element={<LoginRoute />} />
          <Route
            path="private"
            element={
              <RequireSession>
                <p>Nội dung riêng tư</p>
              </RequireSession>
            }
          />
        </Route>
      </Routes>
      <LocationProbe />
    </>,
    path,
  );
}

const location = () => screen.getByTestId('location');
const PRIVATE_TEXT = 'Nội dung riêng tư';

describe('TASK-013 T11 RequireSession', () => {
  it('waits while restoring: a pending status, no redirect, no children — then shows the children', async () => {
    seedSnapshot();
    const gate = deferred();
    mockServer.use(
      http.get(PATHS.myHires, async () => {
        await gate.promise;
        return HttpResponse.json({ statusCode: 200, content: [] });
      }),
      okUser(),
    );
    mount('/private?tab=1');

    const main = await screen.findByText('Đang khôi phục phiên đăng nhập…');
    expect(main.getAttribute('role')).toBe('status');
    expect(screen.queryByText(PRIVATE_TEXT)).toBeNull();
    expect(location().textContent).toBe('/private?tab=1');

    gate.resolve();
    expect(await screen.findByText(PRIVATE_TEXT)).toBeTruthy();
    expect(location().textContent).toBe('/private?tab=1');
  });

  it('sends a guest to /login?returnTo=<current path + search>, replacing the entry', async () => {
    mount('/private?tab=1');
    await waitFor(() =>
      expect(location().textContent).toBe('/login?returnTo=%2Fprivate%3Ftab%3D1'),
    );
    expect(location().getAttribute('data-type')).toBe('REPLACE');
    expect(screen.queryByText(PRIVATE_TEXT)).toBeNull();
    expect(screen.getByLabelText('Email')).toBeTruthy();
  });

  it('sends an expired session to login as well', async () => {
    seedSnapshot({ exp: 1 });
    mount('/private');
    await waitFor(() => expect(location().textContent).toBe('/login?returnTo=%2Fprivate'));
    expect(
      await screen.findByText('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'),
    ).toBeTruthy();
  });

  it('restore-unavailable: shows the restore notice with "Thử lại" and a sign-in link, no children, no redirect', async () => {
    seedSnapshot();
    mockServer.use(
      http.get(PATHS.myHires, () => new HttpResponse(null, { status: 403 })),
      okUser(),
    );
    mount('/private');

    expect(
      await screen.findByText(
        'Chưa khôi phục được phiên đăng nhập. Bạn có thể thử lại hoặc đăng nhập lại.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(PRIVATE_TEXT)).toBeNull();
    expect(location().textContent).toBe('/private');
    const signInLinks = screen
      .getAllByRole('link', { name: 'Đăng nhập' })
      .map((link) => link.getAttribute('href'));
    expect(signInLinks).toContain('/login?returnTo=%2Fprivate');

    mockServer.use(okHires());
    await userEvent.setup().click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText(PRIVATE_TEXT)).toBeTruthy();
  });

  it('renders the children for an authenticated session', async () => {
    seedSnapshot();
    mockServer.use(okHires(), okUser());
    mount('/private');
    expect(await screen.findByText(PRIVATE_TEXT)).toBeTruthy();
    expect(location().textContent).toBe('/private');
  });

  it('a guest who signs in from the redirect returns to the guarded page; nothing is auto-submitted', async () => {
    mockServer.use(http.post(PATHS.signin, () => HttpResponse.json(signinBody())));
    const requests = recordRequests();
    const user = userEvent.setup();
    mount('/private');
    await enter(user, await screen.findByLabelText('Email'), 'thu@example.invalid');
    await enter(user, screen.getByLabelText('Mật khẩu'), 'synthetic-typed-secret');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText(PRIVATE_TEXT)).toBeTruthy();
    expect(location().textContent).toBe('/private');
    await new Promise((done) => setTimeout(done, 40));
    expect(requests.map((request) => `${request.method} ${request.url}`)).toEqual([
      `POST ${PATHS.signin}`,
    ]);
    expect(USER_ID).toBeGreaterThan(0);
  });
});
