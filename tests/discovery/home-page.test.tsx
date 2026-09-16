import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { createHttpClient } from '../../src/infrastructure/http/create-http-client';
import { HomePage } from '../../src/features/discovery/pages/HomePage';
import { mockServer } from '../support/server';
import { renderBootstrap } from '../support/render';

const origin = 'https://home-page.invalid';
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

describe('HomePage', () => {
  it('renders static regions immediately, before the taxonomy fetch settles', () => {
    mockServer.use(
      http.get(`${origin}${PATH}`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({ content: [] });
      }),
    );
    renderBootstrap(<HomePage />);
    expect(
      screen.getByRole('heading', { name: 'Thuê người làm được việc, cho đúng việc bạn cần' }),
    ).toBeTruthy();
    expect(screen.getByText('Tìm kiếm theo tên dịch vụ')).toBeTruthy();
  });

  it('shows category/group data once the taxonomy fetch resolves', async () => {
    mockServer.use(
      http.get(`${origin}${PATH}`, () =>
        HttpResponse.json({
          content: [
            {
              id: 1,
              tenLoaiCongViec: 'Graphics & Design',
              dsNhomChiTietLoai: [
                {
                  id: 1,
                  tenNhom: 'Logo & Brand Identity',
                  hinhAnh: '',
                  maLoaiCongviec: 1,
                  dsChiTietLoai: [],
                },
              ],
            },
          ],
        }),
      ),
    );
    renderBootstrap(<HomePage />);
    await waitFor(() => screen.getByText('Graphics & Design'));
    await waitFor(() => screen.getByText('Logo & Brand Identity'));
  });
});
