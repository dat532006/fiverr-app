import { describe, expect, it } from 'vitest';
import {
  decodeSearchJobsResponse,
  SearchJobsDecodeError,
} from '../../src/features/search/api/search-jobs.dto';

const validJob = {
  id: 900123,
  tenCongViec: 'Thiết kế logo',
  danhGia: 12,
  giaTien: 0,
  nguoiTao: 42,
  hinhAnh: 'https://fiverrnew.cybersoft.edu.vn/images/j1.jpg',
  moTa: 'Mô tả đầy đủ',
  maChiTietLoaiCongViec: 900003,
  moTaNgan: '',
  saoCongViec: 0,
};

// Confirmed live E28 content[] shape: a ViewModel wrapper around `congViec`,
// plus seller/category display metadata the application does not use.
const validWrapperItem = {
  avatar: '',
  congViec: validJob,
  id: 900123,
  tenChiTietLoai: 'Logo Design',
  tenLoaiCongViec: 'Graphics & Design',
  tenNguoiTao: 'seller',
  tenNhomChiTietLoai: 'Logo & Brand Identity',
};

describe('decodeSearchJobsResponse', () => {
  it('decodes a valid envelope, extracting congViec and preserving zero fields (T05)', () => {
    const result = decodeSearchJobsResponse({ content: [validWrapperItem], statusCode: 200 });
    expect(result).toEqual([{ congViec: validJob }]);
    expect(result[0]?.congViec.giaTien).toBe(0);
    expect(result[0]?.congViec.saoCongViec).toBe(0);
  });

  it('decodes a legitimately empty result set as [], not an error', () => {
    expect(decodeSearchJobsResponse({ content: [] })).toEqual([]);
  });

  it('tolerates unknown extra envelope fields', () => {
    expect(() =>
      decodeSearchJobsResponse({
        content: [validWrapperItem],
        message: null,
        dateTime: '2026-09-17',
      }),
    ).not.toThrow();
  });

  it('tolerates wrapper display metadata (avatar/tenNguoiTao/...) being absent — only congViec is required', () => {
    expect(() => decodeSearchJobsResponse({ content: [{ congViec: validJob }] })).not.toThrow();
  });

  it.each([undefined, null, {}, { content: null }, { content: 'not-an-array' }, { content: {} }])(
    'rejects a missing/non-array content as a decode failure, distinct from an empty result (%j)',
    (input) => {
      expect(() => decodeSearchJobsResponse(input)).toThrow(SearchJobsDecodeError);
    },
  );

  it('rejects the old flat CongViec shape without a congViec wrapper (old assumption)', () => {
    // `validJob` has no `congViec` key — this is exactly what the previous
    // (incorrect) decoder accepted as a search item; it must now be rejected.
    expect(() => decodeSearchJobsResponse({ content: [validJob] })).toThrow(SearchJobsDecodeError);
  });

  it.each([undefined, null, 'not-an-object', 42, []])(
    'rejects a missing/null/non-object congViec wrapper field (%j)',
    (congViec) => {
      expect(() =>
        decodeSearchJobsResponse({ content: [{ ...validWrapperItem, congViec }] }),
      ).toThrow(SearchJobsDecodeError);
    },
  );

  it('rejects an item that is missing the congViec key entirely', () => {
    const wrapperWithoutJob = Object.fromEntries(
      Object.entries(validWrapperItem).filter(([key]) => key !== 'congViec'),
    );
    expect(() => decodeSearchJobsResponse({ content: [wrapperWithoutJob] })).toThrow(
      SearchJobsDecodeError,
    );
  });

  it('rejects a malformed nested congViec instead of silently dropping it (T05: no fabricated success)', () => {
    expect(() =>
      decodeSearchJobsResponse({
        content: [{ ...validWrapperItem, congViec: { id: 1, tenCongViec: 'X' } }],
      }),
    ).toThrow(SearchJobsDecodeError);
  });

  it.each(Object.keys(validJob))(
    'rejects a nested congViec item missing field %s',
    (missingField) => {
      const malformedCongViec = Object.fromEntries(
        Object.entries(validJob).filter(([key]) => key !== missingField),
      );
      expect(() =>
        decodeSearchJobsResponse({ content: [{ congViec: malformedCongViec }] }),
      ).toThrow(SearchJobsDecodeError);
    },
  );

  it('rejects a nested congViec item with a wrong-typed numeric field (string instead of number)', () => {
    const malformedCongViec = { ...validJob, giaTien: '0' };
    expect(() => decodeSearchJobsResponse({ content: [{ congViec: malformedCongViec }] })).toThrow(
      SearchJobsDecodeError,
    );
  });

  it('preserves the source order of multiple wrapper items', () => {
    const items = [
      { congViec: { ...validJob, id: 3, tenCongViec: 'C' } },
      { congViec: { ...validJob, id: 1, tenCongViec: 'A' } },
      { congViec: { ...validJob, id: 2, tenCongViec: 'B' } },
    ];
    const result = decodeSearchJobsResponse({ content: items });
    expect(result.map((entry) => entry.congViec.tenCongViec)).toEqual(['C', 'A', 'B']);
  });
});
