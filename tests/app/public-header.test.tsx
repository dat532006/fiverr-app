import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { BootstrapApp } from '../../src/app/bootstrap/BootstrapApp';
import { mockServer } from '../support/server';
import { renderBootstrap } from '../support/render';
import {
  API_ORIGIN,
  PATHS,
  deferred,
  okHires,
  okUser,
  readSnapshotRaw,
  recordRequests,
  seedSnapshot,
  stopRecordingRequests,
} from '../support/session-kit';

vi.mock('../../src/infrastructure/http/client', async () => {
  const kit = await import('../support/session-kit');
  return { getHttpClient: () => kit.currentTestClient() };
});

vi.setConfig({ testTimeout: 20_000 });

afterEach(() => stopRecordingRequests());

const NAME = 'Người Dùng Thử';
const header = () => screen.getByRole('banner');

async function mountAuthenticated(name = NAME, path = '/nowhere') {
  seedSnapshot();
  mockServer.use(okHires(), okUser({ name }));
  const view = renderBootstrap(<BootstrapApp />, path);
  const accountName = name.trim() ? name : 'Tài khoản';
  const button = await screen.findByRole('button', { name: accountName });
  return { ...view, button };
}

describe('TASK-013 AC05 PublicHeader — guest states', () => {
  it('anonymous: the guest links as built, with the current path as returnTo on "Đăng nhập"', () => {
    renderBootstrap(<BootstrapApp />, '/nowhere');
    const signIn = within(header()).getByRole('link', { name: 'Đăng nhập' });
    expect(signIn.getAttribute('href')).toBe('/login?returnTo=%2Fnowhere');
    expect(within(header()).getByRole('link', { name: 'Đăng ký' }).getAttribute('href')).toBe(
      '/register',
    );
    expect(within(header()).queryByRole('button', { name: NAME })).toBeNull();
  });

  it('keeps the search part of the current path in returnTo', () => {
    renderBootstrap(<BootstrapApp />, '/category/1?x=a b');
    expect(within(header()).getByRole('link', { name: 'Đăng nhập' }).getAttribute('href')).toBe(
      '/login?returnTo=%2Fcategory%2F1%3Fx%3Da%2520b',
    );
  });

  it('adds no returnTo on the home page, and none that points back at /login', async () => {
    mockServer.use(
      http.get(`${API_ORIGIN}/api/cong-viec/lay-menu-loai-cong-viec`, () =>
        HttpResponse.json({ statusCode: 200, content: [] }),
      ),
    );
    const home = renderBootstrap(<BootstrapApp />, '/');
    expect(within(header()).getByRole('link', { name: 'Đăng nhập' }).getAttribute('href')).toBe(
      '/login',
    );
    home.unmount();
    renderBootstrap(<BootstrapApp />, '/login');
    expect(within(header()).getByRole('link', { name: 'Đăng nhập' }).getAttribute('href')).toBe(
      '/login',
    );
  });

  it('expired shows the guest links', async () => {
    seedSnapshot({ exp: 1 });
    renderBootstrap(<BootstrapApp />, '/nowhere');
    expect(within(header()).getByRole('link', { name: 'Đăng nhập' })).toBeTruthy();
    expect(within(header()).getByRole('link', { name: 'Đăng ký' })).toBeTruthy();
  });

  it('restore-unavailable shows the guest links', async () => {
    seedSnapshot();
    mockServer.use(http.get(PATHS.myHires, () => new HttpResponse(null, { status: 403 })));
    renderBootstrap(<BootstrapApp />, '/nowhere');
    expect(await within(header()).findByRole('link', { name: 'Đăng nhập' })).toBeTruthy();
    expect(within(header()).getByRole('link', { name: 'Đăng ký' })).toBeTruthy();
  });

  it('restoring: a neutral aria-busy placeholder, no links and no account control', async () => {
    seedSnapshot();
    const gate = deferred();
    mockServer.use(
      http.get(PATHS.myHires, async () => {
        await gate.promise;
        return HttpResponse.json({ statusCode: 200, content: [] });
      }),
      okUser(),
    );
    renderBootstrap(<BootstrapApp />, '/nowhere');

    const placeholder = await within(header()).findByRole('status', {
      name: 'Đang tải trạng thái tài khoản',
    });
    expect(placeholder.getAttribute('aria-busy')).toBe('true');
    expect(within(header()).queryByRole('link', { name: 'Đăng nhập' })).toBeNull();
    expect(within(header()).queryByRole('link', { name: 'Đăng ký' })).toBeNull();
    expect(within(header()).queryByRole('button', { name: NAME })).toBeNull();
    expect(within(header()).queryByRole('button', { name: 'Tài khoản' })).toBeNull();
    // The rest of the header is untouched: brand, taxonomy menu and theme toggle stay.
    expect(within(header()).getByRole('link', { name: 'Servio.' })).toBeTruthy();
    expect(within(header()).getByRole('button', { name: /giao diện/ })).toBeTruthy();
    gate.resolve();
    await within(header()).findByRole('button', { name: NAME });
  });
});

