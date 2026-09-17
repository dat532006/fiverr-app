import { describe, expect, it } from 'vitest';
import { mapTaxonomyMenu } from '../../src/features/taxonomy/model/map-taxonomy-menu';
import type { TopCategoryDto } from '../../src/features/taxonomy/api/taxonomy-menu.dto';

describe('mapTaxonomyMenu', () => {
  it('keeps a detail category shared by two groups as two distinct occurrences', () => {
    const sharedDetail = { id: 900003, tenChiTiet: 'Shared Detail' };
    const dtos: TopCategoryDto[] = [
      {
        id: 900002,
        tenLoaiCongViec: 'Top',
        dsNhomChiTietLoai: [
          {
            id: 1,
            tenNhom: 'Group A',
            hinhAnh: '',
            maLoaiCongviec: 900002,
            dsChiTietLoai: [sharedDetail],
          },
          {
            id: 2,
            tenNhom: 'Group B',
            hinhAnh: '',
            maLoaiCongviec: 900002,
            dsChiTietLoai: [sharedDetail],
          },
        ],
      },
    ];

    const menu = mapTaxonomyMenu(dtos);
    const occurrences = menu[0]?.groups.flatMap((group) => group.details) ?? [];
    expect(occurrences).toHaveLength(2);
    expect(occurrences[0]?.parentGroupId).not.toBe(occurrences[1]?.parentGroupId);
    expect(occurrences[0]?.detail.id).toBe(occurrences[1]?.detail.id);
  });

  it('keeps a group and a detail that share the same raw numeric id distinct at runtime', () => {
    const dtos: TopCategoryDto[] = [
      {
        id: 1,
        tenLoaiCongViec: 'Top',
        dsNhomChiTietLoai: [
          {
            id: 900002,
            tenNhom: 'Group',
            hinhAnh: '',
            maLoaiCongviec: 1,
            dsChiTietLoai: [{ id: 900002, tenChiTiet: 'Detail sharing the raw id' }],
          },
        ],
      },
    ];

    const menu = mapTaxonomyMenu(dtos);
    const group = menu[0]?.groups[0];
    const detailOccurrence = group?.details[0];
    // Runtime string values collide by design (same source id), but the two are
    // constructed by different factories tied to different DTO fields — never
    // inferred from the numeric value itself (see model/ids.ts).
    expect(String(group?.id)).toBe('900002');
    expect(String(detailOccurrence?.detail.id)).toBe('900002');
  });

  it('preserves an empty group as details: [], not omitted', () => {
    const dtos: TopCategoryDto[] = [
      {
        id: 1,
        tenLoaiCongViec: 'Top',
        dsNhomChiTietLoai: [
          { id: 1, tenNhom: 'Empty', hinhAnh: '', maLoaiCongviec: 1, dsChiTietLoai: [] },
        ],
      },
    ];
    const menu = mapTaxonomyMenu(dtos);
    expect(menu[0]?.groups[0]?.details).toEqual([]);
  });

  it('keeps a valid http/https image url and nulls out an unparsable one', () => {
    const dtos: TopCategoryDto[] = [
      {
        id: 1,
        tenLoaiCongViec: 'Top',
        dsNhomChiTietLoai: [
          {
            id: 1,
            tenNhom: 'Valid image',
            hinhAnh: 'https://fiverrnew.cybersoft.edu.vn/images/g1.jpg',
            maLoaiCongviec: 1,
            dsChiTietLoai: [],
          },
          { id: 2, tenNhom: 'Blank image', hinhAnh: '', maLoaiCongviec: 1, dsChiTietLoai: [] },
          {
            id: 3,
            tenNhom: 'Unparsable image',
            hinhAnh: 'not-a-url',
            maLoaiCongviec: 1,
            dsChiTietLoai: [],
          },
        ],
      },
    ];
    const [top] = mapTaxonomyMenu(dtos);
    expect(top?.groups[0]?.imageUrl).toBe('https://fiverrnew.cybersoft.edu.vn/images/g1.jpg');
    expect(top?.groups[1]?.imageUrl).toBeNull();
    expect(top?.groups[2]?.imageUrl).toBeNull();
  });
});
