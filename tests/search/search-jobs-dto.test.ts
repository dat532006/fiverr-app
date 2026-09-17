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

describe('decodeSearchJobsResponse', () => {
  it('decodes a valid envelope, preserving field values including zero (T05: zero stays zero)', () => {
    const result = decodeSearchJobsResponse({ content: [validJob], statusCode: 200 });
    expect(result).toEqual([validJob]);
    expect(result[0]?.giaTien).toBe(0);
    expect(result[0]?.saoCongViec).toBe(0);
  });

  it('decodes a legitimately empty result set as [], not an error', () => {
    expect(decodeSearchJobsResponse({ content: [] })).toEqual([]);
  });

  it('tolerates unknown extra envelope fields', () => {
    expect(() =>
      decodeSearchJobsResponse({ content: [validJob], message: null, dateTime: '2026-09-17' }),
    ).not.toThrow();
  });

  it.each([undefined, null, {}, { content: null }, { content: 'not-an-array' }, { content: {} }])(
    'rejects a missing/non-array content as a decode failure, distinct from an empty result (%j)',
    (input) => {
      expect(() => decodeSearchJobsResponse(input)).toThrow(SearchJobsDecodeError);
    },
  );

  it('rejects a malformed job item instead of silently dropping it (T05: no fabricated success)', () => {
    expect(() => decodeSearchJobsResponse({ content: [{ id: 1, tenCongViec: 'X' }] })).toThrow(
      SearchJobsDecodeError,
    );
  });

  it.each(Object.keys(validJob))('rejects a job item missing field %s', (missingField) => {
    const malformed = Object.fromEntries(
      Object.entries(validJob).filter(([key]) => key !== missingField),
    );
    expect(() => decodeSearchJobsResponse({ content: [malformed] })).toThrow(SearchJobsDecodeError);
  });

  it('rejects a job item with a wrong-typed numeric field (string instead of number)', () => {
    const malformed = { ...validJob, giaTien: '0' };
    expect(() => decodeSearchJobsResponse({ content: [malformed] })).toThrow(SearchJobsDecodeError);
  });
});
