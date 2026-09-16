import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { createHttpClient } from '../../src/infrastructure/http/create-http-client';
import { fetchTaxonomyMenu } from '../../src/features/taxonomy/api/taxonomy-menu.endpoint';
import { TaxonomyDecodeError } from '../../src/features/taxonomy/api/taxonomy-menu.dto';
import { mockServer } from '../support/server';

const origin = 'https://taxonomy-endpoint.invalid';
const synthetic = {
  VITE_APP_ENV: 'development',
  VITE_API_BASE_URL: origin,
  VITE_CYBERSOFT_TOKEN: 'synthetic-token',
};
const PATH = '/api/cong-viec/lay-menu-loai-cong-viec';

function client() {
  return createHttpClient(synthetic, [origin]);
}

describe('fetchTaxonomyMenu', () => {
  it('resolves the decoded DTO list on success', async () => {
    mockServer.use(
      http.get(`${origin}${PATH}`, () =>
        HttpResponse.json({
          statusCode: 200,
          content: [{ id: 900002, tenLoaiCongViec: 'Graphics & Design', dsNhomChiTietLoai: [] }],
        }),
      ),
    );
    const result = await fetchTaxonomyMenu(client());
    expect(result).toEqual([
      { id: 900002, tenLoaiCongViec: 'Graphics & Design', dsNhomChiTietLoai: [] },
    ]);
  });

  it('throws a decode error on a malformed payload', async () => {
    mockServer.use(
      http.get(`${origin}${PATH}`, () => HttpResponse.json({ statusCode: 200, content: null })),
    );
    await expect(fetchTaxonomyMenu(client())).rejects.toThrow(TaxonomyDecodeError);
  });
});
