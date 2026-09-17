import { describe, expect, it } from 'vitest';
import {
  decodeTaxonomyMenuResponse,
  TaxonomyDecodeError,
} from '../../src/features/taxonomy/api/taxonomy-menu.dto';

const validGroup = {
  id: 900002,
  tenNhom: 'Logo & Brand Identity',
  hinhAnh: 'https://fiverrnew.cybersoft.edu.vn/images/g1.jpg',
  maLoaiCongviec: 900002,
  dsChiTietLoai: [{ id: 900003, tenChiTiet: 'Logo Design' }],
};

const emptyGroup = {
  id: 900010,
  tenNhom: 'Empty Group',
  hinhAnh: '',
  maLoaiCongviec: 900002,
  dsChiTietLoai: [],
};

const validTop = {
  id: 900002,
  tenLoaiCongViec: 'Graphics & Design',
  dsNhomChiTietLoai: [validGroup, emptyGroup],
};

describe('decodeTaxonomyMenuResponse', () => {
  it('decodes a valid envelope, preserving empty groups as-is', () => {
    const result = decodeTaxonomyMenuResponse({ content: [validTop], statusCode: 200 });
    expect(result).toHaveLength(1);
    expect(result[0]?.dsNhomChiTietLoai).toHaveLength(2);
    expect(result[0]?.dsNhomChiTietLoai[1]?.dsChiTietLoai).toEqual([]);
  });

  it('decodes a legitimately empty menu as [], not an error', () => {
    expect(decodeTaxonomyMenuResponse({ content: [] })).toEqual([]);
  });

  it('tolerates unknown extra envelope fields (E24 error shapes are not uniform)', () => {
    expect(() =>
      decodeTaxonomyMenuResponse({ content: [validTop], message: null, dateTime: '2026-09-16' }),
    ).not.toThrow();
  });

  it.each([undefined, null, {}, { content: null }, { content: 'not-an-array' }, { content: {} }])(
    'rejects a missing/non-array content as a decode failure, distinct from an empty menu (%j)',
    (input) => {
      expect(() => decodeTaxonomyMenuResponse(input)).toThrow(TaxonomyDecodeError);
    },
  );

  it('rejects a malformed top category item', () => {
    expect(() =>
      decodeTaxonomyMenuResponse({ content: [{ id: 1, tenLoaiCongViec: 'X' }] }),
    ).toThrow(TaxonomyDecodeError);
  });

  it('rejects a malformed group item', () => {
    const malformedTop = { ...validTop, dsNhomChiTietLoai: [{ id: 1, tenNhom: 'X' }] };
    expect(() => decodeTaxonomyMenuResponse({ content: [malformedTop] })).toThrow(
      TaxonomyDecodeError,
    );
  });

  it('rejects a malformed detail item', () => {
    const malformedGroup = { ...validGroup, dsChiTietLoai: [{ id: 1 }] };
    const malformedTop = { ...validTop, dsNhomChiTietLoai: [malformedGroup] };
    expect(() => decodeTaxonomyMenuResponse({ content: [malformedTop] })).toThrow(
      TaxonomyDecodeError,
    );
  });
});
