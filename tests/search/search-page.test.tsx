import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { useLocation } from 'react-router';
import { createHttpClient } from '../../src/infrastructure/http/create-http-client';
import { SearchPage } from '../../src/features/search/pages/SearchPage';
import { mockServer } from '../support/server';
import { renderBootstrap } from '../support/render';

const origin = 'https://search-page.invalid';
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
    giaTien: 100000,
    nguoiTao: 1,
    hinhAnh: '',
    moTa: '',
    maChiTietLoaiCongViec: 999,
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

function Harness() {
  return (
    <>
      <SearchPage />
      <LocationDisplay />
    </>
  );
}

describe('SearchPage — URL/query ownership (AC01)', () => {
  it('puts the submitted query in the URL and renders results through JobCard', async () => {
    respondWith('logo', {
      statusCode: 200,
      content: [wrapperItem({ id: 42, tenCongViec: 'Thiết kế logo' })],
    });
    renderBootstrap(<Harness />, '/search');
    const user = userEvent.setup();
    await user.type(screen.getByRole('searchbox'), 'logo');
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/search?q=logo'));
    await waitFor(() => screen.getByText('Thiết kế logo'));
    expect(screen.getByRole('link', { name: /Thiết kế logo/ }).getAttribute('href')).toBe(
      '/job/42',
    );
  });

  it('encodes Unicode and reserved characters in the submitted query exactly once', async () => {
    respondWith('thiết kế? #1/2', { statusCode: 200, content: [] });
    renderBootstrap(<Harness />, '/search');
    const user = userEvent.setup();
    await user.type(screen.getByRole('searchbox'), 'thiết kế? #1/2');
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    await waitFor(() => screen.getByText(/Không tìm thấy dịch vụ/));
    const location = screen.getByTestId('location').textContent ?? '';
    const [, search] = location.split('?');
    expect(new URLSearchParams(search).get('q')).toBe('thiết kế? #1/2');
  });

  it('issues zero requests for an empty submitted query', async () => {
    let requestCount = 0;
    mockServer.use(
      http.get(`${origin}${PATH_PREFIX}:term`, () => {
        requestCount += 1;
        return HttpResponse.json({ statusCode: 200, content: [] });
      }),
    );
    renderBootstrap(<Harness />, '/search');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/search'));
    expect(requestCount).toBe(0);
  });

  it('issues zero requests when landing directly on a blank submitted query (?q=%20)', async () => {
    let requestCount = 0;
    mockServer.use(
      http.get(`${origin}${PATH_PREFIX}:term`, () => {
        requestCount += 1;
        return HttpResponse.json({ statusCode: 200, content: [] });
      }),
    );
    renderBootstrap(<Harness />, '/search?q=%20');
    await screen.findByText('Nhập từ khóa để tìm dịch vụ.');
    expect(requestCount).toBe(0);
  });
});

describe('SearchPage — race safety (AC02 / T18)', () => {
  it('never renders slow query A rows after fast query B resolves', async () => {
    let resolveA!: (body: JsonBodyType) => void;
    let resolveB!: (body: JsonBodyType) => void;
    const gateA = new Promise<JsonBodyType>((resolve) => {
      resolveA = resolve;
    });
    const gateB = new Promise<JsonBodyType>((resolve) => {
      resolveB = resolve;
    });
    mockServer.use(
      http.get(`${origin}${PATH_PREFIX}a`, async () => HttpResponse.json(await gateA)),
      http.get(`${origin}${PATH_PREFIX}b`, async () => HttpResponse.json(await gateB)),
    );
    renderBootstrap(<Harness />, '/search');
    const user = userEvent.setup();
    const input = screen.getByRole('searchbox');

    await user.type(input, 'a');
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/search?q=a'));

    const inputAfterA = screen.getByRole('searchbox');
    await user.clear(inputAfterA);
    await user.type(inputAfterA, 'b');
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/search?q=b'));

    // B (the current query) resolves first.
    resolveB({ statusCode: 200, content: [wrapperItem({ id: 2, tenCongViec: 'Job B' })] });
    await waitFor(() => screen.getByText('Job B'));

    // A resolves late, after B is already showing — it must never appear.
    resolveA({ statusCode: 200, content: [wrapperItem({ id: 1, tenCongViec: 'Job A' })] });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByText('Job A')).toBeNull();
    expect(screen.getByText('Job B')).toBeTruthy();
  });
});

describe('SearchPage — UI states', () => {
  it('shows the initial prompt with no submitted query', () => {
    renderBootstrap(<Harness />, '/search');
    expect(screen.getByText('Nhập từ khóa để tìm dịch vụ.')).toBeTruthy();
  });

  it('shows an empty state honestly, not the generic error copy', async () => {
    respondWith('nothing', { statusCode: 200, content: [] });
    renderBootstrap(<Harness />, '/search?q=nothing');
    await waitFor(() => screen.getByText(/Không tìm thấy dịch vụ phù hợp với "nothing"/));
  });

  it('shows an inline error with retry, and recovers after a successful retry', async () => {
    respondWith('logo', { statusCode: 500 });
    renderBootstrap(<Harness />, '/search?q=logo');
    await waitFor(() => screen.getByRole('alert'));
    respondWith('logo', {
      statusCode: 200,
      content: [wrapperItem({ id: 5, tenCongViec: 'Recovered' })],
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => screen.getByText('Recovered'));
  });

  it('renders an unavailable-data state for a public 403, not the generic load-failure copy', async () => {
    mockServer.use(
      http.get(`${origin}${PATH_PREFIX}logo`, () =>
        HttpResponse.json({ statusCode: 403 }, { status: 403 }),
      ),
    );
    renderBootstrap(<Harness />, '/search?q=logo');
    await waitFor(() => screen.getByRole('alert'));
    expect(screen.getByText('Kết quả tìm kiếm hiện không truy cập được.')).toBeTruthy();
    expect(screen.queryByText('Không tải được kết quả tìm kiếm.')).toBeNull();
  });
});

describe('SearchPage — keyboard interaction (T23)', () => {
  it('submits via Enter from the search input and keeps focus usable', async () => {
    respondWith('logo', { statusCode: 200, content: [wrapperItem({ id: 1, tenCongViec: 'Job' })] });
    renderBootstrap(<Harness />, '/search');
    const user = userEvent.setup();
    await user.tab();
    const input = screen.getByRole('searchbox');
    expect(document.activeElement).toBe(input);
    await user.type(input, 'logo{Enter}');
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/search?q=logo'));
    await waitFor(() => screen.getByText('Job'));
  });

  it('accepts long Vietnamese search text without truncating the submitted query', async () => {
    const longTerm = 'dịch vụ thiết kế đồ họa chuyên nghiệp cho doanh nghiệp vừa và nhỏ';
    respondWith(longTerm, { statusCode: 200, content: [] });
    renderBootstrap(<Harness />, '/search');
    const user = userEvent.setup();
    await user.type(screen.getByRole('searchbox'), longTerm);
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    const location = screen.getByTestId('location').textContent ?? '';
    const [, search] = location.split('?');
    expect(new URLSearchParams(search).get('q')).toBe(longTerm);
  });
});