describe('TASK-013 AC05 PublicHeader — authenticated account disclosure', () => {
  it('shows the display name on a button that discloses a panel with "Đăng xuất"', async () => {
    const { button } = await mountAuthenticated();
    expect(within(header()).queryByRole('link', { name: 'Đăng ký' })).toBeNull();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    const panelId = button.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    const panel = document.getElementById(panelId ?? '');
    expect(panel?.hidden).toBe(true);
    expect(screen.queryByRole('button', { name: 'Đăng xuất' })).toBeNull();

    await userEvent.setup().click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(panel?.hidden).toBe(false);
    expect(within(panel as HTMLElement).getByRole('button', { name: 'Đăng xuất' })).toBeTruthy();
  });

  it('is a disclosure, not an ARIA menu', async () => {
    const { button } = await mountAuthenticated();
    await userEvent.setup().click(button);
    expect(button.getAttribute('aria-haspopup')).toBeNull();
    expect(button.getAttribute('role')).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryByRole('menuitem')).toBeNull();
    expect(document.querySelector('[role="menu"], [role="menuitem"]')).toBeNull();
  });

  it('is operable by keyboard: Enter opens, Tab reaches "Đăng xuất", Escape closes and returns focus', async () => {
    const { button } = await mountAuthenticated();
    const user = userEvent.setup();
    button.focus();
    await user.keyboard('{Enter}');
    expect(button.getAttribute('aria-expanded')).toBe('true');

    await user.tab();
    const signOut = screen.getByRole('button', { name: 'Đăng xuất' });
    expect(document.activeElement).toBe(signOut);

    await user.keyboard('{Escape}');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
  });

  it('Space also toggles it', async () => {
    const { button } = await mountAuthenticated();
    const user = userEvent.setup();
    button.focus();
    await user.keyboard(' ');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    await user.keyboard(' ');
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Escape from the button itself and keeps focus there', async () => {
    const { button } = await mountAuthenticated();
    const user = userEvent.setup();
    await user.click(button);
    await user.keyboard('{Escape}');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
  });

  it('closes on an outside click on nothing, and focus returns to the button', async () => {
    const { button } = await mountAuthenticated();
    const user = userEvent.setup();
    await user.click(button);
    await user.click(document.body);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
  });

  it('an outside click on another control closes it without stealing that control’s focus', async () => {
    const { button } = await mountAuthenticated();
    const user = userEvent.setup();
    await user.click(button);
    const brand = within(header()).getByRole('link', { name: 'Servio.' });
    await user.click(brand);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).not.toBe(button);
  });

  it('closes when focus moves elsewhere', async () => {
    const { button } = await mountAuthenticated();
    const user = userEvent.setup();
    await user.click(button);
    within(header()).getByRole('link', { name: 'Servio.' }).focus();
    await waitFor(() => expect(button.getAttribute('aria-expanded')).toBe('false'));
  });

  it('a click on the button toggles it closed again', async () => {
    const { button } = await mountAuthenticated();
    const user = userEvent.setup();
    await user.click(button);
    await user.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it.each([
    ['an empty name', '', 'Tài khoản'],
    ['a blank name', '   ', 'Tài khoản'],
  ])('shows "Tài khoản" for %s', async (_label, name, shown) => {
    const { button } = await mountAuthenticated(name);
    expect(button.textContent).toContain(shown);
  });

  it('a very long Vietnamese name truncates visually while the full name stays the accessible name', async () => {
    const longName =
      'Nguyễn Thị Phương Thảo Trần Lê Hoàng Minh Khánh Vy Đặng Bảo Ngọc Quỳnh Anh Thiên Kim';
    const { button } = await mountAuthenticated(longName);
    expect(button.getAttribute('aria-label')).toBeNull();
    expect(screen.getByRole('button', { name: longName })).toBe(button);
    const label = button.querySelector('span');
    expect(label?.className).toContain('truncate');
    expect(label?.textContent).toBe(longName);
  });

  it('exposes the disclosure at touch-target height', async () => {
    const { button } = await mountAuthenticated();
    expect(button.className).toContain('min-h-11');
  });
});

describe('TASK-013 sign-out from the header', () => {
  it('shows the guest links at once, moves focus to "Đăng nhập", announces it, and sends nothing', async () => {
    const requests = recordRequests();
    const { button } = await mountAuthenticated();
    const sentBefore = requests.length;
    const user = userEvent.setup();
    await user.click(button);
    await user.click(screen.getByRole('button', { name: 'Đăng xuất' }));

    const signIn = within(header()).getByRole('link', { name: 'Đăng nhập' });
    expect(within(header()).getByRole('link', { name: 'Đăng ký' })).toBeTruthy();
    expect(within(header()).queryByRole('button', { name: NAME })).toBeNull();
    expect(document.activeElement).toBe(signIn);
    const announcement = within(header())
      .getAllByRole('status')
      .find((region) => region.textContent === 'Đã đăng xuất.');
    expect(announcement?.getAttribute('aria-live')).toBe('polite');
    expect(readSnapshotRaw()).toBeNull();
    await new Promise((done) => setTimeout(done, 40));
    expect(requests).toHaveLength(sentBefore);
  });
});
