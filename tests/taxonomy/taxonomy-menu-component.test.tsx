import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { createHttpClient } from '../../src/infrastructure/http/create-http-client';
import { CategoryStrip } from '../../src/features/discovery/components/CategoryStrip';
import { GroupStrip } from '../../src/features/discovery/components/GroupStrip';
import { mockServer } from '../support/server';
import { renderBootstrap } from '../support/render';

const origin = 'https://taxonomy-component.invalid';
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

function respondWith(body: JsonBodyType) {
  mockServer.use(http.get(`${origin}${PATH}`, () => HttpResponse.json(body)));
}

describe('taxonomy-driven Home strips', () => {
  it('shows a skeleton while loading, then the categories on success', async () => {
    respondWith({
      content: [{ id: 1, tenLoaiCongViec: 'Graphics & Design', dsNhomChiTietLoai: [] }],
    });
    renderBootstrap(<CategoryStrip />);
    await waitFor(() => screen.getByText('Graphics & Design'));
  });

  it('renders an empty group honestly instead of hiding it', async () => {
    respondWith({
      content: [
        {
          id: 1,
          tenLoaiCongViec: 'Top',
          dsNhomChiTietLoai: [
            { id: 1, tenNhom: 'Empty Group', hinhAnh: '', maLoaiCongviec: 1, dsChiTietLoai: [] },
          ],
        },
      ],
    });
    renderBootstrap(<GroupStrip />);
    await waitFor(() => screen.getByText('Empty Group'));
    expect(screen.getByText('Chưa có loại chi tiết')).toBeTruthy();
  });

  it('renders nothing (not an empty box) when there are zero top categories', async () => {
    respondWith({ content: [] });
    const { container } = renderBootstrap(<CategoryStrip />);
    await waitFor(() => expect(screen.queryByText('Danh mục công việc')).toBeNull());
    expect(container.textContent).toBe('');
  });

  it('shows an inline error with retry, and recovers after a successful retry', async () => {
    respondWith({ content: null });
    renderBootstrap(<CategoryStrip />);
    await waitFor(() => screen.getByRole('alert'));
    respondWith({ content: [{ id: 1, tenLoaiCongViec: 'Recovered', dsNhomChiTietLoai: [] }] });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => screen.getByText('Recovered'));
  });
});
