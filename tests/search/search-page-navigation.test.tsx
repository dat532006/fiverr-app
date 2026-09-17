import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { createHttpClient } from '../../src/infrastructure/http/create-http-client';
import { BootstrapProviders } from '../../src/app/bootstrap/BootstrapProviders';
import { createBootstrapQueryClient } from '../../src/app/bootstrap/query-client';
import { SearchPage } from '../../src/features/search/pages/SearchPage';
import { mockServer } from '../support/server';

const origin = 'https://search-navigation.invalid';
const synthetic = {
  VITE_APP_ENV: 'development',
  VITE_API_BASE_URL: origin,
  VITE_CYBERSOFT_TOKEN: 'synthetic-token',
};
const PATH_PREFIX = '/api/cong-viec/lay-danh-sach-cong-viec-theo-ten/';
const testClient = createHttpClient(synthetic, [origin]);

vi.mock('../../src/infrastructure/http/client', () => ({
  getHttpClient: () => testClient,
}));

function job(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    tenCongViec: 'Job',
    danhGia: 0,
    giaTien: 0,
    nguoiTao: 1,
    hinhAnh: '',
    moTa: '',
    maChiTietLoaiCongViec: 1,
    moTaNgan: '',
    saoCongViec: 0,
    ...overrides,
  };
}

// Confirmed live E28 content[] shape: a ViewModel wrapper around `congViec`.
function wrapperItem(overrides: Partial<Record<string, unknown>> = {}) {
  return { congViec: job(overrides) };
}

function respondWith(term: string, body: JsonBodyType) {
  mockServer.use(
    http.get(`${origin}${PATH_PREFIX}${encodeURIComponent(term)}`, () => HttpResponse.json(body)),
  );
}

function LocationDisplay() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderAtRoot(initialPath: string) {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <>
            <SearchPage />
            <LocationDisplay />
          </>
        ),
      },
    ],
    { initialEntries: [initialPath] },
  );
  const queryClient = createBootstrapQueryClient();
  render(
    <BootstrapProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </BootstrapProviders>,
  );
  return { router };
}

describe('SearchPage — browser back/forward (AC02)', () => {
  it('restores the correct submitted query and result state on back navigation', async () => {
    respondWith('a', { statusCode: 200, content: [wrapperItem({ id: 1, tenCongViec: 'Job A' })] });
    respondWith('b', { statusCode: 200, content: [wrapperItem({ id: 2, tenCongViec: 'Job B' })] });
    const { router } = renderAtRoot('/search');
    const user = userEvent.setup();

    await user.type(screen.getByRole('searchbox'), 'a');
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/search?q=a'));
    await waitFor(() => screen.getByText('Job A'));

    const inputAfterA = screen.getByRole('searchbox');
    await user.clear(inputAfterA);
    await user.type(inputAfterA, 'b');
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/search?q=b'));
    await waitFor(() => screen.getByText('Job B'));

    act(() => {
      router.navigate(-1);
    });
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/search?q=a'));
    await waitFor(() => screen.getByText('Job A'));
    expect(screen.queryByText('Job B')).toBeNull();
    expect(screen.getByRole('searchbox').getAttribute('value')).toBe('a');
  });
});
