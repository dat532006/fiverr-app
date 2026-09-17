import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { createHttpClient } from '../../src/infrastructure/http/create-http-client';
import { fetchSearchJobs } from '../../src/features/search/api/search-jobs.endpoint';
import { SearchJobsDecodeError } from '../../src/features/search/api/search-jobs.dto';
import { mockServer } from '../support/server';

const origin = 'https://search-endpoint.invalid';
const synthetic = {
  VITE_APP_ENV: 'development',
  VITE_API_BASE_URL: origin,
  VITE_CYBERSOFT_TOKEN: 'synthetic-token',
};
const PATH_PREFIX = '/api/cong-viec/lay-danh-sach-cong-viec-theo-ten/';

function client() {
  return createHttpClient(synthetic, [origin]);
}

const sampleJob = {
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
};

describe('fetchSearchJobs', () => {
  it('resolves the decoded wrapper list, extracting congViec, on success', async () => {
    mockServer.use(
      http.get(`${origin}${PATH_PREFIX}logo`, () =>
        HttpResponse.json({ statusCode: 200, content: [{ congViec: sampleJob }] }),
      ),
    );
    const result = await fetchSearchJobs('logo', { client: client() });
    expect(result).toEqual([{ congViec: sampleJob }]);
  });

  it('throws a decode error on a malformed payload', async () => {
    mockServer.use(
      http.get(`${origin}${PATH_PREFIX}logo`, () =>
        HttpResponse.json({ statusCode: 200, content: null }),
      ),
    );
    await expect(fetchSearchJobs('logo', { client: client() })).rejects.toThrow(
      SearchJobsDecodeError,
    );
  });

  it('encodes Unicode search text exactly once (T18)', async () => {
    let capturedParam = '';
    mockServer.use(
      http.get(`${origin}${PATH_PREFIX}:term`, ({ params }) => {
        capturedParam = params.term as string;
        return HttpResponse.json({ statusCode: 200, content: [] });
      }),
    );
    await fetchSearchJobs('thiết kế', { client: client() });
    // MSW decodes the matched path param exactly once; if the endpoint had
    // double-encoded, this would still contain literal `%` escapes.
    expect(capturedParam).toBe('thiết kế');
  });

  it.each(['?', '#', '/', 'a/b?c#d'])(
    'encodes the special character sequence %j exactly once, not corrupting the path',
    async (term) => {
      let capturedParam = '';
      mockServer.use(
        http.get(`${origin}${PATH_PREFIX}:term`, ({ params }) => {
          capturedParam = params.term as string;
          return HttpResponse.json({ statusCode: 200, content: [] });
        }),
      );
      await fetchSearchJobs(term, { client: client() });
      expect(capturedParam).toBe(term);
    },
  );

  it('forwards the AbortSignal to the transport so an in-flight request can be cancelled', async () => {
    const controller = new AbortController();
    mockServer.use(
      http.get(`${origin}${PATH_PREFIX}slow`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({ statusCode: 200, content: [] });
      }),
    );
    const pending = fetchSearchJobs('slow', { client: client(), signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toThrow();
  });
});
