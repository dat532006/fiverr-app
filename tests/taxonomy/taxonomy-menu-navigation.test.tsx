import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useLocation } from 'react-router';
import { createHttpClient } from '../../src/infrastructure/http/create-http-client';
import { TaxonomyMenu } from '../../src/features/taxonomy/public';
import { mockServer } from '../support/server';
import { renderBootstrap } from '../support/render';

const origin = 'https://taxonomy-nav.invalid';
const synthetic = {
  VITE_APP_ENV: 'development',
  VITE_API_BASE_URL: origin,
  VITE_CYBERSOFT_TOKEN: 'synthetic-token',
};
const PATH = '/api/cong-viec/lay-menu-loai-cong-viec';
const testClient = createHttpClient(synthetic, [origin]);

vi.mock('../../src/infrastructure/http/client', () => ({
  getHttpClient: () => testClient,
}));

function LocationDisplay() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function Harness() {
  return (
    <>
      <TaxonomyMenu />
      <LocationDisplay />
    </>
  );
}

function seedMenu() {
  mockServer.use(
    http.get(`${origin}${PATH}`, () =>
      HttpResponse.json({
        content: [
          {
            id: 900002,
            tenLoaiCongViec: 'Graphics & Design',
            dsNhomChiTietLoai: [
              {
                id: 1,
                tenNhom: 'Logo & Brand Identity',
                hinhAnh: '',
                maLoaiCongviec: 900002,
                dsChiTietLoai: [{ id: 900003, tenChiTiet: 'Logo Design' }],
              },
            ],
          },
        ],
      }),
    ),
  );
}

describe('TaxonomyMenu interaction', () => {
  it('opens via click and navigates to the exact typed detail-category route', async () => {
    seedMenu();
    renderBootstrap(<Harness />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Danh mục/ }));
    const desktopPanel = await screen.findByTestId('taxonomy-menu-desktop');
    const link = within(desktopPanel).getByRole('link', { name: 'Logo Design' });
    await user.click(link);
    expect(screen.getByTestId('location').textContent).toBe(
      '/category/900002/group/1/detail/900003',
    );
  });

  it('shows an unavailable-data state for a public 403 without navigating away (no login redirect)', async () => {
    mockServer.use(
      http.get(`${origin}${PATH}`, () => HttpResponse.json({ statusCode: 403 }, { status: 403 })),
    );
    renderBootstrap(<Harness />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Danh mục/ }));
    await waitFor(() => screen.getByRole('alert'));
    expect(screen.getByText('Danh mục hiện không truy cập được.')).toBeTruthy();
    expect(screen.getByTestId('location').textContent).toBe('/');
  });

  it('opens via keyboard (Tab + Enter) and closes on Escape, returning focus to the trigger', async () => {
    seedMenu();
    renderBootstrap(<Harness />);
    const user = userEvent.setup();
    await user.tab();
    const trigger = screen.getByRole('button', { name: /Danh mục/ });
    expect(document.activeElement).toBe(trigger);
    await user.keyboard('{Enter}');
    await waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('true'));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'));
    expect(document.activeElement).toBe(trigger);
  });
});
